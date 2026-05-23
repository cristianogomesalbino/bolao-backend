import { Inject, Injectable } from '@nestjs/common';
import { PALPITES } from '../palpites.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import type { PalpiteRepository } from '../repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '../repositories/palpite-dobrado.repository.interface';
import type { TokenDobroRepository } from '../repositories/token-dobro.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import { GrupoNaoEncontradoError } from '../../../common/errors/domain-errors/grupos.errors';
import { FaseNaoEncontradaError } from '../../../common/errors/domain-errors/jogos.errors';

@Injectable()
export class PainelRodadaService {
  constructor(
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN)
    private readonly palpiteDobradoRepo: PalpiteDobradoRepository,
    @Inject(PALPITES.TOKEN_DOBRO_REPOSITORY_TOKEN)
    private readonly tokenDobroRepo: TokenDobroRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  async obterPainelRodada(
    grupoId: string,
    faseId: string,
    usuarioId: string,
    rodada?: number,
  ) {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) throw new FaseNaoEncontradaError();

    if (fase.temporadaId !== grupo.temporadaId) {
      throw new FaseNaoEncontradaError();
    }

    const jogos = await this.jogoRepo.buscarPorFase(faseId, rodada);
    const jogoIds = jogos.map((j) => j.id);

    const [palpites, dobros, saldo] = await Promise.all([
      this.palpiteRepo.listarPorJogosEUsuarios(jogoIds, [usuarioId]),
      this.palpiteDobradoRepo.listarPorUsuarioEGrupo(usuarioId, grupoId),
      this.tokenDobroRepo.calcularSaldo(usuarioId, grupoId),
    ]);

    const palpitesPorJogo = new Map(
      palpites.map((p) => [p.jogoId, p]),
    );
    const dobrosSet = new Set(
      dobros.filter((d) => jogoIds.includes(d.jogoId)).map((d) => d.jogoId),
    );

    const jogosEnriquecidos = jogos.map((jogo) => {
      const meuPalpite = palpitesPorJogo.get(jogo.id) ?? null;
      return {
        id: jogo.id,
        timeCasaId: jogo.timeCasaId,
        timeForaId: jogo.timeForaId,
        dataHora: jogo.dataHora,
        status: jogo.status,
        golsCasa: jogo.golsCasa,
        golsFora: jogo.golsFora,
        rodada: jogo.rodada,
        meuPalpite: meuPalpite
          ? { id: meuPalpite.id, golsCasa: meuPalpite.golsCasa, golsFora: meuPalpite.golsFora }
          : null,
        dobrado: dobrosSet.has(jogo.id),
      };
    });

    return {
      fase: { id: fase.id, nome: fase.nome, tipo: fase.tipo, ordem: fase.ordem },
      saldoTokensDobro: saldo,
      permitirPalpiteDobrado: grupo.permitirPalpiteDobrado,
      jogos: jogosEnriquecidos,
    };
  }
}
