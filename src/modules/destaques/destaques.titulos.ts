import { randomInt } from 'node:crypto';
import type {
  TipoDestaque,
  DestaqueTitle,
  GeneroTitulo,
} from './types/destaque.types';

type TipoComTitulo = Exclude<TipoDestaque, 'SEQUENCIA_MOSCA'>;

export const DESTAQUE_TITULOS: Record<TipoComTitulo, DestaqueTitle[]> = {
  ACERTOU_EM_CHEIO: [
    { id: 'cheio-01', title: 'Cravou!', emoji: '🎯' },
    { id: 'cheio-02', title: 'Na mosca!', emoji: '🎯' },
    { id: 'cheio-03', title: 'Bola de cristal!', emoji: '🎯' },
    { id: 'cheio-04', title: 'Tá hackeando?', emoji: '🎯' },
    { id: 'cheio-05', title: 'Quem te contou?', emoji: '🎯' },
    { id: 'cheio-06', title: 'Combinou com o juiz!', emoji: '🎯' },
    { id: 'cheio-07', title: 'Mãe Diná!', emoji: '🎯' },
    { id: 'cheio-08', title: 'Sniper!', emoji: '🎯' },
    { id: 'cheio-09', title: 'Cravou e não tremeu', emoji: '🎯' },
    { id: 'cheio-10', title: 'Isso é informação privilegiada', emoji: '🎯' },
    { id: 'cheio-11', title: 'Vai cagar no banheiro!', emoji: '🎯' },
  ],

  UNICO_NA_MOSCA: [
    {
      id: 'unico-01',
      title: 'Cagou e cheirou sozinho',
      titleFeminino: 'Cagou e cheirou sozinha',
      emoji: '🦄',
    },
    { id: 'unico-02', title: 'Vidente!', emoji: '🦄' },
    {
      id: 'unico-03',
      title: 'O escolhido',
      titleFeminino: 'A escolhida',
      emoji: '🦄',
    },
    { id: 'unico-04', title: 'Contra todos e certo', emoji: '🦄' },
    { id: 'unico-05', title: 'Ninguém mais acreditou', emoji: '🦄' },
    {
      id: 'unico-06',
      title: 'Solitário e certeiro',
      titleFeminino: 'Solitária e certeira',
      emoji: '🦄',
    },
    {
      id: 'unico-07',
      title: 'Todo mundo errou menos ele',
      titleFeminino: 'Todo mundo errou menos ela',
      emoji: '🦄',
    },
    { id: 'unico-08', title: 'Visão de águia', emoji: '🦄' },
    {
      id: 'unico-09',
      title: 'O diferentão tava certo',
      titleFeminino: 'A diferentona tava certa',
      emoji: '🦄',
    },
    { id: 'unico-10', title: 'Comprou o juiz!', emoji: '🦄' },
  ],

  SUBIU_RANKING: [
    { id: 'subiu-01', title: 'Tá subindo!', emoji: '🚀' },
    { id: 'subiu-02', title: 'Foguete não tem ré', emoji: '🚀' },
    { id: 'subiu-03', title: 'Subiu de elevador', emoji: '🚀' },
    { id: 'subiu-04', title: 'Vem que vem', emoji: '🚀' },
    { id: 'subiu-05', title: 'Modo turbo ativado', emoji: '🚀' },
    { id: 'subiu-06', title: 'Saiu do porão', emoji: '🚀' },
    { id: 'subiu-07', title: 'Decolou!', emoji: '🚀' },
    { id: 'subiu-08', title: 'Próxima parada: topo', emoji: '🚀' },
    { id: 'subiu-09', title: 'Escalada silenciosa', emoji: '🚀' },
    { id: 'subiu-10', title: 'Não para de subir', emoji: '🚀' },
  ],

  SEQUENCIA_RESULTADO: [
    { id: 'seqr-01', title: 'Não zera', emoji: '🔥' },
    { id: 'seqr-02', title: 'Vem pontuando', emoji: '🔥' },
    { id: 'seqr-03', title: 'Somando sem parar', emoji: '🔥' },
    { id: 'seqr-04', title: 'Ponto atrás de ponto', emoji: '🔥' },
    { id: 'seqr-05', title: 'Não deixa de somar', emoji: '🔥' },
    { id: 'seqr-06', title: 'Sequência de pontuação', emoji: '🔥' },
    { id: 'seqr-07', title: 'Tá no lucro', emoji: '🔥' },
    { id: 'seqr-08', title: 'Deixa um pouco para os outros', emoji: '🔥' },
    { id: 'seqr-09', title: 'Gabaritando', emoji: '🔥' },
    { id: 'seqr-10', title: 'Tá ficando difícil de errar', emoji: '🔥' },
    { id: 'seqr-11', title: 'Infreável!', emoji: '🔥' },
  ],

  NAO_PALPITOU: [
    { id: 'nao-01', title: 'Dormiu no ponto', emoji: '😴' },
    { id: 'nao-02', title: 'Esqueceu de existir', emoji: '😴' },
    { id: 'nao-03', title: 'Tava fazendo o quê?', emoji: '😴' },
    { id: 'nao-04', title: 'Sumiu do mapa', emoji: '😴' },
    { id: 'nao-05', title: 'Desaparecido', emoji: '😴' },
    { id: 'nao-06', title: 'Se perdeu no caminho', emoji: '😴' },
    { id: 'nao-07', title: 'RIP palpite', emoji: '😴' },
    { id: 'nao-08', title: 'Fantasma!', emoji: '😴' },
    { id: 'nao-09', title: 'Tá vivo?', emoji: '😴' },
    { id: 'nao-10', title: 'Vacilou!', emoji: '😴' },
    { id: 'nao-11', title: 'Tá em Narnia', emoji: '😴' },
    { id: 'nao-12', title: 'Tá em outro planeta', emoji: '😴' },
    { id: 'nao-13', title: 'Acabou a internet?', emoji: '😴' },
  ],

  DOBROU_E_ACERTOU: [
    { id: 'dobrou-01', title: 'All in certeiro!', emoji: '💎' },
    { id: 'dobrou-02', title: 'Aposta alta, recompensa alta', emoji: '💎' },
    { id: 'dobrou-03', title: 'Coragem premiada!', emoji: '💎' },
    { id: 'dobrou-04', title: 'Dobrou e não tremeu', emoji: '💎' },
    { id: 'dobrou-05', title: 'Jogou pesado e ganhou', emoji: '💎' },
    { id: 'dobrou-06', title: 'Investidor de sucesso', emoji: '💎' },
    { id: 'dobrou-07', title: 'Risco calculado... e acertou', emoji: '💎' },
    { id: 'dobrou-08', title: 'Quem não arrisca não petisca', emoji: '💎' },
  ],
};

