import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import type {
  PreferenciaRepository,
  PreferenciaCampos,
  PreferenciaNotificacao,
} from '../repositories/preferencia.repository.interface';

const TIPO_PARA_CAMPO: Record<string, keyof PreferenciaCampos> = {
  JOGO_PROXIMO: 'jogoProximo',
  RODADA_ENCERRADA: 'rodadaEncerrada',
  ACERTO_EM_CHEIO: 'acertoEmCheio',
  SUBIU_POSICAO: 'subiuPosicao',
  DESCEU_POSICAO: 'desceuPosicao',
  PALPITES_PENDENTES: 'palpitesPendentes',
  JOGO_LIBERADO: 'jogoLiberado',
};

@Injectable()
export class PreferenciaService {
  constructor(
    @Inject(NOTIFICACOES.PREFERENCIA_REPOSITORY_TOKEN)
    private readonly preferenciaRepo: PreferenciaRepository,
  ) {}

  async buscar(usuarioId: string): Promise<PreferenciaNotificacao> {
    const preferencia = await this.preferenciaRepo.buscarPorUsuario(usuarioId);
    if (preferencia) return preferencia;

    return this.preferenciaRepo.criar(usuarioId);
  }

  async atualizar(
    usuarioId: string,
    dados: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao> {
    return this.preferenciaRepo.atualizar(usuarioId, dados);
  }

  async estaHabilitado(usuarioId: string, tipo: string): Promise<boolean> {
    const campo = TIPO_PARA_CAMPO[tipo];
    if (!campo) return true;

    const preferencia = await this.preferenciaRepo.buscarPorUsuario(usuarioId);
    if (!preferencia) return true;

    return preferencia[campo];
  }

  async filtrarUsuariosHabilitados(
    usuarioIds: string[],
    tipo: string,
  ): Promise<string[]> {
    if (usuarioIds.length === 0) return [];

    const campo = TIPO_PARA_CAMPO[tipo];
    if (!campo) return usuarioIds;

    const preferencias =
      await this.preferenciaRepo.buscarPorUsuarios(usuarioIds);

    const prefMap = new Map(preferencias.map((p) => [p.usuarioId, p]));

    return usuarioIds.filter((id) => {
      const pref = prefMap.get(id);
      if (!pref) return true;
      return pref[campo];
    });
  }
}
