import { describe, it, expect, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '@src/modules/auth/jwt.strategy';

describe('JwtStrategy', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'segredo-de-teste';
  });

  it('aceita access token sem tipo de refresh', () => {
    const strategy = new JwtStrategy();

    expect(strategy.validate({ sub: 'user-1', perfil: 'USER' })).toEqual({
      id: 'user-1',
      perfil: 'USER',
    });
  });

  it('recusa refresh token usado como access token', () => {
    const strategy = new JwtStrategy();

    expect(() =>
      strategy.validate({ sub: 'user-1', perfil: 'USER', tipo: 'refresh' }),
    ).toThrow(UnauthorizedException);
  });
});
