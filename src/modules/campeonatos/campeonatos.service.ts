import { Inject, Injectable } from '@nestjs/common';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';
import { CAMPEONATOS } from './campeonatos.constants';
import type { CampeonatoRepository } from './repositories/campeonato.repository.interface';

@Injectable()
export class CampeonatosService {
  constructor(
    @Inject(CAMPEONATOS.REPOSITORY_TOKEN)
    private readonly campeonatoRepo: CampeonatoRepository,
  ) {}

  criar(createCampeonatoDto: CreateCampeonatoDto) {
    return this.campeonatoRepo.criar({ nome: createCampeonatoDto.nome });
  }

  buscarTodos() {
    return this.campeonatoRepo.buscarTodos();
  }
}
