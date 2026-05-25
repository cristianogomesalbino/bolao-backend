import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JogoService } from '../services/jogo.service';
import { FutebolApiService } from '../services/futebol-api.service';
import { CriarJogoDto } from '../dto/criar-jogo.dto';
import { AtualizarJogoDto } from '../dto/atualizar-jogo.dto';
import { FinalizarJogoDto } from '../dto/finalizar-jogo.dto';
import { ImportarJogosDto } from '../dto/importar-jogos.dto';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JOGOS } from '../jogos.constants';
import { JogoPresenter } from '../../../common/presenters';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';

@ApiTags(JOGOS.TAG)
@Controller()
export class JogoController {
  constructor(
    private readonly jogoService: JogoService,
    private readonly futebolApiService: FutebolApiService,
  ) {}

  @ApiOperation({ summary: 'Criar um novo jogo na fase' })
  @ApiResponse({ status: 201, description: 'Jogo criado com sucesso' })
  @Post('fases/:faseId/jogos')
  async criar(
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
    @Body() dto: CriarJogoDto,
    @CurrentUser() user: { id: string },
  ) {
    return JogoPresenter.toHttp(
      await this.jogoService.criar({ ...dto, faseId }, user.id),
    );
  }

  @ApiOperation({ summary: 'Atualizar dados de um jogo' })
  @ApiResponse({ status: 200, description: 'Jogo atualizado com sucesso' })
  @Patch('jogos/:id')
  async atualizar(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @Body() dto: AtualizarJogoDto,
  ) {
    return JogoPresenter.toHttp(await this.jogoService.atualizar(id, dto));
  }

  @ApiOperation({ summary: 'Finalizar um jogo com placar' })
  @ApiResponse({ status: 200, description: 'Jogo finalizado com sucesso' })
  @Patch('jogos/:id/finalizar')
  async finalizar(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @Body() dto: FinalizarJogoDto,
  ) {
    return JogoPresenter.toHttp(await this.jogoService.finalizar(id, dto));
  }

  @ApiOperation({ summary: 'Listar jogos de uma fase' })
  @ApiResponse({ status: 200, description: 'Lista de jogos' })
  @ApiQuery({ name: 'rodada', required: false, type: Number, description: 'Filtrar por rodada (default: rodada atual)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por status (AGENDADO, ADIADO, EM_ANDAMENTO, FINALIZADO, CANCELADO)' })
  @Get('fases/:faseId/jogos')
  async listar(
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
    @Query('rodada') rodada?: string,
    @Query('status') status?: string,
  ) {
    const rodadaNum = rodada ? Number.parseInt(rodada, 10) : undefined;
    const { fase, jogos, rodadaAtual } = await this.jogoService.buscarPorFaseComDetalhes(faseId, rodadaNum, status);
    return {
      fase: { id: fase.id, nome: fase.nome, tipo: fase.tipo, ordem: fase.ordem },
      rodadaAtual,
      jogos: jogos.map((j) => JogoPresenter.toHttp(j, fase.tipo)),
    };
  }

  @ApiOperation({ summary: 'Buscar jogo por ID' })
  @ApiResponse({ status: 200, description: 'Jogo encontrado' })
  @Get('jogos/:id')
  async buscarPorId(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    const jogo = await this.jogoService.buscarPorId(id);
    return JogoPresenter.toHttp(jogo, jogo.fase?.tipo);
  }

  @ApiOperation({ summary: 'Buscar classificação do Brasileirão via API externa' })
  @ApiResponse({ status: 200, description: 'Classificação retornada com sucesso' })
  @ApiQuery({ name: 'season', required: false, type: Number, description: 'Ano da temporada (default: ano atual)' })
  @Get('classificacao')
  async classificacao(@Query('season') season?: string) {
    const ano = season ? Number.parseInt(season, 10) : new Date().getFullYear();
    return this.futebolApiService.buscarClassificacao(ano);
  }

  @ApiOperation({ summary: 'Importar jogos da API externa (SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Jogos importados com sucesso' })
  @UseGuards(SuperAdminGuard)
  @Post('jogos/importar')
  async importar(
    @Body() dto: ImportarJogosDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.jogoService.importarJogos(
      dto.season,
      dto.rodada,
      dto.faseId,
      user.id,
    );
  }

  @ApiOperation({ summary: 'Sincronizar placares via API externa (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Placares sincronizados com sucesso' })
  @UseGuards(SuperAdminGuard)
  @Post('fases/:faseId/jogos/sincronizar')
  async sincronizar(
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
  ) {
    return this.jogoService.sincronizarPlacares(faseId);
  }

  @ApiOperation({ summary: 'Resetar fonte de resultado para API_EXTERNA' })
  @ApiResponse({ status: 200, description: 'Fonte resetada com sucesso' })
  @Patch('jogos/:id/resetar-fonte')
  async resetarFonte(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    return JogoPresenter.toHttp(await this.jogoService.resetarFonte(id));
  }
}
