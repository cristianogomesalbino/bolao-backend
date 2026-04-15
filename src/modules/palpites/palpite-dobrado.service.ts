import { Inject, Injectable } from '@nestjs/common';
import { PALPITES } from './palpites.constants';
import { JOGOS } from '../jogos/jogos.constants';
import { GRUPOS } from '../grupos/grupos.constants';
import type { PalpiteDobradoRepository } from './repositories/palpite-dobrado.repository.interface';
import type { JogoRepository } from '../jogos/repositories/jogo.repository.interface';
import type { GrupoRepository } from '../grupos/repositories/grupo.repository.interface';
import { TokenDobroService } from './token-dobro.service';
import { JogoNaoEncontradoError } from '../../common/errors/domain-errors/jogos.errors';
import { GrupoNaoEncontradoError } from '../../common/errors/domain-errors/grupos.errors';
import {
  GrupoNaoPermiteDobroError,
  SemFichasDobroError,
  DobroJaAtivoError,
  DobroNaoEncontradoError,
  JogoNaoAceitaDobroError,
} from '../../common/errors/domain-errors/palpites.errors';

@Injectable()
export class PalpiteDobradoService {
  constructor(
    @Inject(PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN)
    private readonly palpiteDobradoRepo: PalpiteDobradoRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    private readonly tokenDobroService: TokenDobroService,
  ) {}

  async ativarDobro(grupoId: string, jogoId: string, usuarioId: string) {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();
    if (!grupo.palpiteDobradoHabilitado) throw new GrupoNaoPermiteDobroError();

    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();
    if (jogo.status !== 'AGENDADO') throw new JogoNaoAceitaDobroError();

    const existente = await this.palpiteDobradoRepo.buscarPorChave(usuarioId, jogoId, grupoId);
    if (existente) throw new DobroJaAtivoError();

    const saldo = await this.tokenDobroService.calcularSaldo(usuarioId, grupoId);
    if (saldo <= 0) throw new SemFichasDobroError();

    await this.tokenDobroService.registrarUtilizacao(usuarioId, grupoId, jogoId);
    return this.palpiteDobradoRepo.criar({ usuarioId, jogoId, grupoId });
  }

  async desativarDobro(grupoId: string, jogoId: string, usuarioId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();
    if (jogo.status !== 'AGENDADO') throw new JogoNaoAceitaDobroError();

    const existente = await this.palpiteDobradoRepo.buscarPorChave(usuarioId, jogoId, grupoId);
    if (!existente) throw new DobroNaoEncontradoError();

    await this.palpiteDobradoRepo.remover(usuarioId, jogoId, grupoId);
    await this.tokenDobroService.registrarCancelamento(usuarioId, grupoId, jogoId);
  }

  async atualizarConfiguracaoDobro(grupoId: string, habilitado: boolean) {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    return this.grupoRepo.atualizar(grupoId, { palpiteDobradoHabilitado: habilitado });
  }
}
