import { Inject, Injectable } from '@nestjs/common';
import { PALPITES } from '../palpites.constants';
import type { TokenDobroRepository } from '../repositories/token-dobro.repository.interface';

@Injectable()
export class TokenDobroService {
  constructor(
    @Inject(PALPITES.TOKEN_DOBRO_REPOSITORY_TOKEN)
    private readonly tokenDobroRepo: TokenDobroRepository,
  ) {}

  async calcularSaldo(usuarioId: string, grupoId: string) {
    return this.tokenDobroRepo.calcularSaldo(usuarioId, grupoId);
  }

  async listarHistorico(usuarioId: string, grupoId: string) {
    return this.tokenDobroRepo.listarPorUsuarioEGrupo(usuarioId, grupoId);
  }

  async concederToken(
    usuarioId: string,
    grupoId: string,
    motivo: 'PALPITES_COMPLETOS' | 'ACERTO_EM_CHEIO' | 'ULTIMO_RANKING' | 'PRIMEIRO_RANKING',
    referenciaId: string,
  ) {
    return this.tokenDobroRepo.criar({
      usuarioId,
      grupoId,
      tipo: 'CONCESSAO',
      motivo,
      referenciaId,
    });
  }

  async registrarUtilizacao(usuarioId: string, grupoId: string, referenciaId: string) {
    return this.tokenDobroRepo.criar({
      usuarioId,
      grupoId,
      tipo: 'UTILIZACAO',
      motivo: 'ATIVACAO_DOBRO',
      referenciaId,
    });
  }

  async registrarCancelamento(usuarioId: string, grupoId: string, referenciaId: string) {
    return this.tokenDobroRepo.criar({
      usuarioId,
      grupoId,
      tipo: 'CONCESSAO',
      motivo: 'CANCELAMENTO_DOBRO',
      referenciaId,
    });
  }
}
