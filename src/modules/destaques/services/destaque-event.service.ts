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
  /** Serializa geração por grupo+rodada para evitar cards duplicados em sync paralelo. */
  private readonly filasPorRodada = new Map<string, Promise<unknown>>();

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

  async processarJogoFinalizado(
    jogoId: string,
    opcoes?: { notificar?: boolean },
  ): Promise<void> {
    const notificar = opcoes?.notificar !== false;
    try {
      const jogo = await this.buscarJogoComTimes(jogoId);
      if (!jogo) return;

      const fase = await this.faseRepo.buscarPorId(jogo.faseId);
      if (!fase?.temporadaId) return;

      const grupos = await this.grupoRepo.buscarPorTemporadaId(
        fase.temporadaId,
      );

      for (const grupo of grupos) {
        await this.enfileirarPorGrupoRodada(grupo.id, jogo.rodada, () =>
          this.processarGrupo(jogo, grupo as GrupoBasico, notificar),
        );
      }
    } catch (error) {
      this.logger.error(
        `[DESTAQUES] Erro ao processar jogo ${jogoId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private enfileirarPorGrupoRodada(
    grupoId: string,
    rodada: number | null,
    trabalho: () => Promise<void>,
  ): Promise<void> {
    const chave = `${grupoId}:${rodada ?? 'sem-rodada'}`;
    const anterior = this.filasPorRodada.get(chave) ?? Promise.resolve();
    const proximo = anterior.then(trabalho, trabalho);
    this.filasPorRodada.set(
      chave,
      proximo.finally(() => {
        if (this.filasPorRodada.get(chave) === proximo) {
          this.filasPorRodada.delete(chave);
        }
      }),
    );
    return proximo;
  }

  private async processarGrupo(
    jogo: JogoComTimes,
    grupo: GrupoBasico,
    notificar: boolean,
  ): Promise<void> {
    try {
      const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      )) as MembroComUsuario[];

      if (membros.length === 0) return;

      const quantidadeGerada =
        await this.generatorService.gerarDestaquesParaGrupo(
          jogo,
          grupo,
          membros,
        );

      if (notificar && quantidadeGerada > 0) {
        await this.notificacaoService.notificarNovosDestaques(
          grupo,
          jogo.rodada,
          quantidadeGerada,
          membros,
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
    const jogo = (await this.jogoRepo.buscarPorId(
      jogoId,
    )) as JogoComTimes | null;
    if (!jogo) return null;
    if (jogo.status !== 'FINALIZADO') return null;

    return jogo;
  }
}
