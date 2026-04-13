import { Inject, Injectable } from '@nestjs/common';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { CampeonatoNaoEncontradoError } from '../../common/errors/domain-errors';
import { TEMPORADAS } from './temporadas.constants';
import { TemporadaRepository } from './repositories/temporada.repository.interface';
import { CAMPEONATOS } from '../campeonatos/campeonatos.constants';
import { CampeonatoRepository } from '../campeonatos/repositories/campeonato.repository.interface';

@Injectable()
export class TemporadasService {
  constructor(
    @Inject(TEMPORADAS.REPOSITORY_TOKEN)
    private readonly temporadaRepo: TemporadaRepository,
    @Inject(CAMPEONATOS.REPOSITORY_TOKEN)
    private readonly campeonatoRepo: CampeonatoRepository,
  ) {}

  async criar(createTemporadaDto: CreateTemporadaDto) {
    const campeonato = await this.campeonatoRepo.buscarPorId(
      createTemporadaDto.campeonatoId,
    );

    if (!campeonato) {
      throw new CampeonatoNaoEncontradoError();
    }

    return this.temporadaRepo.criar({
      ano: createTemporadaDto.ano,
      campeonatoId: createTemporadaDto.campeonatoId,
    });
  }

  buscarTodos() {
    return this.temporadaRepo.buscarTodos();
  }
}
