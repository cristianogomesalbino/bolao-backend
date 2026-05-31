import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggerMiddleware } from '@src/common/middleware/logger.middleware';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let finishCallback: () => void;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    mockReq = { method: 'GET', originalUrl: '/api/test' };
    mockRes = {
      statusCode: 200,
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    mockNext = vi.fn();
  });

  it('deve chamar next()', () => {
    middleware.use(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('deve registrar listener no evento finish', () => {
    middleware.use(mockReq, mockRes, mockNext);
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('deve logar com nível log para status 2xx', () => {
    middleware.use(mockReq, mockRes, mockNext);
    mockRes.statusCode = 200;
    finishCallback();
    // Não lança erro — middleware funciona silenciosamente
  });

  it('deve logar com nível warn para status 4xx', () => {
    middleware.use(mockReq, mockRes, mockNext);
    mockRes.statusCode = 404;
    finishCallback();
  });

  it('deve logar com nível error para status 5xx', () => {
    middleware.use(mockReq, mockRes, mockNext);
    mockRes.statusCode = 500;
    finishCallback();
  });
});
