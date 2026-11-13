/** Configuração central do aplicativo. */
export const APP = {
  nome: 'Encosta Segura',
  slogan: 'Sempre ao seu lado',
  versao: '0.8.0',
  /** Lado de cada setor da grade, em metros. */
  tamanhoSetorMetros: 100,
  /** Telefone da Defesa Civil. */
  telefoneEmergencia: '199',
} as const;

/** Limites geográficos aproximados de Pernambuco (continente). */
export const LIMITES_PE = {
  sul: -9.49,
  norte: -7.15,
  oeste: -41.36,
  leste: -34.8,
} as const;

/** Etapas do plano de desenvolvimento (ver docs/PLANO.md). */
export const ETAPA_ATUAL = 8;
export const TOTAL_ETAPAS = 10;
