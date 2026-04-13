import { Controller, Get, Post, Body } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TEMPORADAS } from './temporadas.constants';
import { TemporadaPresenter } from '../../common/presenters';

@ApiTags(TEMPORADAS.TAG)
@Controller('temporadas')
export class TemporadasController {
  constructor(private readonly temporadasService: TemporadasService) {}

  @ApiOperation({ summary: 'Cria uma nova temporada' })
  @ApiBody({ type: CreateTemporadaDto })
  @ApiResponse({ status: 201, description: 'Temporada criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (ano ou campeonatoId)' })
  @Post()
  async criarTemporada(@Body() createTemporadaDto: CreateTemporadaDto) {
    return TemporadaPresenter.toHttp(await this.temporadasService.criar(createTemporadaDto));
  }

  @ApiOperation({ summary: 'Lista todas as temporadas' })
  @ApiResponse({ status: 200, description: 'Lista de temporadas' })
  @Get()
  async buscarTemporadas() {
    const temporadas = await this.temporadasService.buscarTodos();
    return temporadas.map((t) => TemporadaPresenter.toHttp(t));
  }
}
