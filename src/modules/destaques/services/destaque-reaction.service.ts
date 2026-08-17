import { Inject, Injectable, Logger } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import type { DestaqueRepository } from '../repositories/destaque.repository.interface';
import {
  DestaqueNaoEncontradoError,
  DestaqueForaDoEscopoError,
  ReacaoApenasNaoPalpitouError,
  NaoPodeEnviarFParaSiMesmoError,
  UsuarioJaEnviouFError,
} from '../../../common/errors/domain-errors';
import { DestaqueNotificacaoService } from './destaque-notificacao.service';

@Injectable()
export class DestaqueReactionService {
  private readonly logger = new Logger(DestaqueReactionService.name);

  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    private readonly notificacaoService: DestaqueNotificacaoService,
  ) {}

  async mandarF(
    destaqueId: string,
    remetenteId: string,
    grupoId: string,
    rodadasVisiveis: number[],
  ): Promise<number> {
    const destaque = await this.destaqueRepo.buscarPorId(destaqueId);

    if (!destaque) {
      throw new DestaqueNaoEncontradoError();
    }

    if (destaque.grupoId !== grupoId) {
      throw new DestaqueNaoEncontradoError();
    }

    const destaqueVisivelNaRodada =
      destaque.rodada !== null && rodadasVisiveis.includes(destaque.rodada);
    if (!destaqueVisivelNaRodada) {
      throw new DestaqueForaDoEscopoError();
    }

    if (destaque.tipo !== 'NAO_PALPITOU') {
      throw new ReacaoApenasNaoPalpitouError();
    }

    if (destaque.usuarioId === remetenteId) {
      throw new NaoPodeEnviarFParaSiMesmoError();
    }

    const jaEnviou = await this.destaqueRepo.existeReacao(
      remetenteId,
      destaqueId,
    );
    if (jaEnviou) {
      throw new UsuarioJaEnviouFError();
    }

    await this.destaqueRepo.criarReacao({ destaqueId, remetenteId });
    const novoContador =
      await this.destaqueRepo.incrementarContadorFs(destaqueId);

    // Notificação fire-and-forget
    this.notificacaoService
      .notificarRecebeuF(destaque.usuarioId, remetenteId, grupoId)
      .catch((err) =>
        this.logger.error(
          `Erro ao notificar F para ${destaque.usuarioId}: ${(err as Error).message}`,
        ),
      );

    return novoContador;
  }
}
