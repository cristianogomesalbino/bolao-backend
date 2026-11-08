import { Inject, Injectable } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import type { RecordeRepository } from '../repositories/recorde.repository.interface';
import type { CategoriaRecorde, RecordeInfo } from '../types/destaque.types';

@Injectable()
export class DestaqueRecordeService {
  constructor(
    @Inject(DESTAQUES.RECORDE_REPOSITORY_TOKEN)
    private readonly recordeRepo: RecordeRepository,
  ) {}

  async atualizar(
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
}
