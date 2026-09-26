import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { EmpleadosService } from './empleados.service.js';
import { CreateEmpleadoDto } from './dto/create-empleado.dto.js';
import { CreateEmpleadosDto } from './dto/create-empleados.dto.js';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto.js';
import { UpdateAdministrativoDto } from './dto/update-administrativo.dto.js';

@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Post()
  create(@Body() createEmpleadoDto: CreateEmpleadoDto) {
    return this.empleadosService.create(createEmpleadoDto);
  }

  @Post('batch')
  createBatch(@Body() createEmpleadosDto: CreateEmpleadosDto) {
    return this.empleadosService.createBatch(createEmpleadosDto.empleados);
  }

  @Get()
  findAll(@Query('esAdministrativo') esAdministrativo?: string) {
    return this.empleadosService.findAll(
      esAdministrativo !== undefined ? esAdministrativo === 'true' : undefined,
    );
  }

  @Get('numero/:numero')
  findByNumero(@Param('numero') numero: string) {
    return this.empleadosService.findByNumero(numero);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empleadosService.findOne(+id);
  }

  @Patch('administrativo')
  updateAdministrativo(@Body() dto: UpdateAdministrativoDto) {
    return this.empleadosService.setAdministrativo(
      dto.ids,
      dto.esAdministrativo,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmpleadoDto: UpdateEmpleadoDto) {
    return this.empleadosService.update(+id, updateEmpleadoDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.empleadosService.remove(+id);
  }
}
