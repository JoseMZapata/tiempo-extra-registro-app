import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Empleado } from './entities/empleado.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { CreateEmpleadoDto } from './dto/create-empleado.dto.js';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto.js';

export interface ResultadoEmpleado {
  exito: boolean;
  numeroEmpleado: string;
  empleadoId?: number;
  error?: string;
}

@Injectable()
export class EmpleadosService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadosRepository: Repository<Empleado>,
    @InjectRepository(Ruta)
    private readonly rutasRepository: Repository<Ruta>,
  ) {}

  async create(createEmpleadoDto: CreateEmpleadoDto) {
    const empleado = this.empleadosRepository.create(createEmpleadoDto);
    empleado.rutaId = await this.resolverRutaId(createEmpleadoDto.rutaUsual);
    return this.empleadosRepository.save(empleado);
  }

  async createBatch(dtos: CreateEmpleadoDto[]): Promise<ResultadoEmpleado[]> {
    const resultados: ResultadoEmpleado[] = [];
    for (const dto of dtos) {
      try {
        const empleado = await this.create(dto);
        resultados.push({
          exito: true,
          numeroEmpleado: dto.numeroEmpleado,
          empleadoId: empleado.id,
        });
      } catch (error) {
        resultados.push({
          exito: false,
          numeroEmpleado: dto.numeroEmpleado,
          error: this.mensajeError(error),
        });
      }
    }
    return resultados;
  }

  private mensajeError(error: unknown): string {
    if (!(error instanceof Error)) return 'Error al guardar el empleado';
    if (error.message.includes('Duplicate entry')) {
      return 'Este número de empleado ya existe';
    }
    return error.message;
  }

  findAll(esAdministrativo?: boolean) {
    return this.empleadosRepository.find({
      where: esAdministrativo !== undefined ? { esAdministrativo } : {},
      order: { nombre: 'ASC' },
    });
  }

  async setAdministrativo(
    ids: number[],
    esAdministrativo: boolean,
  ): Promise<{ actualizados: number }> {
    const empleados = await this.empleadosRepository.findBy({ id: In(ids) });
    for (const empleado of empleados) {
      empleado.esAdministrativo = esAdministrativo;
      await this.empleadosRepository.save(empleado);
    }
    return { actualizados: empleados.length };
  }

  async findOne(id: number) {
    const empleado = await this.empleadosRepository.findOne({
      where: { id },
    });
    if (!empleado) {
      throw new NotFoundException(`Empleado #${id} no encontrado`);
    }
    return empleado;
  }

  async findByNumero(numeroEmpleado: string) {
    const empleado = await this.empleadosRepository.findOne({
      where: { numeroEmpleado },
    });
    if (!empleado) {
      throw new NotFoundException(
        `Empleado con numero ${numeroEmpleado} no encontrado`,
      );
    }
    return empleado;
  }

  async update(id: number, updateEmpleadoDto: UpdateEmpleadoDto) {
    const empleado = await this.findOne(id);
    Object.assign(empleado, updateEmpleadoDto);
    if ('rutaUsual' in updateEmpleadoDto) {
      empleado.rutaId = await this.resolverRutaId(empleado.rutaUsual);
    }
    return this.empleadosRepository.save(empleado);
  }

  private async resolverRutaId(rutaUsual?: string | null): Promise<number | null> {
    const nombre = rutaUsual?.trim();
    if (!nombre) return null;
    const ruta = await this.rutasRepository.findOne({ where: { nombre } });
    return ruta?.id ?? null;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.empleadosRepository.delete(id);
    return { message: `Empleado #${id} eliminado` };
  }
}