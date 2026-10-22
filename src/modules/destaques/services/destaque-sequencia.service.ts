import { Inject, Injectable } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { PontuacaoService } from '../../ranking/services/pontuacao.service';
import type { RecordeRepository } from '../repositories/recorde.repository.interface';
import type { PalpiteRepository } from '../../palpites/repositories/palpite.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type {
  CategoriaRecorde,
  JogoEsquecido,
  JogoSequencia,
  PlacarCravado,
  RecordeInfo,
  TimeInfo,
} from '../types/destaque.types';

interface JogoInterno {
  id: string;
  faseId: string;
  rodada: number | null;
  status: string;
  golsCasa: number | null;
  golsFora: number | null;
  timeCasaId: string;
  timeForaId: string;
  dataHora: Date | string | null;
  timeCasa?: { nome: string; sigla?: string; escudo?: string | null } | null;
  timeFora?: { nome: string; sigla?: string; escudo?: string | null } | null;
}

interface PalpiteInterno {
  usuarioId: string;
  jogoId: string;
  golsCasa: number;
  golsFora: number;
}

interface SequenciaResultado {
  quantidade: number;
  pontos: number;
  ultimosJogos: JogoSequencia[];
  rodadaInicio: number | null;
}

@Injectable()
export class DestaqueSequenciaService {
  constructor(
    @Inject(DESTAQUES.RECORDE_REPOSITORY_TOKEN)
    private readonly recordeRepo: RecordeRepository,
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    private readonly pontuacaoService: PontuacaoService,
  ) {}

  async calcularSequenciaResultado(
    usuarioId: string,
    faseId: string,
    rodadaAtual: number | null,
    jogoAtualId: string,
  ): Promise<SequenciaResultado | null> {
    if (rodadaAtual === null) return null;

    const rodadasParaConsultar = this.calcularRodadasParaConsulta(rodadaAtual);
    const todosJogos: JogoInterno[] = [];

    for (const rodada of rodadasParaConsultar) {
      const jogos = (await this.jogoRepo.buscarPorFase(
        faseId,
        rodada,
      )) as JogoInterno[];
      todosJogos.push(...jogos);
    }

    const jogosFinalizados = this.filtrarFinalizadosOrdenados(todosJogos);
    if (jogosFinalizados.length < 2) return null;

    const palpiteMap = await this.buscarPalpitesDoUsuario(
      jogosFinalizados,
      usuarioId,
    );
    const indiceAtual = jogosFinalizados.findIndex((j) => j.id === jogoAtualId);
    if (indiceAtual === -1) return null;

    const { quantidade, pontos, ultimosJogos, rodadaInicio } = this.percorrerSequencia(
      jogosFinalizados,
      palpiteMap,
      indiceAtual,
      rodadaAtual,
    );

    if (quantidade < 2) return null;

    return {
      quantidade,
      pontos,
      ultimosJogos: ultimosJogos.slice(
        -DESTAQUES.LIMITES.ULTIMOS_JOGOS_SEQUENCIA,
      ),
      rodadaInicio,
    };
  }

