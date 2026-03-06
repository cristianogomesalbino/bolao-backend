import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
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

        const formatErrors = (validationErrors) => {
          return validationErrors.flatMap((error) => {

            if (error.children?.length) {
              return formatErrors(error.children);
            }

            return {
              campo: error.property,
              mensagens: Object.values(error.constraints ?? {}),
            };
          });
        };

        return new BadRequestException({
          erros: formatErrors(errors),
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

  // Remove a seção de schemas
  delete document.components?.schemas;

  SwaggerModule.setup('docs', app, document);

  await app.listen(3002);
}

bootstrap();
