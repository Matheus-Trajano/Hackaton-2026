export type ClasseInclinacao = 'normal' | 'alto' | 'muito-alto';

/** Limites das classes de inclinação, em graus. */
export const LIMITES_INCLINACAO = {
  /** A partir deste ângulo a inclinação é alta; abaixo, normal. */
  alto: 15,
  /** A partir deste ângulo a inclinação é muito alta. */
  muitoAlto: 35,
} as const;

export interface FaixaInclinacao {
  classe: ClasseInclinacao;
  rotulo: string;
  /** Texto da faixa, para a legenda. */
  faixa: string;
  cor: string;
}

/** Faixas de inclinação (em graus), da menor para a maior: normal 0 a 15 · alto 15 a 35 · muito alto 35 em diante. */
export const FAIXAS_INCLINACAO: readonly FaixaInclinacao[] = [
  { classe: 'normal', rotulo: 'Normal', faixa: `0° – ${LIMITES_INCLINACAO.alto}°`, cor: '#2ecc40' },
  {
    classe: 'alto',
    rotulo: 'Alto',
    faixa: `${LIMITES_INCLINACAO.alto}° – ${LIMITES_INCLINACAO.muitoAlto}°`,
    cor: '#ff851b',
  },
  { classe: 'muito-alto', rotulo: 'Muito alto', faixa: `≥ ${LIMITES_INCLINACAO.muitoAlto}°`, cor: '#e5262b' },
];

export function faixaDaClasse(classe: ClasseInclinacao): FaixaInclinacao {
  return FAIXAS_INCLINACAO.find((f) => f.classe === classe)!;
}

export const GRADE = {
  /** Abaixo deste zoom os setores de 100 m ficam pequenos demais para desenhar. */
  zoomMinimo: 15,
  /** Limite de setores desenhados de uma vez. */
  maximoDeSetores: 1500,
  /** Quantos resultados de inclinação ficam guardados em memória. */
  setoresEmCache: 6000,
} as const;
