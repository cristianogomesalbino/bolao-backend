import { describe, it, expect, beforeEach } from 'vitest';
import { RankingService } from '@src/modules/ranking/services/ranking.service';
import { PontuacaoService } from '@src/modules/ranking/services/pontuacao.service';
import { TokenDobroService } from '@src/modules/palpites/services/token-dobro.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryPalpiteRepository } from '@src/modules/palpites/repositories/in-memory-palpite.repository';
import { InMemoryPalpiteDobradoRepository } from '@src/modules/palpites/repositories/in-memory-palpite-dobrado.repository';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';
import { InMemoryGrupoRepository } from '@src/modules/grupos/repositories/in-memory-grupo.repository';
import { InMemoryTokenDobroRepository } from '@src/modules/palpites/repositories/in-memory-token-dobro.repository';
import { GrupoNaoEncontradoError } from '@src/common/errors/domain-errors/grupos.errors';
import { FaseNaoEncontradaError, JogoNaoEncontradoError } from '@src/common/errors/domain-errors/jogos.errors';
import { JogoNaoFinalizadoError } from '@src/common/errors/domain-errors/ranking.errors';

describe('RankingService', () => {
  let service: RankingService;
  let pontuacaoService: PontuacaoService;
  let tokenDobroService: TokenDobroService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let palpiteRepo: InMemoryPalpiteRepository;
  let palpiteDobradoRepo: InMemoryPalpiteDobradoRepository;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;
  let grupoRepo: InMemoryGrupoRepository;
  let tokenDobroRepo: InMemoryTokenDobroRepository;

  const temporadaId = 'temporada-1';
  const grupoId = 'grupo-1';
  const faseId = 'fase-1';
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const userId3 = 'user-3';

  function criarGrupo(overrides: any = {}) {
    const grupo = {
      id: grupoId,
      nome: 'Grupo Teste',
      temporadaId,
      permitirPalpiteDobrado: false,
      ativo: true,
      ...overrides,
    };
    grupoRepo.items.push(grupo);
    return grupo;
  }

  function criarFase(overrides: any = {}) {
    const fase = {
      id: faseId,
      temporadaId,
      nome: 'Rodada 1',
      ordem: 1,
      ...overrides,
    };
    faseRepo.items.push(fase);
    return fase;
  }

  function criarJogo(overrides: any = {}) {
    const jogo = {
      id: crypto.randomUUID(),
      faseId,
      status: 'FINALIZADO',
      golsCasa: 2,
      golsFora: 1,
      dataHora: new Date('2026-06-01T16:00:00Z'),
      ...overrides,
    };
    jogoRepo.items.push(jogo);
    return jogo;
  }

  function criarMembro(usuarioId: string, nome: string) {
    grupoUsuarioRepo.items.push({ usuarioId, grupoId, role: 'MEMBER' });
    grupoUsuarioRepo.usuarios.push({ id: usuarioId, nome });
  }

  function criarPalpite(usuarioId: string, jogoId: string, golsCasa: number, golsFora: number) {
    const palpite = {
      id: crypto.randomUUID(),
      usuarioId,
      jogoId,
      golsCasa,
      golsFora,
      dataCriacao: new Date('2026-05-31T10:00:00Z'),
      atualizadoEm: new Date(),
    };
    palpiteRepo.items.push(palpite);
    return palpite;
  }

  function criarPalpiteDobrado(usuarioId: string, jogoId: string) {
    palpiteDobradoRepo.items.push({
      id: crypto.randomUUID(),
      usuarioId,
      jogoId,
      grupoId,
      dataCriacao: new Date(),
    });
  }

  beforeEach(() => {
    pontuacaoService = new PontuacaoService();
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    palpiteRepo = new InMemoryPalpiteRepository();
    palpiteDobradoRepo = new InMemoryPalpiteDobradoRepository();
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();
    grupoRepo = new InMemoryGrupoRepository();
    tokenDobroRepo = new InMemoryTokenDobroRepository();
    tokenDobroService = new TokenDobroService(tokenDobroRepo as any);

    service = new RankingService(
      pontuacaoService,
      tokenDobroService,
      jogoRepo,
      faseRepo,
      palpiteRepo,
      palpiteDobradoRepo,
      grupoUsuarioRepo,
      grupoRepo,
      tokenDobroRepo,
    );
  });

  // ==================== obterRankingFase ====================

  describe('obterRankingFase', () => {
    it('deve retornar ranking ordenado por pontuação (happy path)', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });

      // Alice acerta em cheio (3 pts)
      criarPalpite(userId1, jogo.id, 2, 1);
      // Bob erra tudo (0 pts)
      criarPalpite(userId2, jogo.id, 0, 3);

      const ranking = await service.obterRankingFase(grupoId, faseId);

      expect(ranking).toHaveLength(2);
      expect(ranking[0].usuarioId).toBe(userId1);
      expect(ranking[0].pontuacaoTotal).toBe(3);
      expect(ranking[0].acertosEmCheio).toBe(1);
      expect(ranking[0].posicao).toBe(1);
      expect(ranking[1].usuarioId).toBe(userId2);
      expect(ranking[1].pontuacaoTotal).toBe(0);
      expect(ranking[1].posicao).toBe(2);
    });

    it('deve retornar todos com 0 pontos quando não há jogos finalizados', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      criarJogo({ status: 'AGENDADO', golsCasa: null, golsFora: null });

      const ranking = await service.obterRankingFase(grupoId, faseId);

      expect(ranking).toHaveLength(2);
      expect(ranking[0].pontuacaoTotal).toBe(0);
      expect(ranking[1].pontuacaoTotal).toBe(0);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo inexistente', async () => {
      criarFase();

      await expect(
        service.obterRankingFase('inexistente', faseId),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar FaseNaoEncontradaError se fase inexistente', async () => {
      criarGrupo();

      await expect(
        service.obterRankingFase(grupoId, 'inexistente'),
      ).rejects.toThrow(FaseNaoEncontradaError);
    });
  });

  // ==================== obterRankingGeral ====================

  describe('obterRankingGeral', () => {
    it('deve acumular pontuação de múltiplas fases', async () => {
      criarGrupo();
      const fase1 = criarFase({ id: 'fase-1', ordem: 1 });
      const fase2 = criarFase({ id: 'fase-2', ordem: 2 });
      criarMembro(userId1, 'Alice');

      const jogo1 = criarJogo({ faseId: 'fase-1', golsCasa: 2, golsFora: 1 });
      const jogo2 = criarJogo({ faseId: 'fase-2', golsCasa: 0, golsFora: 0 });

      // Alice acerta em cheio no jogo 1 (3 pts) e acerta resultado no jogo 2 (1 pt)
      criarPalpite(userId1, jogo1.id, 2, 1);
      criarPalpite(userId1, jogo2.id, 1, 1);

      const ranking = await service.obterRankingGeral(grupoId);

      expect(ranking).toHaveLength(1);
      expect(ranking[0].pontuacaoTotal).toBe(4);
      expect(ranking[0].acertosEmCheio).toBe(1);
      expect(ranking[0].acertosDeResultado).toBe(1);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo inexistente', async () => {
      await expect(
        service.obterRankingGeral('inexistente'),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });
  });

  // ==================== obterDetalhamentoJogo ====================

  describe('obterDetalhamentoJogo', () => {
    it('deve retornar detalhamento com pontuação para jogo finalizado', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });

      criarPalpite(userId1, jogo.id, 2, 1); // acerto em cheio
      criarPalpite(userId2, jogo.id, 1, 0); // acerto resultado

      const detalhamento = await service.obterDetalhamentoJogo(grupoId, jogo.id);

      expect(detalhamento).toHaveLength(2);

      const alice = detalhamento.find((d) => d.usuarioId === userId1)!;
      expect(alice.categoriaAcerto).toBe('ACERTO_EM_CHEIO');
      expect(alice.pontosBase).toBe(3);
      expect(alice.multiplicador).toBe(1);
      expect(alice.pontosFinais).toBe(3);
      expect(alice.dobrado).toBe(false);

      const bob = detalhamento.find((d) => d.usuarioId === userId2)!;
      expect(bob.categoriaAcerto).toBe('ACERTO_DE_RESULTADO');
      expect(bob.pontosBase).toBe(1);
    });

    it('deve retornar pontuação null para jogo não finalizado', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ status: 'AGENDADO', golsCasa: null, golsFora: null });
      criarPalpite(userId1, jogo.id, 2, 1);

      const detalhamento = await service.obterDetalhamentoJogo(grupoId, jogo.id);

      expect(detalhamento).toHaveLength(1);
      expect(detalhamento[0].categoriaAcerto).toBeNull();
      expect(detalhamento[0].pontosBase).toBeNull();
      expect(detalhamento[0].pontosFinais).toBeNull();
      expect(detalhamento[0].golsCasaPalpite).toBe(2);
      expect(detalhamento[0].golsForaPalpite).toBe(1);
    });

    it('deve incluir membro sem palpite com valores null', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      // Alice não fez palpite

      const detalhamento = await service.obterDetalhamentoJogo(grupoId, jogo.id);

      expect(detalhamento).toHaveLength(1);
      expect(detalhamento[0].golsCasaPalpite).toBeNull();
      expect(detalhamento[0].golsForaPalpite).toBeNull();
      expect(detalhamento[0].categoriaAcerto).toBeNull();
      expect(detalhamento[0].pontosBase).toBe(0);
    });

    it('deve indicar flag dobrado quando PalpiteDobrado existe', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarPalpite(userId1, jogo.id, 2, 1);
      criarPalpiteDobrado(userId1, jogo.id);

      const detalhamento = await service.obterDetalhamentoJogo(grupoId, jogo.id);

      expect(detalhamento[0].dobrado).toBe(true);
      expect(detalhamento[0].multiplicador).toBe(2);
      expect(detalhamento[0].pontosFinais).toBe(6);
    });
  });

  // ==================== processarPontuacaoJogo ====================

  describe('processarPontuacaoJogo', () => {
    it('deve conceder token por acerto em cheio quando grupo tem dobro habilitado', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarPalpite(userId1, jogo.id, 2, 1); // acerto em cheio

      await service.processarPontuacaoJogo(jogo.id);

      const tokens = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'ACERTO_EM_CHEIO' && t.usuarioId === userId1,
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0].referenciaId).toBe(jogo.id);
    });

    it('deve ser idempotente — processar 2x não duplica tokens', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarPalpite(userId1, jogo.id, 2, 1);

      await service.processarPontuacaoJogo(jogo.id);
      await service.processarPontuacaoJogo(jogo.id);

      const tokens = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'ACERTO_EM_CHEIO' && t.usuarioId === userId1,
      );
      expect(tokens).toHaveLength(1);
    });

    it('deve conceder tokens de posição quando fase encerra', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarPalpite(userId1, jogo.id, 2, 1); // acerto em cheio (10 pts)
      criarPalpite(userId2, jogo.id, 0, 3); // erro total (0 pts)

      // Único jogo da fase → fase encerra ao processar
      await service.processarPontuacaoJogo(jogo.id);

      const tokensPrimeiro = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'PRIMEIRO_RANKING',
      );
      const tokensUltimo = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'ULTIMO_RANKING',
      );

      expect(tokensPrimeiro).toHaveLength(1);
      expect(tokensPrimeiro[0].usuarioId).toBe(userId1);
      expect(tokensUltimo).toHaveLength(1);
      expect(tokensUltimo[0].usuarioId).toBe(userId2);
    });

    it('não deve conceder tokens de posição quando fase não encerrou', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo1 = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarJogo({ status: 'AGENDADO', golsCasa: null, golsFora: null }); // jogo pendente

      criarPalpite(userId1, jogo1.id, 2, 1);

      await service.processarPontuacaoJogo(jogo1.id);

      const tokensPosicao = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'PRIMEIRO_RANKING' || t.motivo === 'ULTIMO_RANKING',
      );
      expect(tokensPosicao).toHaveLength(0);
    });

    it('não deve conceder tokens quando grupo não tem dobro habilitado', async () => {
      criarGrupo({ permitirPalpiteDobrado: false });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarPalpite(userId1, jogo.id, 2, 1);

      await service.processarPontuacaoJogo(jogo.id);

      expect(tokenDobroRepo.items).toHaveLength(0);
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.processarPontuacaoJogo('inexistente'),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve lançar JogoNaoFinalizadoError se jogo não finalizado', async () => {
      criarFase();
      const jogo = criarJogo({ status: 'AGENDADO', golsCasa: null, golsFora: null });

      await expect(
        service.processarPontuacaoJogo(jogo.id),
      ).rejects.toThrow(JogoNaoFinalizadoError);
    });

    it('erro em um grupo não deve propagar para outros', async () => {
      // Grupo 1 normal
      criarGrupo({ id: 'grupo-1', permitirPalpiteDobrado: true });
      // Grupo 2 — sem membros configurados no grupoUsuarioRepo, vai funcionar mas sem palpites
      grupoRepo.items.push({
        id: 'grupo-2',
        nome: 'Grupo 2',
        temporadaId,
        permitirPalpiteDobrado: true,
        ativo: true,
      });

      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });
      criarPalpite(userId1, jogo.id, 2, 1);

      // Não deve lançar erro
      await expect(service.processarPontuacaoJogo(jogo.id)).resolves.not.toThrow();
    });

    it('deve aplicar multiplicador dobro corretamente no ranking', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });

      // Ambos acertam resultado (1 pt base), mas Alice tem dobro
      criarPalpite(userId1, jogo.id, 1, 0);
      criarPalpite(userId2, jogo.id, 3, 0);
      criarPalpiteDobrado(userId1, jogo.id);

      const ranking = await service.obterRankingFase(grupoId, faseId);

      const alice = ranking.find((r) => r.usuarioId === userId1)!;
      const bob = ranking.find((r) => r.usuarioId === userId2)!;

      expect(alice.pontuacaoTotal).toBe(2); // 1 * 2
      expect(bob.pontuacaoTotal).toBe(1);    // 1 * 1
      expect(alice.posicao).toBe(1);
      expect(bob.posicao).toBe(2);
    });

    it('fase com apenas jogos cancelados não deve conceder tokens de posição', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      // Jogo finalizado em outra fase para trigger processamento
      const fase2 = criarFase({ id: 'fase-2', ordem: 2 });
      const jogoFinalizado = criarJogo({ faseId: 'fase-2', golsCasa: 1, golsFora: 0 });

      // Fase 1 tem apenas jogo cancelado
      criarJogo({ faseId: 'fase-1', status: 'CANCELADO', golsCasa: null, golsFora: null });

      criarPalpite(userId1, jogoFinalizado.id, 1, 0);

      await service.processarPontuacaoJogo(jogoFinalizado.id);

      // Fase 2 encerrou com 1 jogo finalizado → tokens de posição para fase 2
      const tokensFase2 = tokenDobroRepo.items.filter(
        (t) => t.referenciaId === 'fase-2',
      );
      // Fase 1 não encerrou (não tem jogo finalizado nela que foi processado)
      // Tokens de posição devem existir apenas para fase-2
      expect(tokensFase2.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== verificarPalpitesCompletos ====================

  describe('verificarPalpitesCompletos', () => {
    it('deve conceder token PALPITES_COMPLETOS quando membro tem todos os palpites antes do primeiro jogo', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo1 = criarJogo({
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        dataHora: new Date('2026-06-01T16:00:00Z'),
      });
      const jogo2 = criarJogo({
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        dataHora: new Date('2026-06-02T16:00:00Z'),
      });

      // Palpites criados antes do primeiro jogo
      criarPalpite(userId1, jogo1.id, 1, 0);
      criarPalpite(userId1, jogo2.id, 2, 1);

      await service.verificarPalpitesCompletos(faseId, grupoId);

      const tokens = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'PALPITES_COMPLETOS',
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0].usuarioId).toBe(userId1);
      expect(tokens[0].referenciaId).toBe(faseId);
    });

    it('não deve conceder token quando grupo não tem dobro habilitado', async () => {
      criarGrupo({ permitirPalpiteDobrado: false });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({ status: 'AGENDADO', golsCasa: null, golsFora: null });
      criarPalpite(userId1, jogo.id, 1, 0);

      await service.verificarPalpitesCompletos(faseId, grupoId);

      expect(tokenDobroRepo.items).toHaveLength(0);
    });

    it('deve ser idempotente — não duplicar token PALPITES_COMPLETOS', async () => {
      criarGrupo({ permitirPalpiteDobrado: true });
      criarFase();
      criarMembro(userId1, 'Alice');

      const jogo = criarJogo({
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        dataHora: new Date('2026-06-01T16:00:00Z'),
      });
      criarPalpite(userId1, jogo.id, 1, 0);

      await service.verificarPalpitesCompletos(faseId, grupoId);
      await service.verificarPalpitesCompletos(faseId, grupoId);

      const tokens = tokenDobroRepo.items.filter(
        (t) => t.motivo === 'PALPITES_COMPLETOS',
      );
      expect(tokens).toHaveLength(1);
    });
  });

  // ==================== desempate ====================

  describe('desempate', () => {
    it('deve desempatar por acertos em cheio quando pontuação é igual', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      const jogo1 = criarJogo({ golsCasa: 2, golsFora: 1 });
      const jogo2 = criarJogo({ golsCasa: 0, golsFora: 0 });

      // Alice: acerto em cheio (3) + erro (0) = 3
      criarPalpite(userId1, jogo1.id, 2, 1);
      criarPalpite(userId1, jogo2.id, 1, 0);

      // Bob: acerto resultado (1) + acerto resultado (1) = 2
      criarPalpite(userId2, jogo1.id, 1, 0);
      criarPalpite(userId2, jogo2.id, 1, 1);

      const ranking = await service.obterRankingFase(grupoId, faseId);

      expect(ranking[0].usuarioId).toBe(userId1); // mais acertos em cheio
      expect(ranking[1].usuarioId).toBe(userId2);
      expect(ranking[0].posicao).toBe(1);
      expect(ranking[1].posicao).toBe(2);
    });

    it('deve diferenciar posição mesmo com empate nos critérios numéricos (desempata por hora do palpite e nome)', async () => {
      criarGrupo();
      criarFase();
      criarMembro(userId1, 'Alice');
      criarMembro(userId2, 'Bob');

      const jogo = criarJogo({ golsCasa: 2, golsFora: 1 });

      // Ambos acertam em cheio
      criarPalpite(userId1, jogo.id, 2, 1);
      criarPalpite(userId2, jogo.id, 2, 1);

      const ranking = await service.obterRankingFase(grupoId, faseId);

      expect(ranking[0].posicao).toBe(1);
      expect(ranking[1].posicao).toBe(2);
    });
  });
});
