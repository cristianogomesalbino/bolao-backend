import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  private static readonly ROTAS_IGNORADAS = ['/health', '/favicon.ico'];

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;

    if (LoggerMiddleware.ROTAS_IGNORADAS.includes(originalUrl)) {
      next();
      return;
    }

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
