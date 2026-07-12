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
import { STORIES } from '../stories.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../../common/guards/group-role.guard';
import { GroupRoles } from '../../../common/decorators/group-roles.decorator';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';
import { StoryReactionService } from '../services/story-reaction.service';
import type { StoryRepository } from '../repositories/story.repository.interface';
import { JOGOS } from '../../jogos/jogos.constants';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';

@ApiTags(STORIES.TAG)
@Controller()
export class StoryController {
  constructor(
    @Inject(STORIES.STORY_REPOSITORY_TOKEN)
    private readonly storyRepo: StoryRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    private readonly reactionService: StoryReactionService,
  ) {}

  @Get('grupos/:grupoId/stories')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({
    summary: 'Listar stories do grupo (rodada atual + anterior)',
  })
  @ApiResponse({ status: 200, description: 'Lista de stories cronológica' })
  async listarStories(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() usuario: { id: string },
  ) {
    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    const rodadas = this.calcularRodadasVisiveis(rodadaAtual);

    const stories = await this.storyRepo.buscarPorGrupoERodadas(
      grupoId,
      rodadas,
      STORIES.LIMITES.MAX_STORIES_LISTAGEM,
    );

    // Complementar com rodada anterior se necessário
    const minStories = STORIES.LIMITES.MIN_STORIES_VIEWER;
    if (stories.length < minStories && rodadaAtual && rodadaAtual > 1) {
      const rodadaExtra = rodadaAtual - 2;
      if (rodadaExtra >= 1) {
        const extras = await this.storyRepo.buscarPorGrupoERodadas(
          grupoId,
          [rodadaExtra],
          minStories - stories.length,
        );
        stories.push(...extras);
      }
    }

    // Buscar visualizações e reações do usuário autenticado
    const storyIds = stories.map((s) => s.id);
    const visualizados = await this.storyRepo.buscarVisualizacoes(
      storyIds,
      usuario.id,
    );

    const reacoesPorStory = new Map<string, boolean>();
    for (const story of stories) {
      if (story.tipo === 'NAO_PALPITOU') {
        const jaEnviou = await this.storyRepo.existeReacao(
          usuario.id,
          story.id,
        );
        reacoesPorStory.set(story.id, jaEnviou);
      }
    }

    return {
      stories: stories.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        dados: s.dados,
        jogoId: s.jogoId,
        rodada: s.rodada,
        criadoEm: s.criadoEm.toISOString(),
        contadorFs: s.contadorFs,
        jaEnviouF: reacoesPorStory.get(s.id) ?? false,
        visualizado: visualizados.has(s.id),
        autor: {
          usuarioId: s.usuario.id,
          nome: s.usuario.nome,
          avatar: null,
        },
      })),
    };
  }

  @Post('grupos/:grupoId/stories/:storyId/mandar-f')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({ summary: 'Enviar um F para story NAO_PALPITOU' })
  @ApiResponse({ status: 200, description: 'F enviado com sucesso' })
  async mandarF(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('storyId', new ParseUUIDCustomPipe('storyId')) storyId: string,
    @CurrentUser() usuario: { id: string },
  ) {
    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    const rodadasVisiveis = this.calcularRodadasVisiveis(rodadaAtual);

    const contadorFs = await this.reactionService.mandarF(
      storyId,
      usuario.id,
      grupoId,
      rodadasVisiveis,
    );

    return { contadorFs };
  }

  @Post('grupos/:grupoId/stories/visualizar')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({ summary: 'Marcar stories como visualizados (batch)' })
  @ApiResponse({ status: 200, description: 'Visualizações registradas' })
  async marcarVisualizados(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) _grupoId: string,
    @Body() body: { storyIds: string[] },
    @CurrentUser() usuario: { id: string },
  ) {
    const dados = body.storyIds.map((storyId) => ({
      storyId,
      usuarioId: usuario.id,
    }));

    await this.storyRepo.criarVisualizacoesBatch(dados);
    return { registrados: body.storyIds.length };
  }

  // --- Helpers ---

  private obterRodadaAtualDoGrupo(_grupoId: string): Promise<number | null> {
    // Buscar a fase ativa do grupo (via temporada) e a rodada atual
    // Integração com JogoRepository.buscarRodadaAtual será resolvida no StoriesModule
    return Promise.resolve(null);
  }

  private calcularRodadasVisiveis(rodadaAtual: number | null): number[] {
    if (rodadaAtual === null) return [];
    const rodadas = [rodadaAtual];
    if (rodadaAtual > 1) rodadas.push(rodadaAtual - 1);
    return rodadas;
  }
}
