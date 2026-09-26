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
import { RegistrosService } from './registros.service.js';
import { CreateRegistroDto } from './dto/create-registro.dto.js';
import { CreateRegistrosDto } from './dto/create-registros.dto.js';
import { UpdateRegistroDto } from './dto/update-registro.dto.js';

@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) {}

  @Post()
  create(@Body() createRegistroDto: CreateRegistroDto) {
    return this.registrosService.create(createRegistroDto);
  }

  @Post('batch')
  createBatch(@Body() createRegistrosDto: CreateRegistrosDto) {
    return this.registrosService.createBatch(createRegistrosDto.registros);
  }

  @Post('mantenimiento')
  generarMantenimiento(
    @Body('fecha') fecha?: string,
    @Body('empleadoIds') empleadoIds?: number[],
  ) {
    return this.registrosService.generarMantenimiento(fecha, empleadoIds);
  }

  @Get()
  findAll(@Query('q') q?: string) {
    return this.registrosService.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registrosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegistroDto: UpdateRegistroDto) {
    return this.registrosService.update(+id, updateRegistroDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registrosService.remove(+id);
  }
}