import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CampeonatosService } from './campeonatos.service';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';
import { UpdateCampeonatoDto } from './dto/update-campeonato.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Campeonatos')
@Controller('campeonatos')
export class CampeonatosController {
  constructor(private readonly campeonatosService: CampeonatosService) {}

  @ApiOperation({ summary: 'Cria um novo campeonato' })
  @ApiBody({ type: CreateCampeonatoDto })
  @ApiResponse({ status: 201, description: 'Campeonato criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post()
  create(@Body() createCampeonatoDto: CreateCampeonatoDto) {
    return this.campeonatosService.criar(createCampeonatoDto);
  }

  @ApiOperation({ summary: 'Lista todos os campeonatos' })
  @ApiResponse({ status: 200, description: 'Lista de campeonatos' })
  @Get()
  findAll() {
    return this.campeonatosService.buscarTodos();
  }
}
