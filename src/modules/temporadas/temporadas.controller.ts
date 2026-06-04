import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TEMPORADAS } from './temporadas.constants';
import {
  TemporadaPresenter,
  JogoPresenter,
  FasePresenter,
} from '../../common/presenters';

@ApiTags(TEMPORADAS.TAG)
@Controller('temporadas')
export class TemporadasController {
  constructor(private readonly temporadasService: TemporadasService) {}

  @ApiOperation({ summary: 'Cria uma nova temporada' })
  @ApiBody({ type: CreateTemporadaDto })
  @ApiResponse({ status: 201, description: 'Temporada criada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (ano ou campeonatoId)',
  })
  @ApiNotFoundResponse({ description: 'Campeonato não encontrado' })
  @Post()
  async criarTemporada(@Body() createTemporadaDto: CreateTemporadaDto) {
    return TemporadaPresenter.toHttp(
      await this.temporadasService.criar(createTemporadaDto),
    );
  }

  @ApiOperation({ summary: 'Lista todas as temporadas' })
  @ApiResponse({ status: 200, description: 'Lista de temporadas' })
  @Get()
  async buscarTemporadas() {
    const temporadas = await this.temporadasService.buscarTodos();
    return temporadas.map((t) => TemporadaPresenter.toHttp(t));
  }

  @ApiOperation({
    summary: 'Busca dados da temporada (próximo jogo + total adiados)',
  })
  @ApiResponse({ status: 200, description: 'Dados da temporada' })
  @Get(':temporadaId/dados')
  async buscarDadosTemporada(@Param('temporadaId') temporadaId: string) {
    const { proximoJogo, totalAdiados } =
      await this.temporadasService.buscarDadosTemporada(temporadaId);

    return {
      proximoJogo: proximoJogo
        ? {
            fase: FasePresenter.toHttp(proximoJogo.fase),
            jogo: JogoPresenter.toHttp(proximoJogo),
          }
        : null,
      totalAdiados,
    };
  }

  @ApiOperation({ summary: 'Lista todos os jogos de uma temporada (agrupados por fase)' })
  @ApiResponse({ status: 200, description: 'Lista de jogos da temporada' })
  @Get(':temporadaId/jogos')
  async buscarJogosTemporada(@Param('temporadaId') temporadaId: string) {
    const jogos = await this.temporadasService.buscarJogosTemporada(temporadaId);
    return jogos.map((j) => JogoPresenter.toHttp(j));
  }
}
