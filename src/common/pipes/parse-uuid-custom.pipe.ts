import {
    PipeTransform,
    Injectable,
    BadRequestException,
  } from '@nestjs/common';
  
  @Injectable()
  export class ParseUUIDCustomPipe implements PipeTransform<string> {
    constructor(private readonly campo: string) {}
  
    transform(value: string): string {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
      if (!uuidRegex.test(value)) {
        throw new BadRequestException({
          erros: [
            {
              campo: this.campo,
              mensagens: ['Deve ser um UUID válido.'],
            },
          ],
        });
      }
  
      return value;
    }
  }
  