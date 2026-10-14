import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorFactory } from '../../common/errors/error.factory';
import { AUTH } from './auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  validate(payload: { sub: string; perfil: string; tipo?: string }) {
    if (payload.tipo === AUTH.TOKEN.TIPO_REFRESH) {
      throw ErrorFactory.unauthorized(AUTH.MENSAGENS.REFRESH_INVALIDO);
    }

    return {
      id: payload.sub,
      perfil: payload.perfil,
    };
  }
}
