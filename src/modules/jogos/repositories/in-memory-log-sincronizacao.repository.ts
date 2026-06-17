import type {
  LogSincronizacaoRepository,
  LogSincronizacao,
  CriarLogSincronizacaoData,
} from './log-sincronizacao.repository.interface';

export class InMemoryLogSincronizacaoRepository implements LogSincronizacaoRepository {
  items: LogSincronizacao[] = [];

  async criar(data: CriarLogSincronizacaoData): Promise<LogSincronizacao> {
    const log: LogSincronizacao = {
      id: crypto.randomUUID(),
      campeonatoSlug: data.campeonatoSlug,
      fasesIds: data.fasesIds,
      totalJogos: data.totalJogos,
      sincronizados: data.sincronizados,
      erros: data.erros ?? 0,
      status: data.status,
      mensagem: data.mensagem ?? null,
      duracaoMs: data.duracaoMs,
      dataCriacao: new Date(),
      detalhes: data.detalhes ?? null,
    };
    this.items.push(log);
    return log;
  }

  async buscarRecentes(limite = 20): Promise<LogSincronizacao[]> {
    return [...this.items]
      .sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime())
      .slice(0, limite);
  }

  async buscarPorCampeonato(campeonatoSlug: string, limite = 10): Promise<LogSincronizacao[]> {
    return [...this.items]
      .filter((l) => l.campeonatoSlug === campeonatoSlug)
      .sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime())
      .slice(0, limite);
  }

  async buscarUltimaSincronizacao(campeonatoSlug: string): Promise<LogSincronizacao | null> {
    const logs = this.items
      .filter((l) => l.campeonatoSlug === campeonatoSlug)
      .sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime());
    return logs[0] ?? null;
  }
}
