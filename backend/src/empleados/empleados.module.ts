import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from './entities/empleado.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { EmpleadosService } from './empleados.service.js';
import { EmpleadosController } from './empleados.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Empleado, Ruta])],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}