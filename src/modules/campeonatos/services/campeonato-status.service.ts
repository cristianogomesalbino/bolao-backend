import { Inject, Injectable, Logger } from '@nestjs/common';
import { CAMPEONATOS } from '../campeonatos.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import type { CampeonatoRepository } from '../repositories/campeonato.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';

interface JogoParaStatus {
  id: string;
  status: string;
  rodada: number | null;
  faseId: string;
}

interface FaseParaStatus {
  id: string;
  nome: string;
  tipo: string;
  temporadaId: string;
  temporada?: {
    id: string;
    campeonato?: { id: string; nome: string };
  };
}

@Injectable()
export class CampeonatoStatusService {
  private readonly logger = new Logger(CampeonatoStatusService.name);

  constructor(
    @Inject(CAMPEONATOS.REPOSITORY_TOKEN)
    private readonly campeonatoRepo: CampeonatoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
  ) {}

  /**
   * Verifica se o campeonato deve ser finalizado após um jogo ser finalizado.
   * Otimização: só executa queries quando o jogo está na fase/rodada decisiva.
   */
  async verificarFinalizacaoCampeonato(faseId: string): Promise<void> {
    const fase = (await this.faseRepo.buscarPorId(
      faseId,
    )) as FaseParaStatus | null;
    if (!fase?.temporada?.campeonato) return;

    const campeonatoId = fase.temporada.campeonato.id;
    const campeonatoNome = fase.temporada.campeonato.nome;

    // Guard de idempotência: não processar se já finalizado
    const campeonato = await this.campeonatoRepo.buscarPorId(campeonatoId);
    if (!campeonato || campeonato.status === 'FINALIZADO') return;

    const ehFaseDecisiva = this.ehFaseDecisiva(fase);
    if (!ehFaseDecisiva) return;

    const encerrou = await this.verificarEncerramento(fase);
    if (!encerrou) return;

    await this.campeonatoRepo.atualizarStatus(campeonatoId, 'FINALIZADO');
    this.logger.log(
      `[STATUS] Campeonato "${campeonatoNome}" finalizado automaticamente`,
    );
  }

  /**
   * Marca o campeonato como EM_ANDAMENTO quando o primeiro jogo inicia.
   */
  async verificarInicioCampeonato(faseId: string): Promise<void> {
    const fase = (await this.faseRepo.buscarPorId(
      faseId,
    )) as FaseParaStatus | null;
    if (!fase?.temporada?.campeonato) return;

    const campeonatoId = fase.temporada.campeonato.id;
    const campeonato = await this.campeonatoRepo.buscarPorId(campeonatoId);
    if (!campeonato) return;

    if (campeonato.status !== 'NAO_INICIADO') return;

    await this.campeonatoRepo.atualizarStatus(campeonatoId, 'EM_ANDAMENTO');
    this.logger.log(
      `[STATUS] Campeonato "${campeonato.nome}" marcado como EM_ANDAMENTO`,
    );
  }

  /**
   * Determina se a fase é decisiva (última do campeonato).
   * Copa: fase cujo nome contém "Final" (exato, não "Oitavas de Final")
   * Pontos corridos: qualquer fase, mas a verificação de rodada é feita depois
   */
  private ehFaseDecisiva(fase: FaseParaStatus): boolean {
    if (fase.tipo === 'MATA_MATA') {
      return fase.nome === 'Final';
    }
    // Pontos corridos: sempre pode ser a fase decisiva (verificamos a rodada depois)
    return true;
  }

  /**
   * Verifica se todos os jogos da fase decisiva estão encerrados.
   * Copa: todos os jogos da fase "Final" finalizados/cancelados
   * Pontos corridos: todos os jogos da última rodada finalizados/cancelados
   */
  private async verificarEncerramento(fase: FaseParaStatus): Promise<boolean> {
    if (fase.tipo === 'MATA_MATA') {
      return this.verificarEncerramentoMataMata(fase);
    }
    return this.verificarEncerramentoPontosCorridos(fase);
  }

  private async verificarEncerramentoMataMata(
    fase: FaseParaStatus,
  ): Promise<boolean> {
    const jogos = (await this.jogoRepo.buscarPorFase(
      fase.id,
    )) as JogoParaStatus[];

    if (jogos.length === 0) return false;

    return jogos.every(
      (j) => j.status === 'FINALIZADO' || j.status === 'CANCELADO',
    );
  }

  private async verificarEncerramentoPontosCorridos(
    fase: FaseParaStatus,
  ): Promise<boolean> {
    // Busca TODOS os jogos da fase e determina a última rodada existente
    const todosJogos = (await this.jogoRepo.buscarPorFase(
      fase.id,
    )) as JogoParaStatus[];

    if (todosJogos.length === 0) return false;

    // Determinar a última rodada (maior rodada existente nos jogos)
    const ultimaRodada = todosJogos.reduce(
      (max, j) => Math.max(max, j.rodada ?? 0),
      0,
    );
    if (ultimaRodada === 0) return false;

    // Filtrar apenas jogos da última rodada
    const jogosDaUltimaRodada = todosJogos.filter(
      (j) => j.rodada === ultimaRodada,
    );

    return jogosDaUltimaRodada.every(
      (j) => j.status === 'FINALIZADO' || j.status === 'CANCELADO',
    );
  }
}
