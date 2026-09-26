import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRegistroDto {
  @IsOptional()
  @IsNumber()
  empleadoId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeroEmpleado: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  departamento: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['A', 'B', 'C'])
  turno: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rutaUsual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paradaUsual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  puesto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  centroDeCosto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sucursal?: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['7-4', '7-7'])
  horario: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['A', 'B', 'C'])
  turnoExtra: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rutaExtra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paradaExtra?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}