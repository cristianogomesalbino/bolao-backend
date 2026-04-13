import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsuarioRepository } from './usuario.repository.interface';

@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { nome: string; email: string; senha: string; ativo: boolean }) {
    return this.prisma.usuario.create({ data });
  }

  buscarPorId(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  listar(filtros: { ativo: boolean }) {
    return this.prisma.usuario.findMany({ where: { ativo: filtros.ativo } });
  }

  atualizar(id: string, data: Partial<{ nome: string; email: string; senha: string }>) {
    return this.prisma.usuario.update({ where: { id }, data });
  }

  desativar(id: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
