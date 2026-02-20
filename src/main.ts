import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new HttpExceptionFilter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map(error => {
          const constraints = error.constraints || {};
      
          const mensagens = Object.values(constraints).map(msg => {
            if (msg.includes('should not exist')) {
              return 'Campo não permitido.';
            }
            return msg;
          });
      
          return {
            campo: error.property,
            mensagens,
          };
        });
      
        return new BadRequestException({
          erros: formattedErrors,
        });
      },
    }),
  );
  
  const config = new DocumentBuilder()
  .setTitle('Bolão API')
  .setDescription('API para gerenciamento de bolões')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'JWT-auth',
  )
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3001);
}

bootstrap();
