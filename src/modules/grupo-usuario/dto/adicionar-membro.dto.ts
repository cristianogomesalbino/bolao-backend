import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdicionarMembroDto {
  @ApiProperty({
    description: 'Email do usuário a ser adicionado',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'email deve ser um endereço de email válido' })
  email: string;
}
