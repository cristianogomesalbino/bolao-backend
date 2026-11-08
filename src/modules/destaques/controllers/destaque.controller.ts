import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DESTAQUES } from '../destaques.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../../common/guards/group-role.guard';
import { GroupRoles } from '../../../common/decorators/group-roles.decorator';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';
import { DestaqueReactionService } from '../services/destaque-reaction.service';
import { DestaqueSequenciaService } from '../services/destaque-sequencia.service';
import { manterMelhorSequenciaPorPessoa } from '../services/sequencia-listagem';
import {
  consolidarAcertosPanelinha,
  manterUmPorPessoaNaRodada,
  selecionarDestaquesDiversos,
  sincronizarNaoPalpitouNaListagem,
} from '../services/destaque-selecao';
import type { DestaqueRepository } from '../repositories/destaque.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { MarcarVisualizadosDto } from '../dto/marcar-visualizados.dto';

@ApiTags(DESTAQUES.TAG)
@Controller()
export class DestaqueController {
  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    private readonly reactionService: DestaqueReactionService,
    private readonly sequenciaService: DestaqueSequenciaService,
  ) {}

  @Get('grupos/:grupoId/destaques')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({
    summary: 'Listar destaques do grupo na rodada atual',
  })
  @ApiResponse({ status: 200, description: 'Lista de destaques cronológica' })
  async listarDestaques(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() usuario: { id: string },
    @Query('rodada') rodadaQuery?: string,
  ) {
    const rodadaPedida = Number(rodadaQuery);
    const preview = Number.isInteger(rodadaPedida) && rodadaPedida > 0;
    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    const rodadas = preview
      ? [rodadaPedida]
      : this.calcularRodadasVisiveis(rodadaAtual);
    const rodadasDisponiveis =
      await this.destaqueRepo.listarRodadasPorGrupo(grupoId);

    const encontrados = await this.destaqueRepo.buscarPorGrupoERodadas(
      grupoId,
      rodadas,
      DESTAQUES.LIMITES.BUSCA_LISTAGEM,
    );
    const faseId = await this.obterFasePontosCorridos(grupoId);
    const semSequenciaRepetida = faseId
      ? await manterMelhorSequenciaPorPessoa(
          encontrados,
          (usuarioId, rodada) =>
            this.sequenciaService.calcularMelhorSequenciaResultado(
              usuarioId,
              faseId,
              rodada,
            ),
          DESTAQUES.LIMITES.SEQUENCIA_PONTOS_MINIMOS,
        )
      : encontrados;
    const semSubiuRepetido = manterUmPorPessoaNaRodada(
      semSequenciaRepetida,
      'SUBIU_RANKING',
    );
    const semNaoRepetido = manterUmPorPessoaNaRodada(
      semSubiuRepetido,
      'NAO_PALPITOU',
    );
    const comPanelinha = consolidarAcertosPanelinha(semNaoRepetido);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Repo retorna any (dívida técnica)
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
    const temporadaId = grupo?.temporadaId
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
        String(grupo.temporadaId)
      : null;
    const naoPalpitouOk = temporadaId
      ? await sincronizarNaoPalpitouNaListagem(
          comPanelinha,
          (usuarioId, rodada) =>
            this.sequenciaService.listarEsquecidosDaRodada(
              usuarioId,
              temporadaId,
              rodada,
            ),
        )
      : comPanelinha;
    const destaques = selecionarDestaquesDiversos(
      naoPalpitouOk,
      DESTAQUES.LIMITES.MAX_DESTAQUES_LISTAGEM,
      DESTAQUES.PRIORIDADE_POR_TIPO,
    );

    // Buscar visualizações e reações do usuário autenticado (batch)
    const destaqueIds = destaques.map((s) => s.id);
    const visualizados = await this.destaqueRepo.buscarVisualizacoes(
      destaqueIds,
      usuario.id,
    );

    const naoPalpitouIds = destaques
      .filter((d) => d.tipo === 'NAO_PALPITOU')
      .map((d) => d.id);

    const idsComReacao = await this.destaqueRepo.buscarReacoesDoUsuario(
      usuario.id,
      naoPalpitouIds,
    );

    return {
      rodadasDisponiveis,
      destaques: destaques.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        dados: s.dados,
        jogoId: s.jogoId,
        rodada: s.rodada,
        criadoEm: s.criadoEm.toISOString(),
        contadorFs: s.contadorFs,
        jaEnviouF: idsComReacao.has(s.id),
        visualizado: visualizados.has(s.id),
        autor: {
          usuarioId: s.usuario.id,
          nome: s.usuario.nome,
          avatar: null,
        },
      })),
    };
  }

  @Post('grupos/:grupoId/destaques/:destaqueId/mandar-f')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({ summary: 'Enviar um F para destaque NAO_PALPITOU' })
  @ApiResponse({ status: 200, description: 'F enviado com sucesso' })
  async mandarF(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('destaqueId', new ParseUUIDCustomPipe('destaqueId'))
    destaqueId: string,
    @CurrentUser() usuario: { id: string },
  ) {
    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    const rodadasVisiveis = this.calcularRodadasVisiveis(rodadaAtual);

    const contadorFs = await this.reactionService.mandarF(
      destaqueId,
      usuario.id,
      grupoId,
      rodadasVisiveis,
    );

    return { contadorFs };
  }

  @Post('grupos/:grupoId/destaques/visualizar')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({ summary: 'Marcar destaques como visualizados (batch)' })
  @ApiResponse({ status: 200, description: 'Visualizações registradas' })
  async marcarVisualizados(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) _grupoId: string,
    @Body() body: MarcarVisualizadosDto,
    @CurrentUser() usuario: { id: string },
  ) {
    const dados = body.destaqueIds.map((destaqueId) => ({
      destaqueId,
      usuarioId: usuario.id,
    }));

    await this.destaqueRepo.criarVisualizacoesBatch(dados);
    return { registrados: body.destaqueIds.length };
  }

  // --- Helpers ---

  private async obterFasePontosCorridos(
    grupoId: string,
  ): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Repo retorna any (dívida técnica)
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
    if (!grupo?.temporadaId) return null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
    const fases = await this.faseRepo.buscarPorTemporada(grupo.temporadaId);
    const fasePontosCorridos = fases.find((f) => f.tipo === 'PONTOS_CORRIDOS');
    return fasePontosCorridos?.id ?? null;
  }

  /** No feed de destaques, "Atual" é a última rodada que já tem jogo finalizado. */
  private async obterRodadaAtualDoGrupo(
    grupoId: string,
  ): Promise<number | null> {
    const faseId = await this.obterFasePontosCorridos(grupoId);
    if (!faseId) return null;
    return this.jogoRepo.buscarMaiorRodadaFinalizada(faseId);
  }

  private calcularRodadasVisiveis(rodadaAtual: number | null): number[] {
    if (rodadaAtual === null) return [];
    return [rodadaAtual];
  }
}