  async listarCravadasDaRodada(
    usuarioId: string,
    temporadaId: string,
    rodada: number | null,
  ): Promise<PlacarCravado[]> {
    if (rodada === null) return [];

    const jogos = this.filtrarFinalizadosOrdenados(
      (await this.jogoRepo.buscarTodosPorTemporada(temporadaId)).filter(
        (jogo) => jogo.rodada === rodada,
      ) as JogoInterno[],
    );
    if (jogos.length === 0) return [];

    const palpiteMap = await this.buscarPalpitesDoUsuario(jogos, usuarioId);
    const cravadas: PlacarCravado[] = [];

    for (const jogo of jogos) {
      const palpite = palpiteMap.get(jogo.id);
      if (!palpite || jogo.golsCasa === null || jogo.golsFora === null) continue;

      const resultado = this.pontuacaoService.calcular(
        { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
        { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
      );
      if (resultado.categoriaAcerto !== 'ACERTO_EM_CHEIO') continue;

      cravadas.push({
        jogoId: jogo.id,
        golsCasa: jogo.golsCasa,
        golsFora: jogo.golsFora,
        timeCasa: this.timeInfo(jogo.timeCasa, jogo.timeCasaId),
        timeFora: this.timeInfo(jogo.timeFora, jogo.timeForaId),
      });
    }

    return cravadas;
  }

  async listarEsquecidosDaRodada(
    usuarioId: string,
    temporadaId: string,
    rodada: number | null,
  ): Promise<JogoEsquecido[]> {
    if (rodada === null) return [];

    const jogos = this.filtrarFinalizadosOrdenados(
      (await this.jogoRepo.buscarTodosPorTemporada(temporadaId)).filter(
        (jogo) => jogo.rodada === rodada,
      ) as JogoInterno[],
    );
    if (jogos.length === 0) return [];

    const palpiteMap = await this.buscarPalpitesDoUsuario(jogos, usuarioId);
    return jogos
      .filter((jogo) => !palpiteMap.has(jogo.id))
      .map((jogo) => ({
        jogoId: jogo.id,
        timeCasa: this.timeInfo(jogo.timeCasa, jogo.timeCasaId),
        timeFora: this.timeInfo(jogo.timeFora, jogo.timeForaId),
        golsCasa: jogo.golsCasa,
        golsFora: jogo.golsFora,
      }));
  }

  async atualizarRecorde(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
    usuarioId: string,
    novoValor: number,
  ): Promise<RecordeInfo> {
    const recordeExistente = await this.recordeRepo.buscarRecorde(
      grupoId,
      temporadaId,
      categoria,
    );

    if (!recordeExistente) {
      const novo = await this.recordeRepo.criar(
        grupoId,
        temporadaId,
        categoria,
        novoValor,
        usuarioId,
      );
      return {
        valor: novo.valor,
        detentores: novo.detentores.map((d) => ({
          nome: '',
          usuarioId: d.usuarioId,
        })),
        ehNovoRecorde: true,
      };
    }

    if (novoValor > recordeExistente.valor) {
      await this.recordeRepo.limparDetentores(recordeExistente.id);
      await this.recordeRepo.atualizarValor(recordeExistente.id, novoValor);
      await this.recordeRepo.adicionarDetentor(recordeExistente.id, usuarioId);
      return {
        valor: novoValor,
        detentores: [{ nome: '', usuarioId }],
        ehNovoRecorde: true,
      };
    }

    if (novoValor === recordeExistente.valor) {
      await this.recordeRepo.adicionarDetentor(recordeExistente.id, usuarioId);
      const detentoresAtuais = recordeExistente.detentores.map((d) => ({
        nome: '',
        usuarioId: d.usuarioId,
      }));
      const jaContem = detentoresAtuais.some((d) => d.usuarioId === usuarioId);
      if (!jaContem) detentoresAtuais.push({ nome: '', usuarioId });
      return {
        valor: recordeExistente.valor,
        detentores: detentoresAtuais,
        ehNovoRecorde: false,
      };
    }

    return {
      valor: recordeExistente.valor,
      detentores: recordeExistente.detentores.map((d) => ({
        nome: '',
        usuarioId: d.usuarioId,
      })),
      ehNovoRecorde: false,
    };
  }

  // --- Helpers ---

  private async buscarPalpitesDoUsuario(
    jogos: JogoInterno[],
    usuarioId: string,
  ): Promise<Map<string, PalpiteInterno>> {
    const jogoIds = jogos.map((j) => j.id);
    const todosPalpites = (await this.palpiteRepo.buscarPorUsuarioEJogos(
      usuarioId,
      jogoIds,
    )) as PalpiteInterno[];
    return new Map(todosPalpites.map((p) => [p.jogoId, p]));
  }

  private percorrerSequencia(
    jogos: JogoInterno[],
    palpiteMap: Map<string, PalpiteInterno>,
    indiceAtual: number,
    rodadaFallback: number | null,
  ): {
    quantidade: number;
    pontos: number;
    ultimosJogos: JogoSequencia[];
    rodadaInicio: number | null;
  } {
    let quantidade = 0;
    let pontos = 0;
    const ultimosJogos: JogoSequencia[] = [];
    let rodadaInicio: number | null = rodadaFallback;

    for (let i = indiceAtual; i >= 0; i--) {
      const jogo = jogos[i];
      const palpite = palpiteMap.get(jogo.id);
      if (!palpite || jogo.golsCasa === null || jogo.golsFora === null) break;

      const resultado = this.pontuacaoService.calcular(
        { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
        { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
      );

      const pontuou =
        resultado.categoriaAcerto === 'ACERTO_EM_CHEIO' ||
        resultado.categoriaAcerto === 'ACERTO_DE_RESULTADO';
      if (!pontuou) break;

      quantidade++;
      pontos += resultado.pontosBase;
      rodadaInicio = jogo.rodada ?? rodadaInicio;
      ultimosJogos.unshift({
        timeCasa: jogo.timeCasa?.nome ?? jogo.timeCasaId,
        timeFora: jogo.timeFora?.nome ?? jogo.timeForaId,
        golsCasa: jogo.golsCasa,
        golsFora: jogo.golsFora,
        rodada: jogo.rodada ?? null,
        acertou: true,
      });
    }

    return { quantidade, pontos, ultimosJogos, rodadaInicio };
  }

  private timeInfo(
    time: { nome: string; sigla?: string; escudo?: string | null } | null | undefined,
    fallbackId: string,
  ): TimeInfo {
    const nome = time?.nome ?? fallbackId;
    return {
      nome,
      sigla: time?.sigla ?? nome.slice(0, 3).toUpperCase(),
      escudo: time?.escudo ?? null,
    };
  }

  private filtrarFinalizadosOrdenados(jogos: JogoInterno[]): JogoInterno[] {
    return jogos
      .filter((j) => j.status === 'FINALIZADO')
      .sort((a, b) => {
        const dataA = a.dataHora ? new Date(a.dataHora as string).getTime() : 0;
        const dataB = b.dataHora ? new Date(b.dataHora as string).getTime() : 0;
        return dataA - dataB;
      });
  }

  private calcularRodadasParaConsulta(rodadaAtual: number): number[] {
    const rodadas: number[] = [];
    const limite = DESTAQUES.LIMITES.SEQUENCIA_RESULTADO_CONSULTA_RODADAS;
    for (let i = 0; i <= limite; i++) {
      const rodada = rodadaAtual - i;
      if (rodada >= 1) rodadas.push(rodada);
    }
    return rodadas;
  }
}
