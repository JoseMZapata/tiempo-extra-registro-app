import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ruta } from './entities/ruta.entity.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { RutasService } from './rutas.service.js';
import { RutasController } from './rutas.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ruta, Empleado])],
  controllers: [RutasController],
  providers: [RutasService],
})
export class RutasModule {}