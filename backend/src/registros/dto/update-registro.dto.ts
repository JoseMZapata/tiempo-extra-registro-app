import { PartialType } from '@nestjs/mapped-types';
import { CreateRegistroDto } from './create-registro.dto.js';

export class UpdateRegistroDto extends PartialType(CreateRegistroDto) {}
