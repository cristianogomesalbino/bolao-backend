import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RecuperacaoSenhaRepository } from './recuperacao-senha.repository.interface';

@Injectable()
export class PrismaRecuperacaoSenhaRepository implements RecuperacaoSenhaRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { token: string; usuarioId: string; expiraEm: Date }) {
    return this.prisma.recuperacaoSenha.create({ data });
  }

  buscarPorToken(token: string) {
    return this.prisma.recuperacaoSenha.findUnique({ where: { token } });
  }

  async invalidarPorUsuarioId(usuarioId: string) {
    await this.prisma.recuperacaoSenha.updateMany({
      where: { usuarioId, usado: false },
      data: { usado: true },
    });
  }

  async marcarComoUsado(id: string) {
    await this.prisma.recuperacaoSenha.update({
      where: { id },
      data: { usado: true },
    });
  }
}
