import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CampeonatosService } from './campeonatos.service';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CAMPEONATOS } from './campeonatos.constants';

@ApiTags(CAMPEONATOS.TAG)
@UseGuards(JwtAuthGuard)
@Controller('campeonatos')
export class CampeonatosController {
  constructor(private readonly campeonatosService: CampeonatosService) {}

  @ApiOperation({ summary: 'Cria um novo campeonato' })
  @ApiBody({ type: CreateCampeonatoDto })
  @ApiResponse({ status: 201, description: 'Campeonato criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post()
  criarCampeonato(@Body() createCampeonatoDto: CreateCampeonatoDto) {
    return this.campeonatosService.criar(createCampeonatoDto);
  }

  @ApiOperation({ summary: 'Lista todos os campeonatos' })
  @ApiResponse({ status: 200, description: 'Lista de campeonatos' })
  @Get()
  buscarCampeonatos() {
    return this.campeonatosService.buscarTodos();
  }
}
