import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateEmpleadoDto } from './create-empleado.dto.js';

export class CreateEmpleadosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEmpleadoDto)
  empleados: CreateEmpleadoDto[];
}