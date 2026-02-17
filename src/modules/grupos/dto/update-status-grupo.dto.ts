import { IsDefined, IsBoolean } from 'class-validator';

export class UpdateStatusGrupoDto {

    @IsDefined({ message: 'O campo é obrigatório.' })
    @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
    ativo: boolean;
  }
  