const TITULOS_PANELINHA: DestaqueTitle[] = [
  { id: 'panelinha-01', title: 'Colaram!', emoji: '🎯' },
  { id: 'panelinha-02', title: 'Todo mundo cravou!', emoji: '🎯' },
  { id: 'panelinha-03', title: 'Placar coletivo!', emoji: '🎯' },
  { id: 'panelinha-04', title: 'Onde a vaca vai o boi vai atrás', emoji: '🎯' },
  { id: 'panelinha-05', title: 'Foi de panelinha!', emoji: '🎯' },
  { id: 'panelinha-06', title: 'Esse tava fácil', emoji: '🎯' },
  { id: 'panelinha-07', title: 'Maria vai com as outras', emoji: '🎯' },
  { id: 'panelinha-08', title: '3 pontos fáceis', emoji: '🎯' },
];

/** Nomes masculinos comuns que terminam em "a". */
const MASCULINOS_EM_A = new Set([
  'costa',
  'garcia',
  'gianluca',
  'joshua',
  'luca',
  'lucca',
  'nikola',
  'noa',
  'toba',
]);

/** Nomes femininos comuns que não terminam em "a". */
const FEMININOS_SEM_A = new Set([
  'agnes',
  'carmen',
  'helen',
  'ines',
  'iris',
  'isabel',
  'lourdes',
  'mabel',
  'mercedes',
  'miriam',
  'nicole',
  'raquel',
  'tais',
]);

function normalizarPrimeiroNome(nome: string): string {
  return (
    nome
      .trim()
      .split(/\s+/)[0]
      ?.normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase() ?? ''
  );
}

/**
 * Heurística PT-BR pelo primeiro nome (sem campo de gênero no usuário).
 * Default masculino quando ambíguo.
 */
export function inferirGeneroPorNome(nome: string): GeneroTitulo {
  const primeiro = normalizarPrimeiroNome(nome);
  if (!primeiro) return 'M';
  if (FEMININOS_SEM_A.has(primeiro)) return 'F';
  if (MASCULINOS_EM_A.has(primeiro)) return 'M';
  if (primeiro.endsWith('a')) return 'F';
  return 'M';
}

export function textoDoTitulo(
  titulo: DestaqueTitle,
  genero: GeneroTitulo,
): string {
  if (genero === 'F' && titulo.titleFeminino) return titulo.titleFeminino;
  return titulo.title;
}

function indiceAleatorio(tamanho: number): number {
  if (tamanho <= 1) return 0;
  return randomInt(tamanho);
}

function tituloJaUsado(
  titulo: DestaqueTitle,
  usados: ReadonlySet<string>,
): boolean {
  if (usados.has(titulo.title)) return true;
  return Boolean(titulo.titleFeminino && usados.has(titulo.titleFeminino));
}

/**
 * Seleciona um título aleatório evitando o último da batch e os já
 * usados na rodada (quando ainda houver opção disponível).
 * Flexiona `titleFeminino` quando o gênero for F.
 */
export function pickRandomTitle(
  tipo: TipoComTitulo,
  ultimoTituloUsadoId?: string,
  titulosJaUsados: readonly string[] = [],
  genero: GeneroTitulo = 'M',
): DestaqueTitle {
  const titulos = DESTAQUE_TITULOS[tipo];
  const usados = new Set(titulosJaUsados);
  let disponiveis = titulos.filter((t) => !tituloJaUsado(t, usados));
  if (disponiveis.length === 0) disponiveis = [...titulos];
  if (ultimoTituloUsadoId) {
    const semUltimo = disponiveis.filter((t) => t.id !== ultimoTituloUsadoId);
    if (semUltimo.length > 0) disponiveis = semUltimo;
  }

  const escolhido = disponiveis[indiceAleatorio(disponiveis.length)];
  return {
    ...escolhido,
    title: textoDoTitulo(escolhido, genero),
  };
}

export function pickTituloPanelinha(): DestaqueTitle {
  return TITULOS_PANELINHA[indiceAleatorio(TITULOS_PANELINHA.length)];
}
