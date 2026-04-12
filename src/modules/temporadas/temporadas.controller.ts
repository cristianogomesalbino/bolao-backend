import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TEMPORADAS } from './temporadas.constants';

@ApiTags(TEMPORADAS.TAG)
@UseGuards(JwtAuthGuard)
@Controller('temporadas')
export class TemporadasController {
  constructor(private readonly temporadasService: TemporadasService) {}

  @ApiOperation({ summary: 'Cria uma nova temporada' })
  @ApiBody({ type: CreateTemporadaDto })
  @ApiResponse({ status: 201, description: 'Temporada criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (ano ou campeonatoId)' })
  @Post()
  criarTemporada(@Body() createTemporadaDto: CreateTemporadaDto) {
    return this.temporadasService.criar(createTemporadaDto);
  }

  @ApiOperation({ summary: 'Lista todas as temporadas' })
  @ApiResponse({ status: 200, description: 'Lista de temporadas' })
  @Get()
  buscarTemporadas() {
    return this.temporadasService.buscarTodos();
  }
}
