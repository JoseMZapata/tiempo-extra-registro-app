import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmpleadoDto {
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

  @IsOptional()
  @IsDateString()
  fechaBaja?: string | null;

  @IsOptional()
  @IsBoolean()
  bloqueadoTiempoExtra?: boolean;

  @IsOptional()
  @IsBoolean()
  esAdministrativo?: boolean;
}