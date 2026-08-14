import { Inject, Injectable, Logger } from '@nestjs/common';
import { JOGOS } from '../../jogos/jogos.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import { DestaqueGeneratorService } from './destaque-generator.service';
import { DestaqueNotificacaoService } from './destaque-notificacao.service';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import type {
  JogoComTimes,
  GrupoBasico,
  MembroComUsuario,
} from '../types/destaque.types';

@Injectable()
export class DestaqueEventService {
  private readonly logger = new Logger(DestaqueEventService.name);

  constructor(
    private readonly generatorService: DestaqueGeneratorService,
    private readonly notificacaoService: DestaqueNotificacaoService,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
  ) {}

  async processarJogoFinalizado(jogoId: string): Promise<void> {
    try {
      const jogo = await this.buscarJogoComTimes(jogoId);
      if (!jogo) return;

      const fase = (await this.faseRepo.buscarPorId(jogo.faseId)) as {
        temporadaId: string;
      } | null;
      if (!fase) return;

      const grupos = await this.grupoRepo.buscarPorTemporadaId(
        fase.temporadaId,
      );

      for (const grupo of grupos) {
        await this.processarGrupo(jogo, grupo as GrupoBasico);
      }
    } catch (error) {
      this.logger.error(
        `[DESTAQUES] Erro ao processar jogo ${jogoId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async processarGrupo(
    jogo: JogoComTimes,
    grupo: GrupoBasico,
  ): Promise<void> {
    try {
      const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      )) as MembroComUsuario[];

      if (membros.length === 0) return;

      const quantidadeGerada =
        await this.generatorService.gerarDestaquesParaGrupo(jogo, grupo, membros);

      if (quantidadeGerada > 0) {
        await this.notificacaoService.notificarNovosDestaques(
          grupo,
          jogo.id,
          quantidadeGerada,
        );
      }

      this.logger.log(
        `[DESTAQUES] ${grupo.nome}: ${quantidadeGerada} destaques gerados para jogo ${jogo.timeCasa.sigla} × ${jogo.timeFora.sigla}`,
      );
    } catch (error) {
      this.logger.error(
        `[DESTAQUES] Erro no grupo ${grupo.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async buscarJogoComTimes(
    jogoId: string,
  ): Promise<JogoComTimes | null> {
    const jogo = (await this.jogoRepo.buscarPorId(jogoId)) as {
      status: string;
    } | null;
    if (!jogo) return null;
    if (jogo.status !== 'FINALIZADO') return null;

    return jogo as unknown as JogoComTimes;
  }
}
