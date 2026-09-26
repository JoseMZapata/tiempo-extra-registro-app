import { ArrayNotEmpty, IsArray, IsBoolean, IsInt } from 'class-validator';

export class UpdateAdministrativoDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];

  @IsBoolean()
  esAdministrativo: boolean;
}