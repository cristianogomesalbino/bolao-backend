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
  ) {}

  @Get('grupos/:grupoId/destaques')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({
    summary: 'Listar destaques do grupo (rodada atual + anterior)',
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
    const rodadasPreferidas = preview
      ? [rodadaPedida]
      : this.calcularRodadasVisiveis(rodadaAtual);
    const rodadasDisponiveis = await this.destaqueRepo.listarRodadasPorGrupo(
      grupoId,
    );
    const rodadas = preview
      ? rodadasPreferidas
      : this.resolverRodadasParaListagem(
          rodadasPreferidas,
          rodadasDisponiveis,
        );

    const destaques = await this.destaqueRepo.buscarPorGrupoERodadas(
      grupoId,
      rodadas,
      preview ? 200 : DESTAQUES.LIMITES.MAX_DESTAQUES_LISTAGEM,
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

    const lista = preview ? amostrarPorTipo(destaques) : destaques;

    return {
      rodadasDisponiveis,
      destaques: lista.map((s) => ({
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
    const rodadasDisponiveis = await this.destaqueRepo.listarRodadasPorGrupo(
      grupoId,
    );
    const rodadasVisiveis = this.resolverRodadasParaListagem(
      this.calcularRodadasVisiveis(rodadaAtual),
      rodadasDisponiveis,
    );

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

  private async obterRodadaAtualDoGrupo(
    grupoId: string,
  ): Promise<number | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Repo retorna any (dívida técnica)
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
    if (!grupo?.temporadaId) return null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
    const fases = await this.faseRepo.buscarPorTemporada(grupo.temporadaId);
    const fasePontosCorridos = fases.find((f) => f.tipo === 'PONTOS_CORRIDOS');
    if (!fasePontosCorridos) return null;

    const agenda = await this.jogoRepo.buscarRodadaAtual(fasePontosCorridos.id);
    const ultimaFinalizada = await this.jogoRepo.buscarMaiorRodadaFinalizada(
      fasePontosCorridos.id,
    );
    if (
      ultimaFinalizada != null &&
      (agenda == null || ultimaFinalizada > agenda)
    ) {
      return ultimaFinalizada;
    }
    return agenda;
  }

  private calcularRodadasVisiveis(rodadaAtual: number | null): number[] {
    if (rodadaAtual === null) return [];
    const rodadas = [rodadaAtual];
    if (rodadaAtual > 1) rodadas.push(rodadaAtual - 1);
    return rodadas;
  }

  /**
   * Prefere a rodada atual e a anterior. Se elas ainda não têm destaques
   * (rodada em andamento ou geração pendente), recua até as últimas
   * rodadas que realmente possuem destaques.
   */
  private resolverRodadasParaListagem(
    preferidas: number[],
    disponiveis: number[],
  ): number[] {
    const comDestaque = new Set(disponiveis);
    const escolhidas = preferidas.filter((rodada) => comDestaque.has(rodada));
    if (escolhidas.length > 0) return escolhidas;

    const maisRecente = disponiveis[0];
    if (maisRecente == null) return [];
    const rodadas = [maisRecente];
    if (disponiveis.includes(maisRecente - 1)) rodadas.push(maisRecente - 1);
    return rodadas;
  }
}

const LIMITE_POR_TIPO = 2;

function amostrarPorTipo<T extends { tipo: string }>(destaques: T[]): T[] {
  const prioridades = DESTAQUES.PRIORIDADE_POR_TIPO;
  const contagem = new Map<string, number>();
  return [...destaques]
    .sort((a, b) => (prioridades[a.tipo] ?? 99) - (prioridades[b.tipo] ?? 99))
    .filter((item) => {
      const atual = contagem.get(item.tipo) ?? 0;
      if (atual >= LIMITE_POR_TIPO) return false;
      contagem.set(item.tipo, atual + 1);
      return true;
    });
}
