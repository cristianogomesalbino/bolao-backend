import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Post()
  create(@Body() createGrupoDto: CreateGrupoDto) {
    return this.gruposService.create(createGrupoDto);
  }

  @Get()
  findAll() {
    return this.gruposService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gruposService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGrupoDto: UpdateGrupoDto) {
    return this.gruposService.update(id, updateGrupoDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDCustomPipe('id'))
  id: string,
    @Body() dto: UpdateStatusGrupoDto,
  ) {
    return this.gruposService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDCustomPipe('id'))
    id: string,
  ) {
    return this.gruposService.remove(id);
  }

  }
