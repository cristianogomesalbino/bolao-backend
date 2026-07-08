import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { NotificacaoNaoEncontradaError } from '../../../common/errors/domain-errors/notificacoes.errors';
import type {
  NotificacaoRepository,
  CriarNotificacaoData,
  ListarFiltros,
  Notificacao,
} from '../repositories/notificacao.repository.interface';

export interface ListarResult {
  notificacoes: Notificacao[];
  total: number;
  naoLidas: number;
}

@Injectable()
export class NotificacaoService {
  private readonly logger = new Logger(NotificacaoService.name);

  constructor(
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
  ) {}

  async criar(dados: CriarNotificacaoData): Promise<Notificacao> {
    return this.notificacaoRepo.criar(dados);
  }

  async criarLote(dados: CriarNotificacaoData[]): Promise<void> {
    if (dados.length === 0) return;
    await this.notificacaoRepo.criarVarios(dados);
  }

  async listar(
    usuarioId: string,
    filtros: ListarFiltros,
  ): Promise<ListarResult> {
    const [notificacoes, total, naoLidas] = await Promise.all([
      this.notificacaoRepo.listar(usuarioId, filtros),
      this.notificacaoRepo.contarPorFiltro(usuarioId, filtros),
      this.notificacaoRepo.contarNaoLidas(usuarioId),
    ]);

    return { notificacoes, total, naoLidas };
  }

  async contarNaoLidas(usuarioId: string): Promise<number> {
    return this.notificacaoRepo.contarNaoLidas(usuarioId);
  }

  async marcarComoLida(id: string, usuarioId: string): Promise<void> {
    const notificacao = await this.notificacaoRepo.buscarPorId(id);

    if (notificacao?.usuarioId !== usuarioId) {
      throw new NotificacaoNaoEncontradaError();
    }

    if (notificacao.status === 'LIDA') return;

    await this.notificacaoRepo.marcarComoLida(id, new Date());
  }

  async marcarTodasComoLidas(usuarioId: string): Promise<number> {
    return this.notificacaoRepo.marcarTodasComoLidas(usuarioId, new Date());
  }

  async limparAntigas(): Promise<void> {
    const { LIMPEZA_LIDAS_DIAS, LIMPEZA_NAO_LIDAS_DIAS } = NOTIFICACOES.CRON;
    const { BATCH_LIMPEZA } = NOTIFICACOES.LIMITES;

    let totalRemovidas = 0;

    try {
      const removidasLidas = await this.notificacaoRepo.removerAntigasLidas(
        LIMPEZA_LIDAS_DIAS,
        BATCH_LIMPEZA,
      );
      totalRemovidas += removidasLidas;
    } catch (error) {
      this.logger.error('Erro ao limpar notificações lidas antigas', error);
    }

    try {
      const removidasNaoLidas =
        await this.notificacaoRepo.removerAntigasNaoLidas(
          LIMPEZA_NAO_LIDAS_DIAS,
          BATCH_LIMPEZA,
        );
      totalRemovidas += removidasNaoLidas;
    } catch (error) {
      this.logger.error('Erro ao limpar notificações não lidas antigas', error);
    }

    this.logger.log(`[LIMPEZA] ${totalRemovidas} notificações removidas`);
  }
}
