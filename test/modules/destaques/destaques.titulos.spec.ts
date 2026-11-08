import { describe, expect, it } from 'vitest';
import {
  inferirGeneroPorNome,
  pickRandomTitle,
  textoDoTitulo,
} from '../../../src/modules/destaques/destaques.titulos';
import type { DestaqueTitle } from '../../../src/modules/destaques/types/destaque.types';

describe('inferirGeneroPorNome', () => {
  it('trata nomes terminados em a como femininos', () => {
    expect(inferirGeneroPorNome('Maria Silva')).toBe('F');
    expect(inferirGeneroPorNome('Ana')).toBe('F');
    expect(inferirGeneroPorNome('Júlia Costa')).toBe('F');
  });

  it('trata nomes masculinos comuns e default sem a', () => {
    expect(inferirGeneroPorNome('João Pedro')).toBe('M');
    expect(inferirGeneroPorNome('Carlos')).toBe('M');
    expect(inferirGeneroPorNome('Lucca')).toBe('M');
    expect(inferirGeneroPorNome('')).toBe('M');
  });

  it('respeita lista de femininos sem a', () => {
    expect(inferirGeneroPorNome('Inês')).toBe('F');
    expect(inferirGeneroPorNome('Raquel')).toBe('F');
  });
});

describe('textoDoTitulo', () => {
  const titulo: DestaqueTitle = {
    id: 'unico-01',
    title: 'Cagou e cheirou sozinho',
    titleFeminino: 'Cagou e cheirou sozinha',
    emoji: '🦄',
  };

  it('flexiona para feminino quando houver variante', () => {
    expect(textoDoTitulo(titulo, 'F')).toBe('Cagou e cheirou sozinha');
    expect(textoDoTitulo(titulo, 'M')).toBe('Cagou e cheirou sozinho');
  });
});

describe('pickRandomTitle', () => {
  it('retorna forma feminina para gênero F', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const t = pickRandomTitle('UNICO_NA_MOSCA', undefined, [], 'F');
      ids.add(t.id);
      if (t.id === 'unico-01') {
        expect(t.title).toBe('Cagou e cheirou sozinha');
      }
      if (t.id === 'unico-07') {
        expect(t.title).toBe('Todo mundo errou menos ela');
      }
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it('não reutiliza título já usado em qualquer gênero', () => {
    const t = pickRandomTitle(
      'UNICO_NA_MOSCA',
      undefined,
      ['Cagou e cheirou sozinha'],
      'M',
    );
    expect(t.id).not.toBe('unico-01');
  });
});
