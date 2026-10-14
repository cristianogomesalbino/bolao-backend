import { JwtService } from '@nestjs/jwt';
import { AUTH } from './auth.constants';

export interface IdentidadeSessao {
  id: string;
  email: string;
  perfil: string;
}

export function lembrarDoPayload(decoded: unknown): boolean {
  if (typeof decoded !== 'object' || decoded === null) {
    return false;
  }
  if (!('lembrar' in decoded)) {
    return false;
  }
  return decoded.lembrar === true;
}

export function emitirAccessToken(
  jwt: JwtService,
  usuario: IdentidadeSessao,
): string {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, perfil: usuario.perfil },
    { expiresIn: AUTH.TOKEN.ACCESS_EXPIRATION },
  );
}

export function emitirRefreshToken(
  jwt: JwtService,
  usuario: IdentidadeSessao,
  continuarLogado: boolean,
) {
  const refreshExpiraEm = continuarLogado
    ? AUTH.TOKEN.REFRESH_LEMBRAR
    : AUTH.TOKEN.REFRESH_EXPIRATION;
  const refreshExpiraMs = continuarLogado
    ? AUTH.TOKEN.REFRESH_LEMBRAR_MS
    : AUTH.TOKEN.REFRESH_EXPIRATION_MS;

  const refreshToken = jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      lembrar: continuarLogado,
      tipo: AUTH.TOKEN.TIPO_REFRESH,
    },
    { expiresIn: refreshExpiraEm },
  );

  return {
    refreshToken,
    expiraEm: new Date(Date.now() + refreshExpiraMs),
  };
}

export function emitirNovoRefresh(jwt: JwtService, usuario: IdentidadeSessao) {
  const emitido = emitirRefreshToken(jwt, usuario, true);

  return {
    token: emitido.refreshToken,
    usuarioId: usuario.id,
    expiraEm: emitido.expiraEm,
  };
}
