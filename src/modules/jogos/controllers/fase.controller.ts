import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FaseService } from '../services/fase.service';
import { CriarFaseDto } from '../dto/criar-fase.dto';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { JOGOS } from '../jogos.constants';
import { FasePresenter } from '../../../common/presenters';

@ApiTags(JOGOS.TAG)
@Controller('temporadas/:temporadaId/fases')
export class FaseController {
  constructor(private readonly faseService: FaseService) {}

  @ApiOperation({ summary: 'Criar uma nova fase na temporada' })
  @ApiResponse({ status: 201, description: 'Fase criada com sucesso' })
  @ApiResponse({ status: 404, description: 'Temporada não encontrada' })
  @Post()
  async criar(
    @Param('temporadaId', new ParseUUIDCustomPipe('temporadaId'))
    temporadaId: string,
    @Body() dto: CriarFaseDto,
  ) {
    return FasePresenter.toHttp(
      await this.faseService.criar({ ...dto, temporadaId }),
    );
  }

  @ApiOperation({ summary: 'Listar fases de uma temporada' })
  @ApiResponse({ status: 200, description: 'Lista de fases' })
  @Get()
  async listar(
    @Param('temporadaId', new ParseUUIDCustomPipe('temporadaId'))
    temporadaId: string,
  ) {
    const fases = await this.faseService.listar(temporadaId);
    return fases.map((f) => FasePresenter.toHttp(f));
  }

  @ApiOperation({ summary: 'Buscar fase por ID' })
  @ApiResponse({ status: 200, description: 'Fase encontrada' })
  @ApiResponse({ status: 404, description: 'Fase não encontrada' })
  @Get(':id')
  async buscarPorId(@Param('id', new ParseUUIDCustomPipe('id')) id: string) {
    return FasePresenter.toHttp(await this.faseService.buscarPorId(id));
  }
}
