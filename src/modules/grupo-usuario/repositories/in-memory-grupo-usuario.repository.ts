import { GrupoUsuarioRepository } from './grupo-usuario.repository.interface';

export class InMemoryGrupoUsuarioRepository implements GrupoUsuarioRepository {
  items: any[] = [];
  usuarios: any[] = [];
  grupos: any[] = [];

  async criar(data: { usuarioId: string; grupoId: string; role: string }, include?: any) {
    const grupoUsuario: any = {
      usuarioId: data.usuarioId,
      grupoId: data.grupoId,
      role: data.role,
      dataCriacao: new Date(),
    };
    this.items.push(grupoUsuario);

    const result = { ...grupoUsuario };

    if (include?.grupo) {
      const grupo = this.grupos.find((g) => g.id === data.grupoId);
      result.grupo = grupo ? { id: grupo.id, nome: grupo.nome } : null;
    }

    if (include?.usuario) {
      const usuario = this.usuarios.find((u) => u.id === data.usuarioId);
      result.usuario = usuario
        ? { id: usuario.id, nome: usuario.nome, ...(usuario.email ? { email: usuario.email } : {}) }
        : null;
    }

    return result;
  }

  async buscarPorChave(usuarioId: string, grupoId: string) {
    return this.items.find(
      (gu) => gu.usuarioId === usuarioId && gu.grupoId === grupoId,
    ) ?? null;
  }

  async listarPorGrupo(grupoId: string) {
    return this.items
      .filter((gu) => gu.grupoId === grupoId)
      .map((gu) => {
        const usuario = this.usuarios.find((u) => u.id === gu.usuarioId);
        return {
          role: gu.role,
          usuario: { id: gu.usuarioId, nome: usuario?.nome ?? 'Usuário' },
        };
      });
  }

  async contarPorGrupo(grupoId: string) {
    return this.items.filter((gu) => gu.grupoId === grupoId).length;
  }

  async contarAdminsPorGrupo(grupoId: string) {
    return this.items.filter(
      (gu) => gu.grupoId === grupoId && gu.role === 'ADMIN',
    ).length;
  }

  async remover(usuarioId: string, grupoId: string) {
    const index = this.items.findIndex(
      (gu) => gu.usuarioId === usuarioId && gu.grupoId === grupoId,
    );
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }
}
