import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JogoService } from '../services/jogo.service';
import { CriarJogoDto } from '../dto/criar-jogo.dto';
import { AtualizarJogoDto } from '../dto/atualizar-jogo.dto';
import { FinalizarJogoDto } from '../dto/finalizar-jogo.dto';
import { ImportarJogosDto } from '../dto/importar-jogos.dto';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JOGOS } from '../jogos.constants';
import { JogoPresenter } from '../../../common/presenters';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';

@ApiTags(JOGOS.TAG)
@Controller()
export class JogoController {
  constructor(private readonly jogoService: JogoService) {}

  @ApiOperation({ summary: 'Criar um novo jogo na fase' })
  @ApiResponse({ status: 201, description: 'Jogo criado com sucesso' })
  @Post('fases/:faseId/jogos')
  async criar(
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
    @Body() dto: CriarJogoDto,
    @CurrentUser() user: { id: string },
  ) {
    return JogoPresenter.toHttp(
      await this.jogoService.criar({ ...dto, faseId }, user.id),
    );
  }

  @ApiOperation({ summary: 'Atualizar dados de um jogo' })
  @ApiResponse({ status: 200, description: 'Jogo atualizado com sucesso' })
  @Patch('jogos/:id')
  async atualizar(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @Body() dto: AtualizarJogoDto,
  ) {
    return JogoPresenter.toHttp(await this.jogoService.atualizar(id, dto));
  }

  @ApiOperation({ summary: 'Finalizar um jogo com placar' })
  @ApiResponse({ status: 200, description: 'Jogo finalizado com sucesso' })
  @Patch('jogos/:id/finalizar')
  async finalizar(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @Body() dto: FinalizarJogoDto,
  ) {
    return JogoPresenter.toHttp(await this.jogoService.finalizar(id, dto));
  }

  @ApiOperation({ summary: 'Listar jogos de uma fase' })
  @ApiResponse({ status: 200, description: 'Lista de jogos' })
  @Get('fases/:faseId/jogos')
  async listar(
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
  ) {
    const { fase, jogos } = await this.jogoService.buscarPorFaseComDetalhes(faseId);
    return {
      fase: { id: fase.id, nome: fase.nome, tipo: fase.tipo, ordem: fase.ordem },
      jogos: jogos.map((j) => JogoPresenter.toHttp(j, fase.tipo)),
    };
  }

  @ApiOperation({ summary: 'Buscar jogo por ID' })
  @ApiResponse({ status: 200, description: 'Jogo encontrado' })
  @Get('jogos/:id')
  async buscarPorId(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    const jogo = await this.jogoService.buscarPorId(id);
    return JogoPresenter.toHttp(jogo, jogo.fase?.tipo);
  }

  @ApiOperation({ summary: 'Importar jogos da API externa (SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Jogos importados com sucesso' })
  @UseGuards(SuperAdminGuard)
  @Post('jogos/importar')
  async importar(
    @Body() dto: ImportarJogosDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.jogoService.importarJogos(
      dto.season,
      dto.rodada,
      dto.faseId,
      user.id,
    );
  }

  @ApiOperation({ summary: 'Sincronizar placares via API externa (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Placares sincronizados com sucesso' })
  @UseGuards(SuperAdminGuard)
  @Post('fases/:faseId/jogos/sincronizar')
  async sincronizar(
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
  ) {
    return this.jogoService.sincronizarPlacares(faseId);
  }

  @ApiOperation({ summary: 'Resetar fonte de resultado para API_EXTERNA' })
  @ApiResponse({ status: 200, description: 'Fonte resetada com sucesso' })
  @Patch('jogos/:id/resetar-fonte')
  async resetarFonte(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    return JogoPresenter.toHttp(await this.jogoService.resetarFonte(id));
  }
}
