// ============================================================
// CENTRALIZADOR DE IMPORTS — equivalente ao Requirements.robot
// ============================================================

// ---- Playwright ----
export { test, expect } from './Base/test-base';

// ---- Base ----
export * from './Base/constants';
export * from './Base/helpers';
export * from './Base/auth';
export * from './Base/api';
export * from './Base/request-logger';

// ---- Database ----
export * from './Database/connection';
export * from './Database/database';
export * as UsuarioDB from './Database/UsuarioDatabase';
export * as CampeonatoDB from './Database/CampeonatoDatabase';
export * as TemporadaDB from './Database/TemporadaDatabase';
export * as GrupoDB from './Database/GrupoDatabase';
export * as FaseDB from './Database/FaseDatabase';

// ---- DataFactories ----
export {
  factoryUsuario,
  factoryUsuarioAttemptRequests,
} from './Fixtures/DataFactories/UsuarioFactory';
export { factoryCampeonato } from './Fixtures/DataFactories/CampeonatoFactory';
export { factoryTemporada } from './Fixtures/DataFactories/TemporadaFactory';
export { factoryGrupo } from './Fixtures/DataFactories/GrupoFactory';
export { factoryFase } from './Fixtures/DataFactories/FaseFactory';
export { factoryJogo, factoryFinalizarJogo } from './Fixtures/DataFactories/JogoFactory';
export { factoryPalpite, factoryConfigurarDobro } from './Fixtures/DataFactories/PalpiteFactory';

// ---- MockDataBuilders ----
export { buildAuthMock } from './Fixtures/MockDataBuilders/AuthMockDataBuilder';
export { buildUsuarioMock } from './Fixtures/MockDataBuilders/UsuarioMockDataBuilder';
export { buildCampeonatoMock } from './Fixtures/MockDataBuilders/CampeonatoMockDataBuilder';
export { buildTemporadaMock } from './Fixtures/MockDataBuilders/TemporadaMockDataBuilder';
export { buildGrupoMock } from './Fixtures/MockDataBuilders/GrupoMockDataBuilder';
export { buildFaseMock } from './Fixtures/MockDataBuilders/FaseMockDataBuilder';

// ---- SeedBuilders ----
export {
  seedUsuariosForAuthSuite,
  AUTH_ATTEMPT_USUARIOS,
  seedAuthAttempt,
} from './Fixtures/SeedBuilders/AuthSuiteSeedBuilder';
export {
  seedUsuariosForUsuarioSuite,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
  seedUsuarioAttemptWithId,
  seedUsuarioDelete,
} from './Fixtures/SeedBuilders/UsuarioSuiteSeedBuilder';
export {
  seedUsuariosForCampeonatoSuite,
  CAMPEONATO_ATTEMPT_USUARIOS,
  seedCampeonatoAttempt,
} from './Fixtures/SeedBuilders/CampeonatoSuiteSeedBuilder';
export {
  TEMPORADA_ATTEMPT_USUARIOS,
  seedTemporadaAttempt,
  seedTemporadaAttemptWithCampeonato,
} from './Fixtures/SeedBuilders/TemporadaSuiteSeedBuilder';
export {
  FASE_ATTEMPT_USUARIOS,
  seedFaseAttempt,
  seedFaseAttemptWithTemporada,
  seedJogoAttemptWithFase,
} from './Fixtures/SeedBuilders/FaseSuiteSeedBuilder';
export {
  PALPITE_ATTEMPT_USUARIOS,
  seedPalpiteAttempt,
  seedPalpiteAttemptWithFase,
} from './Fixtures/SeedBuilders/PalpiteSuiteSeedBuilder';
export {
  seedUsuariosForGrupoSuite,
  GRUPO_ATTEMPT_USUARIOS,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS,
  seedGrupoAttempt,
  seedGrupoSimpleAttempt,
} from './Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';
export { setupGrupoComMembros } from './Fixtures/SeedBuilders/GrupoAttemptSetup';

// ---- Routes ----
export * as AuthRoute from './Routes/AuthRoute';
export * as UsuarioRoute from './Routes/UsuarioRoute';
export * as CampeonatoRoute from './Routes/CampeonatoRoute';
export * as TemporadaRoute from './Routes/TemporadaRoute';
export * as GrupoRoute from './Routes/GrupoRoute';
export * as GrupoUsuarioRoute from './Routes/GrupoUsuarioRoute';
export * as FaseRoute from './Routes/FaseRoute';
export * as JogoRoute from './Routes/JogoRoute';
export * as PalpiteRoute from './Routes/PalpiteRoute';
export * as PalpiteDobradoRoute from './Routes/PalpiteDobradoRoute';

// ---- Seeds ----
export * from './Seeds/AuthSeed';
export * from './Seeds/UsuarioSeed';
export * from './Seeds/CampeonatoSeed';
export * from './Seeds/TemporadaSeed';
export * from './Seeds/GrupoSeed';
export * from './Seeds/GrupoUsuarioSeed';
export * from './Seeds/FaseSeed';

// ---- Templates ----
export * from './Templates/PermissionTemplate';
export * from './Templates/InvalidFieldsTemplate';
export * from './Templates/SecurityTemplate';
