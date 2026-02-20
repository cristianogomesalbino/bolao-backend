import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { UpdateTemporadaDto } from './dto/update-temporada.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Temporadas')
@Controller('temporadas')
export class TemporadasController {
  constructor(private readonly temporadasService: TemporadasService) {}

  @ApiOperation({ summary: 'Cria uma nova temporada' })
  @ApiBody({ type: CreateTemporadaDto })
  @ApiResponse({ status: 201, description: 'Temporada criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (ano ou campeonatoId)' })
  @Post()
  create(@Body() createTemporadaDto: CreateTemporadaDto) {
    return this.temporadasService.create(createTemporadaDto);
  }

  @ApiOperation({ summary: 'Lista todas as temporadas' })
  @ApiResponse({ status: 200, description: 'Lista de temporadas' })
  @Get()
  findAll() {
    return this.temporadasService.findAll();
  }
}
