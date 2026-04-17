import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SolicitarRecuperacaoDto } from './dto/solicitar-recuperacao.dto';
import { ResetarSenhaDto } from './dto/resetar-senha.dto';
import { AUTH } from './auth.constants';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags(AUTH.TAG)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ status: 201, description: 'Login realizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Credenciais inválidas.' })
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.senha);
  }

  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Refresh token inválido.' })
  @Public()
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @ApiOperation({ summary: 'Fazer logout' })
  @ApiResponse({ status: 201, description: 'Logout realizado com sucesso.' })
  @Post('logout')
  async logout(@Body() refreshDto: RefreshDto) {
    return this.authService.logout(refreshDto.refreshToken);
  }

  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiResponse({ status: 201, description: 'Instruções enviadas se o email existir.' })
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
}
