import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  CredenciaisInvalidasError,
  RefreshNaoFornecidoError,
  RefreshInvalidoError,
  RefreshExpiradoError,
  TokenRecuperacaoInvalidoError,
  TokenRecuperacaoExpiradoError,
} from '../../common/errors/domain-errors';
import { UsuarioNaoEncontradoError } from '../../common/errors/domain-errors/usuarios.errors';
import { AUTH } from './auth.constants';
import { USUARIOS } from '../usuarios/usuarios.constants';
import {
  emitirAccessToken,
  emitirNovoRefresh,
  emitirRefreshToken,
  lembrarDoPayload,
} from './sessao-token';
import type { EmailService } from './email/email.service.interface';
import type { UsuarioRepository } from '../usuarios/repositories/usuario.repository.interface';
import type { RefreshTokenRepository } from './repositories/refresh-token.repository.interface';
import type { RecuperacaoSenhaRepository } from './repositories/recuperacao-senha.repository.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIOS.REPOSITORY_TOKEN)
    private readonly usuarioRepo: UsuarioRepository,
    @Inject(AUTH.REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(AUTH.RECUPERACAO_SENHA_REPOSITORY_TOKEN)
    private readonly recuperacaoSenhaRepo: RecuperacaoSenhaRepository,
    private readonly jwtService: JwtService,
    @Inject(AUTH.EMAIL_SERVICE_TOKEN)
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, senha: string, continuarLogado = false) {
    const usuario = await this.usuarioRepo.buscarPorEmail(email);

    if (!usuario || !usuario.ativo) {
      throw new CredenciaisInvalidasError();
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new CredenciaisInvalidasError();
    }

    await this.refreshTokenRepo.removerPorUsuarioId(usuario.id);

    const accessToken = emitirAccessToken(this.jwtService, usuario);
    const { refreshToken, expiraEm } = emitirRefreshToken(
      this.jwtService,
      usuario,
      continuarLogado,
    );

    await this.refreshTokenRepo.criar({
      token: refreshToken,
      usuarioId: usuario.id,
      expiraEm,
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const sessao = await this.carregarSessao(refreshToken);
    const accessToken = emitirAccessToken(this.jwtService, sessao.usuario);

    if (!sessao.continuarLogado) {
      return { accessToken, refreshToken, continuarLogado: false };
    }

    return this.renovarSessaoPersistente(
      refreshToken,
      sessao.usuario,
      accessToken,
    );
  }

  private async carregarSessao(refreshToken: string) {
    if (!refreshToken) {
      throw new RefreshNaoFornecidoError();
    }

    const tokenRegistro =
      await this.refreshTokenRepo.buscarPorToken(refreshToken);

    if (!tokenRegistro) {
      throw new RefreshInvalidoError();
    }

    const continuarLogado = this.lerLembrar(tokenRegistro.token);
    const usuario = await this.usuarioRepo.buscarPorId(tokenRegistro.usuarioId);

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    if (!usuario.ativo) {
      await this.refreshTokenRepo.removerPorUsuarioId(usuario.id);
      throw new RefreshInvalidoError();
    }

    return { usuario, continuarLogado };
  }

  private lerLembrar(token: string): boolean {
    try {
      return lembrarDoPayload(this.jwtService.verify(token));
    } catch {
      throw new RefreshExpiradoError();
    }
  }

  private async renovarSessaoPersistente(
    refreshToken: string,
    usuario: { id: string; email: string; perfil: string },
    accessToken: string,
  ) {
    const rotacao = await this.refreshTokenRepo.rotacionar(
      refreshToken,
      AUTH.TOKEN.REFRESH_REUSO_MS,
      () => emitirNovoRefresh(this.jwtService, usuario),
    );

    if (!rotacao) {
      throw new RefreshInvalidoError();
    }

    return {
      accessToken,
      refreshToken: rotacao.refreshToken,
      continuarLogado: true,
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new RefreshNaoFornecidoError();
    }

    await this.refreshTokenRepo.removerPorToken(refreshToken);

    return { mensagem: AUTH.MENSAGENS.LOGOUT_SUCESSO };
  }

  async solicitarRecuperacao(email: string) {
    const usuario = await this.usuarioRepo.buscarPorEmail(email);

    if (usuario && usuario.ativo) {
      await this.recuperacaoSenhaRepo.invalidarPorUsuarioId(usuario.id);

      const token = randomUUID();
      const expiraEm = new Date(
        Date.now() + AUTH.TOKEN.RECUPERACAO_EXPIRATION_MS,
      );

      await this.recuperacaoSenhaRepo.criar({
        token,
        usuarioId: usuario.id,
        expiraEm,
      });

      await this.emailService.enviarRecuperacaoSenha(email, token);
    }

    return { mensagem: AUTH.MENSAGENS.RECUPERACAO_EMAIL_ENVIADO };
  }

  async resetarSenha(token: string, novaSenha: string) {
    const recuperacao = await this.recuperacaoSenhaRepo.buscarPorToken(token);

    if (!recuperacao || recuperacao.usado) {
      throw new TokenRecuperacaoInvalidoError();
    }

    if (recuperacao.expiraEm < new Date()) {
      throw new TokenRecuperacaoExpiradoError();
    }

    const senhaHash = await bcrypt.hash(novaSenha, AUTH.BCRYPT_ROUNDS);

    await this.usuarioRepo.atualizar(recuperacao.usuarioId, {
      senha: senhaHash,
    });
    await this.recuperacaoSenhaRepo.marcarComoUsado(recuperacao.id);
    await this.refreshTokenRepo.removerPorUsuarioId(recuperacao.usuarioId);

    return { mensagem: AUTH.MENSAGENS.SENHA_RESETADA };
  }
}
