import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
    new DomainExceptionFilter(),
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
    .addTag('Autenticação')
    .addTag('Campeonatos')
    .addTag('Grupo - Membros')
    .addTag('Grupos')
    .addTag('Jogos')
    .addTag('Palpites')
    .addTag('Ranking')
    .addTag('Temporadas')
    .addTag('Usuarios')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Aplica autenticação automaticamente em todas as rotas, exceto as públicas
  Object.values(document.paths).forEach((path: any) => {
    Object.values(path).forEach((operation: any) => {
      if (operation.tags) {
        const isPublic = operation['x-public'] === true;
        if (!isPublic) {
          operation.security = [{ 'JWT-auth': [] }];
        }
      }
    });
  });

  const isDev = process.env.NODE_ENV !== 'production';

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { defaultModelsExpandDepth: -1 },
    customJsStr: isDev
      ? `
      (function() {
        var modalHtml =
          '<div id="sw-modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;justify-content:center;align-items:center">' +
            '<div style="background:#fff;border-radius:8px;padding:24px 32px;min-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
              '<h3 style="margin:0 0 20px;font-size:18px;color:#333">&#128274; Login</h3>' +
              '<div style="margin-bottom:14px">' +
                '<label style="display:block;font-size:13px;font-weight:bold;margin-bottom:4px;color:#555">Email</label>' +
                '<input id="sw-modal-email" type="email" placeholder="usuario@email.com" style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:4px;font-size:14px;box-sizing:border-box" />' +
              '</div>' +
              '<div style="margin-bottom:14px">' +
                '<label style="display:block;font-size:13px;font-weight:bold;margin-bottom:4px;color:#555">Senha</label>' +
                '<input id="sw-modal-senha" type="password" placeholder="senha123" style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:4px;font-size:14px;box-sizing:border-box" />' +
              '</div>' +
              '<div id="sw-modal-msg" style="font-size:12px;min-height:18px;margin-bottom:10px"></div>' +
              '<div style="display:flex;justify-content:flex-end;gap:8px">' +
                '<button id="sw-modal-cancel" style="padding:8px 16px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;color:#333;font-size:13px;cursor:pointer">Cancelar</button>' +
                '<button id="sw-modal-submit" style="padding:8px 16px;border:none;border-radius:4px;background:#49cc90;color:#fff;font-weight:bold;font-size:13px;cursor:pointer">Entrar</button>' +
              '</div>' +
            '</div>' +
          '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var overlay = document.getElementById('sw-modal-overlay');
        var msg = document.getElementById('sw-modal-msg');

        function showModal() {
          document.getElementById('sw-modal-email').value = '';
          document.getElementById('sw-modal-senha').value = '';
          msg.textContent = '';
          overlay.style.display = 'flex';
          setTimeout(function() { document.getElementById('sw-modal-email').focus(); }, 100);
        }

        function hideModal() { overlay.style.display = 'none'; }

        overlay.addEventListener('click', function(e) { if (e.target === overlay) hideModal(); });
        document.getElementById('sw-modal-cancel').addEventListener('click', hideModal);

        async function doLogin() {
          var email = document.getElementById('sw-modal-email').value;
          var senha = document.getElementById('sw-modal-senha').value;
          if (!email || !senha) { msg.textContent = 'Preencha email e senha'; msg.style.color = '#f93e3e'; return; }
          msg.textContent = 'Entrando...'; msg.style.color = '#999';
          try {
            var res = await fetch('/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, senha: senha })
            });
            var data = await res.json();
            if (!res.ok) {
              msg.textContent = (data.erros && data.erros[0] && data.erros[0].mensagens && data.erros[0].mensagens[0]) || 'Erro no login';
              msg.style.color = '#f93e3e';
              return;
            }
            window.ui.preauthorizeApiKey('JWT-auth', data.accessToken);
            hideModal();
          } catch (e) { msg.textContent = 'Erro de conexão'; msg.style.color = '#f93e3e'; }
        }

        document.getElementById('sw-modal-submit').addEventListener('click', doLogin);
        document.getElementById('sw-modal-senha').addEventListener('keydown', function(e) {
          if (e.key === 'Enter') doLogin();
        });

        var interval = setInterval(function() {
          var btn = document.querySelector('.btn.authorize');
          if (!btn) return;
          clearInterval(interval);
          btn.addEventListener('click', function(e) {
            e.stopImmediatePropagation();
            e.preventDefault();
            showModal();
          }, true);
        }, 300);
      })();
      `
      : undefined,
  });

  await app.listen(3002);
}

bootstrap();
