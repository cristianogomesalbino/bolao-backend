import { Inject, Injectable } from '@nestjs/common';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import {
  CampeonatoNaoEncontradoError,
  TemporadaOrigemNaoEncontradaError,
} from '../../common/errors/domain-errors';
import { TEMPORADAS } from './temporadas.constants';
import type { TemporadaRepository } from './repositories/temporada.repository.interface';
import { CAMPEONATOS } from '../campeonatos/campeonatos.constants';
import type { CampeonatoRepository } from '../campeonatos/repositories/campeonato.repository.interface';
import { JOGOS } from '../jogos/jogos.constants';
import type { FaseRepository } from '../jogos/repositories/fase.repository.interface';
import type { JogoRepository } from '../jogos/repositories/jogo.repository.interface';

@Injectable()
export class TemporadasService {
  constructor(
    @Inject(TEMPORADAS.REPOSITORY_TOKEN)
    private readonly temporadaRepo: TemporadaRepository,
    @Inject(CAMPEONATOS.REPOSITORY_TOKEN)
    private readonly campeonatoRepo: CampeonatoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
  ) {}

  async criar(createTemporadaDto: CreateTemporadaDto) {
    const campeonato = await this.campeonatoRepo.buscarPorId(
      createTemporadaDto.campeonatoId,
    );

    if (!campeonato) {
      throw new CampeonatoNaoEncontradoError();
    }

    const temporada = await this.temporadaRepo.criar({
      ano: createTemporadaDto.ano,
      campeonatoId: createTemporadaDto.campeonatoId,
    });

    if (createTemporadaDto.copiarFasesDe) {
      const temporadaOrigem = await this.temporadaRepo.buscarPorId(
        createTemporadaDto.copiarFasesDe,
      );

      if (!temporadaOrigem) {
        throw new TemporadaOrigemNaoEncontradaError();
      }

      const fasesOrigem = await this.faseRepo.buscarPorTemporada(
        createTemporadaDto.copiarFasesDe,
      );

      if (fasesOrigem.length > 0) {
        await this.faseRepo.criarVarios(
          fasesOrigem.map((fase) => ({
            nome: fase.nome,
            tipo: fase.tipo,
            ordem: fase.ordem,
            idaVolta: fase.idaVolta,
            temporadaId: temporada.id,
          })),
        );
      }
    }

    return temporada;
  }

  buscarTodos() {
    return this.temporadaRepo.buscarTodos();
  }

  async buscarDadosTemporada(temporadaId: string) {
    const [proximoJogo, totalAdiados] = await Promise.all([
      this.jogoRepo.buscarProximoJogoPorTemporada(temporadaId),
      this.jogoRepo.contarAdiadosPorTemporada(temporadaId),
    ]);

    return { proximoJogo, totalAdiados };
  }

  async buscarJogosTemporada(temporadaId: string) {
    return this.jogoRepo.buscarTodosPorTemporada(temporadaId);
  }
}
