import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Registro } from './entities/registro.entity.js';
import { CreateRegistroDto } from './dto/create-registro.dto.js';
import { UpdateRegistroDto } from './dto/update-registro.dto.js';

export interface ResultadoBatch {
  exito: boolean;
  numeroEmpleado: string;
  registroId?: number;
  error?: string;
}

@Injectable()
export class RegistrosService {
  constructor(
    @InjectRepository(Registro)
    private readonly registrosRepository: Repository<Registro>,
    @InjectRepository(Empleado)
    private readonly empleadosRepository: Repository<Empleado>,
    @InjectRepository(Ruta)
    private readonly rutasRepository: Repository<Ruta>,
  ) {}

  async create(createRegistroDto: CreateRegistroDto) {
    let empleado: Empleado;

    if (createRegistroDto.empleadoId) {
      const encontrado = await this.empleadosRepository.findOne({
        where: { id: createRegistroDto.empleadoId },
      });
      if (!encontrado) {
        throw new NotFoundException(
          `Empleado #${createRegistroDto.empleadoId} no encontrado`,
        );
      }
      empleado = encontrado;
    } else {
      empleado = await this.findOrCreateEmpleado(createRegistroDto);
    }

    if (empleado.bloqueadoTiempoExtra) {
      throw new ConflictException(
        `El empleado ${empleado.numeroEmpleado} no puede realizar tiempo extra`,
      );
    }

    const registro = this.registrosRepository.create({
      empleado,
      empleadoId: empleado.id,
      fecha: createRegistroDto.fecha,
      horario: createRegistroDto.horario ?? '7-4',
      turnoExtra: createRegistroDto.turnoExtra,
      rutaExtra: createRegistroDto.rutaExtra ?? null,
      paradaExtra: createRegistroDto.paradaExtra ?? null,
      observaciones: createRegistroDto.observaciones ?? null,
    });

    return this.registrosRepository.save(registro);
  }

  async createBatch(dtos: CreateRegistroDto[]): Promise<ResultadoBatch[]> {
    const resultados: ResultadoBatch[] = [];
    for (const dto of dtos) {
      try {
        const registro = await this.create(dto);
        resultados.push({
          exito: true,
          numeroEmpleado: dto.numeroEmpleado,
          registroId: registro.id,
        });
      } catch (error) {
        resultados.push({
          exito: false,
          numeroEmpleado: dto.numeroEmpleado,
          error:
            error instanceof Error
              ? error.message
              : 'Error al guardar el registro',
        });
      }
    }
    return resultados;
  }

  findAll(termino?: string) {
    const query = this.registrosRepository
      .createQueryBuilder('registro')
      .leftJoinAndSelect('registro.empleado', 'empleado')
      .orderBy('registro.fecha', 'DESC');

    if (termino) {
      query.andWhere(
        '(empleado.nombre LIKE :termino OR empleado.departamento LIKE :termino OR empleado.numeroEmpleado LIKE :termino OR empleado.rutaUsual LIKE :termino OR empleado.paradaUsual LIKE :termino OR registro.turnoExtra LIKE :termino OR registro.rutaExtra LIKE :termino OR registro.paradaExtra LIKE :termino)',
        { termino: `%${termino}%` },
      );
    }

    return query.getMany();
  }

  async findOne(id: number) {
    const registro = await this.registrosRepository.findOne({
      where: { id },
      relations: { empleado: true },
    });
    if (!registro) {
      throw new NotFoundException(`Registro #${id} no encontrado`);
    }
    return registro;
  }

  async update(id: number, updateRegistroDto: UpdateRegistroDto) {
    const registro = await this.findOne(id);
    Object.assign(registro, updateRegistroDto);
    return this.registrosRepository.save(registro);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.registrosRepository.delete(id);
    return { message: `Registro #${id} eliminado` };
  }

  async generarMantenimiento(
    fecha?: string,
    empleadoIds?: number[],
  ): Promise<{
    creados: number;
    existentes: number;
    eliminados: number;
    fecha: string;
  }> {
    const fechaRegistro = fecha ?? this.viernesDeSemana(new Date());

    const administrativos = await this.empleadosRepository.find({
      where: { esAdministrativo: true },
    });

    const permitidos =
      empleadoIds === undefined
        ? administrativos
        : administrativos.filter(
            (emp) => emp.id !== undefined && empleadoIds.includes(emp.id),
          );

    let creados = 0;
    let existentes = 0;
    let eliminados = 0;
    for (const emp of permitidos) {
      const yaExiste = await this.registrosRepository.findOne({
        where: { empleadoId: emp.id, fecha: fechaRegistro },
      });
      if (yaExiste) {
        existentes++;
        continue;
      }
      await this.registrosRepository.insert({
        empleadoId: emp.id,
        fecha: fechaRegistro,
        horario: '7-4',
        turnoExtra: emp.turno ?? 'A',
        rutaExtra: emp.rutaUsual ?? null,
        paradaExtra: emp.paradaUsual ?? null,
        observaciones: null,
      });
      creados++;
    }

    return { creados, existentes, eliminados, fecha: fechaRegistro };
  }

  private viernesDeSemana(base: Date): string {
    const dia = base.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(base);
    lunes.setDate(base.getDate() - diff);
    lunes.setHours(12, 0, 0, 0);
    const viernes = new Date(lunes);
    viernes.setDate(lunes.getDate() + 4);
    return viernes.toISOString().slice(0, 10);
  }

  private async findOrCreateEmpleado(
    dto: CreateRegistroDto,
  ): Promise<Empleado> {
    const rutaId = await this.resolverRutaId(dto.rutaUsual);
    const existente = await this.empleadosRepository.findOne({
      where: { numeroEmpleado: dto.numeroEmpleado },
    });

    if (existente) {
      existente.nombre = dto.nombre;
      existente.departamento = dto.departamento;
      existente.turno = dto.turno;
      existente.rutaUsual = dto.rutaUsual ?? null;
      existente.paradaUsual = dto.paradaUsual ?? null;
      existente.rutaId = rutaId;
      existente.puesto = dto.puesto ?? null;
      existente.centroDeCosto = dto.centroDeCosto ?? null;
      existente.sucursal = dto.sucursal ?? null;
      return this.empleadosRepository.save(existente);
    }

    const nuevo = this.empleadosRepository.create({
      nombre: dto.nombre,
      numeroEmpleado: dto.numeroEmpleado,
      departamento: dto.departamento,
      turno: dto.turno,
      rutaUsual: dto.rutaUsual ?? null,
      paradaUsual: dto.paradaUsual ?? null,
      rutaId,
      puesto: dto.puesto ?? null,
      centroDeCosto: dto.centroDeCosto ?? null,
      sucursal: dto.sucursal ?? null,
    });

    return this.empleadosRepository.save(nuevo);
  }

  private async resolverRutaId(rutaUsual?: string | null): Promise<number | null> {
    const nombre = rutaUsual?.trim();
    if (!nombre) return null;
    const ruta = await this.rutasRepository.findOne({ where: { nombre } });
    return ruta?.id ?? null;
  }
}