import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SolicitarRecuperacaoDto } from './dto/solicitar-recuperacao.dto';
import { ResetarSenhaDto } from './dto/resetar-senha.dto';
import { AUTH } from './auth.constants';
import { Public } from '../../common/decorators/public.decorator';
import { RefreshNaoFornecidoError } from '../../common/errors/domain-errors';

@ApiTags(AUTH.TAG)
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ status: 201, description: 'Login realizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Credenciais inválidas.' })
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      loginDto.email,
      loginDto.senha,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken };
  }

  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 201, description: 'Token renovado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Refresh token inválido.' })
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[AUTH.COOKIE.REFRESH_TOKEN_NAME];

    if (!refreshToken) {
      throw new RefreshNaoFornecidoError();
    }

    const { accessToken } = await this.authService.refresh(refreshToken);

    return { accessToken };
  }

  @ApiOperation({ summary: 'Fazer logout' })
  @ApiResponse({ status: 201, description: 'Logout realizado com sucesso.' })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[AUTH.COOKIE.REFRESH_TOKEN_NAME];

    if (!refreshToken) {
      throw new RefreshNaoFornecidoError();
    }

    const result = await this.authService.logout(refreshToken);

    this.clearRefreshTokenCookie(res);

    return result;
  }

  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiResponse({
    status: 201,
    description: 'Instruções enviadas se o email existir.',
  })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @Public()
  @Post('esqueci-senha')
  async esqueciSenha(@Body() dto: SolicitarRecuperacaoDto) {
    return this.authService.solicitarRecuperacao(dto.email);
  }

  @ApiOperation({ summary: 'Resetar senha com token de recuperação' })
  @ApiResponse({ status: 201, description: 'Senha alterada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Token inválido ou expirado.' })
  @Public()
  @Post('resetar-senha')
  async resetarSenha(@Body() dto: ResetarSenhaDto) {
    return this.authService.resetarSenha(dto.token, dto.novaSenha);
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(AUTH.COOKIE.REFRESH_TOKEN_NAME, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: AUTH.TOKEN.REFRESH_EXPIRATION_MS,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(AUTH.COOKIE.REFRESH_TOKEN_NAME, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      path: '/',
    });
  }
}
