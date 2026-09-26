import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ruta } from './entities/ruta.entity.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { CreateRutaDto } from './dto/create-ruta.dto.js';
import { UpdateRutaDto } from './dto/update-ruta.dto.js';

export interface RutaConConteo {
  id: number;
  nombre: string;
  paradas: string[];
  empleados: number;
}

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta)
    private readonly rutasRepository: Repository<Ruta>,
    @InjectRepository(Empleado)
    private readonly empleadosRepository: Repository<Empleado>,
  ) {}

  async findAll(): Promise<RutaConConteo[]> {
    const rutas = await this.rutasRepository.find({
      order: { nombre: 'ASC' },
    });
    const conteos = await this.empleadosRepository
      .createQueryBuilder('empleado')
      .where('empleado.rutaId IS NOT NULL')
      .groupBy('empleado.rutaId')
      .select('empleado.rutaId', 'rutaId')
      .addSelect('COUNT(*)', 'total')
      .getRawMany<{ rutaId: string | number; total: string | number }>();
    const mapa = new Map<number, number>();
    for (const c of conteos) {
      mapa.set(Number(c.rutaId), Number(c.total));
    }
    return rutas.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      paradas: r.paradas ?? [],
      empleados: mapa.get(r.id) ?? 0,
    }));
  }

  async findOne(id: number): Promise<Ruta> {
    const ruta = await this.rutasRepository.findOne({ where: { id } });
    if (!ruta) {
      throw new NotFoundException(`Ruta #${id} no encontrada`);
    }
    return ruta;
  }

  async create(createRutaDto: CreateRutaDto): Promise<Ruta> {
    const nombre = createRutaDto.nombre.trim();
    const existente = await this.rutasRepository.findOne({ where: { nombre } });
    if (existente) {
      throw new ConflictException(`La ruta "${nombre}" ya existe`);
    }
    const ruta = this.rutasRepository.create({
      nombre,
      paradas: createRutaDto.paradas ?? [],
    });
    const guardada = await this.rutasRepository.save(ruta);
    await this.sincronizarEmpleados(nombre, guardada.id);
    return guardada;
  }

  async update(id: number, updateRutaDto: UpdateRutaDto): Promise<Ruta> {
    const ruta = await this.findOne(id);
    if (updateRutaDto.nombre && updateRutaDto.nombre.trim() !== ruta.nombre) {
      const nombre = updateRutaDto.nombre.trim();
      const duplicada = await this.rutasRepository.findOne({
        where: { nombre },
      });
      if (duplicada) {
        throw new ConflictException(`La ruta "${nombre}" ya existe`);
      }
      ruta.nombre = nombre;
    }
    if (updateRutaDto.paradas) {
      ruta.paradas = updateRutaDto.paradas;
    }
    const guardada = await this.rutasRepository.save(ruta);
    await this.sincronizarEmpleados(guardada.nombre, guardada.id);
    return guardada;
  }

  private async sincronizarEmpleados(
    nombreRuta: string,
    rutaId: number,
  ): Promise<void> {
    await this.empleadosRepository
      .createQueryBuilder()
      .update(Empleado)
      .set({ rutaId })
      .where('LOWER(ruta_usual) = LOWER(:nombre)', { nombre: nombreRuta })
      .andWhere('(ruta_id IS NULL OR ruta_id <> :rutaId)', { rutaId })
      .execute();
  }

  async remove(id: number): Promise<{ message: string }> {
    const ruta = await this.findOne(id);
    const empleados = await this.empleadosRepository.count({
      where: { rutaId: id },
    });
    if (empleados > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${empleados} empleado(s) tienen asignada la ruta "${ruta.nombre}"`,
      );
    }
    await this.rutasRepository.delete(id);
    return { message: `Ruta #${id} eliminada` };
  }
}