import { UsuarioRepository } from './usuario.repository.interface';

export class InMemoryUsuarioRepository implements UsuarioRepository {
  items: any[] = [];

  async criar(data: {
    nome: string;
    email: string;
    senha: string;
    ativo: boolean;
  }) {
    const usuario = {
      id: crypto.randomUUID(),
      nome: data.nome,
      email: data.email,
      senha: data.senha,
      perfil: 'USER',
      ativo: data.ativo,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(usuario);
    return usuario;
  }

  async buscarPorId(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }

  async buscarPorEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }

  async listar(filtros: { ativo: boolean }) {
    return this.items.filter((u) => u.ativo === filtros.ativo);
  }

  async atualizar(
    id: string,
    data: Partial<{
      nome: string;
      email: string;
      senha: string;
      grupoFavoritoId: string | null;
    }>,
  ) {
    const index = this.items.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.items[index] = {
      ...this.items[index],
      ...data,
      atualizadoEm: new Date(),
    };
    return this.items[index];
  }

  async desativar(id: string) {
    const index = this.items.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.items[index] = {
      ...this.items[index],
      ativo: false,
      atualizadoEm: new Date(),
    };
    return this.items[index];
  }
}
