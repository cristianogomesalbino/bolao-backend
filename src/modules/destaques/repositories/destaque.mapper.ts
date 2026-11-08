import type { Destaque as DestaquePrisma, Prisma } from '@prisma/client';
import type { TipoDestaque } from '../types/destaque.types';
import type { Destaque } from './destaque.repository.interface';

const TIPOS_DESTAQUE = new Set<string>([
  'ACERTOU_EM_CHEIO',
  'UNICO_NA_MOSCA',
  'SUBIU_RANKING',
  'SEQUENCIA_MOSCA',
  'SEQUENCIA_RESULTADO',
  'NAO_PALPITOU',
  'DOBROU_E_ACERTOU',
]);

export type DestaqueRow = Pick<
  DestaquePrisma,
  | 'id'
  | 'grupoId'
  | 'usuarioId'
  | 'jogoId'
  | 'rodada'
  | 'tipo'
  | 'dados'
  | 'titulo'
  | 'contadorFs'
  | 'criadoEm'
>;

export function mapearDestaque(destaque: DestaqueRow): Destaque {
  return {
    id: destaque.id,
    grupoId: destaque.grupoId,
    usuarioId: destaque.usuarioId,
    jogoId: destaque.jogoId,
    rodada: destaque.rodada,
    tipo: paraTipoDestaque(destaque.tipo),
    dados: paraDados(destaque.dados),
    titulo: destaque.titulo,
    contadorFs: destaque.contadorFs,
    criadoEm: destaque.criadoEm,
  };
}

function paraTipoDestaque(tipo: string): TipoDestaque {
  if (!TIPOS_DESTAQUE.has(tipo)) {
    throw new Error(`Tipo de destaque inválido: ${tipo}`);
  }
  return tipo as TipoDestaque;
}

function paraDados(dados: Prisma.JsonValue): Record<string, unknown> {
  if (dados !== null && typeof dados === 'object' && !Array.isArray(dados)) {
    return dados as Record<string, unknown>;
  }
  return {};
}
