import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DESTAQUES } from '../destaques.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../../common/guards/group-role.guard';
import { GroupRoles } from '../../../common/decorators/group-roles.decorator';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';
import { DestaqueReactionService } from '../services/destaque-reaction.service';
import type { DestaqueRepository } from '../repositories/destaque.repository.interface';
import { JOGOS } from '../../jogos/jogos.constants';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';

@ApiTags(DESTAQUES.TAG)
@Controller()
export class DestaqueController {
  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
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
  ) {
    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    const rodadas = this.calcularRodadasVisiveis(rodadaAtual);

    const destaques = await this.destaqueRepo.buscarPorGrupoERodadas(
      grupoId,
      rodadas,
      DESTAQUES.LIMITES.MAX_DESTAQUES_LISTAGEM,
    );

    // Complementar com rodada anterior se necessário
    const minDestaques = DESTAQUES.LIMITES.MIN_DESTAQUES_VIEWER;
    if (destaques.length < minDestaques && rodadaAtual && rodadaAtual > 1) {
      const rodadaExtra = rodadaAtual - 2;
      if (rodadaExtra >= 1) {
        const extras = await this.destaqueRepo.buscarPorGrupoERodadas(
          grupoId,
          [rodadaExtra],
          minDestaques - destaques.length,
        );
        destaques.push(...extras);
      }
    }

    // Buscar visualizações e reações do usuário autenticado
    const destaqueIds = destaques.map((s) => s.id);
    const visualizados = await this.destaqueRepo.buscarVisualizacoes(
      destaqueIds,
      usuario.id,
    );

    const reacoesPorDestaque = new Map<string, boolean>();
    for (const destaque of destaques) {
      if (destaque.tipo === 'NAO_PALPITOU') {
        const jaEnviou = await this.destaqueRepo.existeReacao(
          usuario.id,
          destaque.id,
        );
        reacoesPorDestaque.set(destaque.id, jaEnviou);
      }
    }

    return {
      destaques: destaques.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        dados: s.dados,
        jogoId: s.jogoId,
        rodada: s.rodada,
        criadoEm: s.criadoEm.toISOString(),
        contadorFs: s.contadorFs,
        jaEnviouF: reacoesPorDestaque.get(s.id) ?? false,
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
    @Param('destaqueId', new ParseUUIDCustomPipe('destaqueId')) destaqueId: string,
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
    @Body() body: { destaqueIds: string[] },
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

  private obterRodadaAtualDoGrupo(_grupoId: string): Promise<number | null> {
    // Buscar a fase ativa do grupo (via temporada) e a rodada atual
    // Integração com JogoRepository.buscarRodadaAtual será resolvida no DestaquesModule
    return Promise.resolve(null);
  }

  private calcularRodadasVisiveis(rodadaAtual: number | null): number[] {
    if (rodadaAtual === null) return [];
    const rodadas = [rodadaAtual];
    if (rodadaAtual > 1) rodadas.push(rodadaAtual - 1);
    return rodadas;
  }
}
