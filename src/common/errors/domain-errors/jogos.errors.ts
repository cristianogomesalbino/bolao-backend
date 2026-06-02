import { DomainError } from '../domain-error';
import { JOGOS } from '../../../modules/jogos/jogos.constants';

export class FaseNaoEncontradaError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = JOGOS.MENSAGENS.FASE_NAO_ENCONTRADA) {
    super(mensagem);
  }
}

export class JogoNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = JOGOS.MENSAGENS.JOGO_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

export class TimesIguaisError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.TIMES_IGUAIS) {
    super(mensagem);
  }
}

export class JogoFinalizadoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.JOGO_FINALIZADO) {
    super(mensagem);
  }
}

export class JogoCanceladoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.JOGO_CANCELADO) {
    super(mensagem);
  }
}

export class PlacarInvalidoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.PLACAR_INVALIDO) {
    super(mensagem);
  }
}

export class ProrrogacaoNaoPermitidaError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.PRORROGACAO_NAO_PERMITIDA) {
    super(mensagem);
  }
}

export class PenaltisNaoPermitidoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.PENALTIS_NAO_PERMITIDO) {
    super(mensagem);
  }
}

export class PlacarPenaltisEmpatadoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.PLACAR_PENALTIS_EMPATADO) {
    super(mensagem);
  }
}

export class VencedorObrigatorioError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.VENCEDOR_OBRIGATORIO) {
    super(mensagem);
  }
}

export class TransicaoStatusInvalidaError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.TRANSICAO_STATUS_INVALIDA) {
    super(mensagem);
  }
}

export class IdaVoltaNaoPermitidaError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.IDA_VOLTA_NAO_PERMITIDA) {
    super(mensagem);
  }
}

export class JogoIdaNaoEncontradoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = JOGOS.MENSAGENS.JOGO_IDA_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

export class ApiExternaIndisponivelError extends DomainError {
  readonly statusCode = 502;
  constructor(mensagem = JOGOS.MENSAGENS.API_EXTERNA_INDISPONIVEL) {
    super(mensagem);
  }
}

export class CampeonatoNaoSuportadoError extends DomainError {
  readonly statusCode = 400;
  constructor(slug?: string) {
    super(
      slug
        ? `Campeonato '${slug}' não é suportado`
        : JOGOS.MENSAGENS.CAMPEONATO_NAO_SUPORTADO,
    );
  }
}

export class RodadaForaDoLimiteError extends DomainError {
  readonly statusCode = 400;
  constructor(rodada?: number, max?: number, fase?: string) {
    super(
      rodada != null && max != null && fase
        ? `Rodada ${rodada} excede o limite de ${max} para a fase '${fase}'`
        : JOGOS.MENSAGENS.RODADA_FORA_DO_LIMITE,
    );
  }
}

export class FaseSlugInvalidaError extends DomainError {
  readonly statusCode = 400;
  constructor(faseSlug?: string, campeonato?: string) {
    super(
      faseSlug && campeonato
        ? `Fase '${faseSlug}' não é válida para o campeonato '${campeonato}'`
        : JOGOS.MENSAGENS.FASE_SLUG_INVALIDA,
    );
  }
}
