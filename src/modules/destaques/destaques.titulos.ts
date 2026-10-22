import type { TipoDestaque, DestaqueTitle } from './types/destaque.types';

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
    { id: 'unico-01', title: 'Só ele!', emoji: '🦄' },
    { id: 'unico-02', title: 'Vidente!', emoji: '🦄' },
    { id: 'unico-03', title: 'O escolhido', emoji: '🦄' },
    { id: 'unico-04', title: 'Contra todos e certo', emoji: '🦄' },
    { id: 'unico-05', title: 'Ninguém mais acreditou', emoji: '🦄' },
    { id: 'unico-06', title: 'Solitário e certeiro', emoji: '🦄' },
    { id: 'unico-07', title: 'Todo mundo errou menos ele', emoji: '🦄' },
    { id: 'unico-08', title: 'Visão de águia', emoji: '🦄' },
    { id: 'unico-09', title: 'O diferentão tava certo', emoji: '🦄' },
    { id: 'unico-10', title: 'Comprou o juiz!', emoji: '🦄' },
  ],

  SUBIU_RANKING: [
    { id: 'subiu-01', title: 'Tá subindo!', emoji: '📈' },
    { id: 'subiu-02', title: 'Foguete não tem ré', emoji: '📈' },
    { id: 'subiu-03', title: 'Subiu de elevador', emoji: '📈' },
    { id: 'subiu-04', title: 'Vem que vem', emoji: '📈' },
    { id: 'subiu-05', title: 'Modo turbo ativado', emoji: '📈' },
    { id: 'subiu-06', title: 'Saiu do porão', emoji: '📈' },
    { id: 'subiu-07', title: 'Decolou!', emoji: '📈' },
    { id: 'subiu-08', title: 'Próxima parada: topo', emoji: '📈' },
    { id: 'subiu-09', title: 'Escalada silenciosa', emoji: '📈' },
    { id: 'subiu-10', title: 'Não para de subir', emoji: '📈' },
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

/**
 * Seleciona um título aleatório sem repetir o último usado na batch.
 */
export function pickRandomTitle(
  tipo: TipoComTitulo,
  ultimoTituloUsadoId?: string,
): DestaqueTitle {
  const titulos = DESTAQUE_TITULOS[tipo];
  const disponiveis = ultimoTituloUsadoId
    ? titulos.filter((t) => t.id !== ultimoTituloUsadoId)
    : titulos;

  const selecionado =
    disponiveis.length > 0
      ? disponiveis[Math.floor(Math.random() * disponiveis.length)]
      : titulos[0];

  return selecionado;
}
