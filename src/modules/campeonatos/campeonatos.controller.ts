import { Controller, Get, Post, Body } from '@nestjs/common';
import { CampeonatosService } from './campeonatos.service';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CAMPEONATOS } from './campeonatos.constants';
import { CampeonatoPresenter } from '../../common/presenters';

@ApiTags(CAMPEONATOS.TAG)
@Controller('campeonatos')
export class CampeonatosController {
  constructor(private readonly campeonatosService: CampeonatosService) {}

  @ApiOperation({ summary: 'Cria um novo campeonato' })
  @ApiBody({ type: CreateCampeonatoDto })
  @ApiResponse({ status: 201, description: 'Campeonato criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post()
  async criarCampeonato(@Body() createCampeonatoDto: CreateCampeonatoDto) {
    return CampeonatoPresenter.toHttp(
      await this.campeonatosService.criar(createCampeonatoDto),
    );
  }

  @ApiOperation({ summary: 'Lista todos os campeonatos' })
  @ApiResponse({ status: 200, description: 'Lista de campeonatos' })
  @Get()
  async buscarCampeonatos() {
    const campeonatos = await this.campeonatosService.buscarTodos();
    return campeonatos.map((c) => CampeonatoPresenter.toHttp(c));
  }
}
