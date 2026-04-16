import { Inject, Injectable } from '@nestjs/common';
import { CriarFaseDto } from '../dto/criar-fase.dto';
import { JOGOS } from '../jogos.constants';
import { TEMPORADAS } from '../../temporadas/temporadas.constants';
import type { FaseRepository } from '../repositories/fase.repository.interface';
import type { TemporadaRepository } from '../../temporadas/repositories/temporada.repository.interface';
import {
  FaseNaoEncontradaError,
  IdaVoltaNaoPermitidaError,
  TemporadaNaoEncontradaError,
} from '../../../common/errors/domain-errors';

@Injectable()
export class FaseService {
  constructor(
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(TEMPORADAS.REPOSITORY_TOKEN)
    private readonly temporadaRepo: TemporadaRepository,
  ) {}

  async criar(dto: CriarFaseDto & { temporadaId: string }) {
    const temporada = await this.temporadaRepo.buscarPorId(dto.temporadaId);

    if (!temporada) {
      throw new TemporadaNaoEncontradaError();
    }

    if (dto.idaVolta && dto.tipo === 'PONTOS_CORRIDOS') {
      throw new IdaVoltaNaoPermitidaError();
    }

    return this.faseRepo.criar({
      nome: dto.nome,
      tipo: dto.tipo,
      ordem: dto.ordem,
      idaVolta: dto.idaVolta ?? false,
      temporadaId: dto.temporadaId,
    });
  }

  async listar(temporadaId: string) {
    return this.faseRepo.buscarPorTemporada(temporadaId);
  }

  async buscarPorId(id: string) {
    const fase = await this.faseRepo.buscarPorId(id);

    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    return fase;
  }
}
