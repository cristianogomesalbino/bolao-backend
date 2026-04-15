import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { PalpiteService } from './palpite.service';
import { CriarPalpiteDto } from './dto/criar-palpite.dto';
import { AtualizarPalpiteDto } from './dto/atualizar-palpite.dto';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { GroupRoles } from '../../common/decorators/group-roles.decorator';
import { PALPITES } from './palpites.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import { PalpitePresenter } from '../../common/presenters';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import type { GrupoUsuarioRepository } from '../grupo-usuario/repositories/grupo-usuario.repository.interface';

@ApiTags(PALPITES.TAG)
@Controller()
export class PalpiteController {
  constructor(
    private readonly palpiteService: PalpiteService,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
  ) {}

  @ApiOperation({ summary: 'Criar palpite para um jogo' })
  @ApiResponse({ status: 201, description: 'Palpite criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Jogo não aceita mais palpites.' })
  @ApiConflictResponse({ description: 'Já existe palpite para este jogo.' })
  @ApiNotFoundResponse({ description: 'Jogo não encontrado.' })
  @Post('jogos/:jogoId/palpites')
  async criar(
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
    @Body() dto: CriarPalpiteDto,
    @CurrentUser() user: { id: string },
  ) {
    return PalpitePresenter.toHttp(await this.palpiteService.criar(jogoId, dto, user.id));
  }

  @ApiOperation({ summary: 'Editar palpite' })
  @ApiResponse({ status: 200, description: 'Palpite atualizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Jogo não aceita mais alterações.' })
  @ApiNotFoundResponse({ description: 'Palpite não encontrado.' })
  @Patch('palpites/:id')
  async atualizar(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @Body() dto: AtualizarPalpiteDto,
    @CurrentUser() user: { id: string },
  ) {
    return PalpitePresenter.toHttp(await this.palpiteService.atualizar(id, dto, user.id));
  }

  @ApiOperation({ summary: 'Excluir palpite' })
  @ApiResponse({ status: 200, description: 'Palpite excluído com sucesso.' })
  @ApiBadRequestResponse({ description: 'Jogo não aceita mais alterações.' })
  @ApiNotFoundResponse({ description: 'Palpite não encontrado.' })
  @Delete('palpites/:id')
  async remover(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.palpiteService.remover(id, user.id);
    return { mensagem: PALPITES.MENSAGENS.PALPITE_EXCLUIDO };
  }

  @ApiOperation({ summary: 'Buscar meu palpite por jogo' })
  @ApiResponse({ status: 200, description: 'Palpite encontrado.' })
  @ApiNotFoundResponse({ description: 'Palpite ou jogo não encontrado.' })
  @Get('jogos/:jogoId/meu-palpite')
  async buscarMeuPalpite(
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
    @CurrentUser() user: { id: string },
  ) {
    return PalpitePresenter.toHttp(await this.palpiteService.buscarMeuPalpitePorJogo(jogoId, user.id));
  }

  @ApiOperation({ summary: 'Listar meus palpites' })
  @ApiResponse({ status: 200, description: 'Lista de palpites.' })
  @Get('meus-palpites')
  async listarMeusPalpites(
    @CurrentUser() user: { id: string },
    @Query('temporadaId') temporadaId?: string,
  ) {
    const palpites = await this.palpiteService.listarMeusPalpites(user.id, { temporadaId });
    return palpites.map((p) => PalpitePresenter.toHttp(p));
  }

  @ApiOperation({ summary: 'Listar palpites de um jogo no contexto de grupo' })
  @ApiResponse({ status: 200, description: 'Lista de palpites do grupo.' })
  @ApiNotFoundResponse({ description: 'Jogo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get('grupos/:grupoId/jogos/:jogoId/palpites')
  async listarPorJogoNoGrupo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
    @CurrentUser() user: { id: string },
  ) {
    const membros = await this.grupoUsuarioRepo.listarPorGrupo(grupoId);
    const membrosIds = membros.map((m) => m.usuarioId);
    const palpites = await this.palpiteService.listarPorJogoNoGrupo(jogoId, grupoId, user.id, membrosIds);
    return palpites.map((p) => PalpitePresenter.toHttp(p));
  }
}
