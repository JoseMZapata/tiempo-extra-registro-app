import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Registro } from './entities/registro.entity.js';
import { RegistrosService } from './registros.service.js';
import { RegistrosController } from './registros.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Registro, Empleado, Ruta])],
  controllers: [RegistrosController],
  providers: [RegistrosService],
})
export class RegistrosModule {}