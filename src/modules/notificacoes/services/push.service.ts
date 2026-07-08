import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { NOTIFICACOES } from '../notificacoes.constants';
import {
  LimiteInscricoesPushError,
  InscricaoPushNaoEncontradaError,
} from '../../../common/errors/domain-errors/notificacoes.errors';
import type {
  InscricaoPushRepository,
  InscricaoPush,
} from '../repositories/inscricao-push.repository.interface';
import { PreferenciaService } from './preferencia.service';

export interface PushPayload {
  titulo: string;
  mensagem: string;
  tipo: string;
  url?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private pushHabilitado = false;

  constructor(
    @Inject(NOTIFICACOES.INSCRICAO_PUSH_REPOSITORY_TOKEN)
    private readonly inscricaoRepo: InscricaoPushRepository,
    private readonly preferenciaService: PreferenciaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys não configuradas — Web Push desabilitado');
      return;
    }

    webpush.setVapidDetails(
      subject || 'mailto:contato@bolao.app',
      publicKey,
      privateKey,
    );
    this.pushHabilitado = true;
    this.logger.log('Web Push configurado com sucesso');
  }

  async inscrever(
    usuarioId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ): Promise<void> {
    const existente = await this.inscricaoRepo.buscarPorEndpoint(
      usuarioId,
      endpoint,
    );

    if (existente) {
      await this.inscricaoRepo.atualizar(usuarioId, endpoint, { p256dh, auth });
      return;
    }

    const totalInscricoes =
      await this.inscricaoRepo.contarPorUsuario(usuarioId);
    if (totalInscricoes >= NOTIFICACOES.LIMITES.INSCRICOES_POR_USUARIO) {
      throw new LimiteInscricoesPushError();
    }

    await this.inscricaoRepo.criar({ usuarioId, endpoint, p256dh, auth });
  }

  async cancelar(usuarioId: string, endpoint: string): Promise<void> {
    const existente = await this.inscricaoRepo.buscarPorEndpoint(
      usuarioId,
      endpoint,
    );

    if (!existente) {
      throw new InscricaoPushNaoEncontradaError();
    }

    await this.inscricaoRepo.remover(usuarioId, endpoint);
  }

  async enviarParaUsuario(
    usuarioId: string,
    payload: PushPayload,
  ): Promise<void> {
    if (!this.pushHabilitado) return;

    const habilitado = await this.preferenciaService.estaHabilitado(
      usuarioId,
      payload.tipo,
    );
    if (!habilitado) return;

    const inscricoes = await this.inscricaoRepo.buscarPorUsuario(usuarioId);
    if (inscricoes.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.titulo.substring(0, NOTIFICACOES.LIMITES.PUSH_TITULO_MAX),
      body: payload.mensagem.substring(
        0,
        NOTIFICACOES.LIMITES.PUSH_MENSAGEM_MAX,
      ),
      type: payload.tipo,
      url: payload.url,
    });

    await Promise.allSettled(
      inscricoes.map((inscricao) => this.enviarPush(inscricao, pushPayload)),
    );
  }

  async enviarParaUsuarios(
    usuarioIds: string[],
    payload: PushPayload,
  ): Promise<void> {
    if (!this.pushHabilitado) return;
    if (usuarioIds.length === 0) return;

    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        usuarioIds,
        payload.tipo,
      );

    await Promise.allSettled(
      habilitados.map((id) => this.enviarParaUsuario(id, payload)),
    );
  }

  private async enviarPush(
    inscricao: InscricaoPush,
    payload: string,
  ): Promise<void> {
    const subscription = {
      endpoint: inscricao.endpoint,
      keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
    };

    try {
      await webpush.sendNotification(subscription, payload, { timeout: 5000 });
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;

      if (statusCode === 404 || statusCode === 410) {
        this.logger.warn(
          `Inscrição push inválida (${statusCode}) — removendo: ${inscricao.id}`,
        );
        await this.inscricaoRepo.removerPorId(inscricao.id);
        return;
      }

      this.logger.warn(
        `Falha ao enviar push para ${inscricao.id}: ${(error as Error).message}`,
      );
    }
  }
}
