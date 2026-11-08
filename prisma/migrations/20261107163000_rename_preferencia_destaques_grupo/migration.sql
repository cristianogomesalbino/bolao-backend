-- A preferência de destaques do grupo deixa o nome antigo.
ALTER TABLE "PreferenciaNotificacao" RENAME COLUMN "storiesGrupo" TO "destaquesGrupo";
