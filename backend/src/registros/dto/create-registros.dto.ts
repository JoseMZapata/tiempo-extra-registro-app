import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateRegistroDto } from './create-registro.dto.js';

export class CreateRegistrosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRegistroDto)
  registros: CreateRegistroDto[];
}