export type ClasseInclinacao = 'normal' | 'moderado' | 'alto' | 'muito-alto';

/** Limites das classes de inclinação, em graus. O limite exato já pertence à classe de cima. */
export const LIMITES_INCLINACAO = {
  /** A partir deste ângulo a inclinação é moderada; abaixo, normal. */
  moderado: 11,
  /** A partir deste ângulo a inclinação é alta. */
  alto: 20,
  /** A partir deste ângulo a inclinação é muito alta. */
  muitoAlto: 45,
} as const;

export interface FaixaInclinacao {
  classe: ClasseInclinacao;
  rotulo: string;
  /** Texto da faixa, para a legenda. */
  faixa: string;
  cor: string;
}

/** Faixas de inclinação (em graus), da menor para a maior: normal 0 a 11 · moderado 11 a 20 · alto 20 a 45 · muito alto 45 em diante. */
export const FAIXAS_INCLINACAO: readonly FaixaInclinacao[] = [
  { classe: 'normal', rotulo: 'Normal', faixa: `0° – ${LIMITES_INCLINACAO.moderado}°`, cor: '#2ecc40' },
  {
    classe: 'moderado',
    rotulo: 'Moderado',
    faixa: `${LIMITES_INCLINACAO.moderado}° – ${LIMITES_INCLINACAO.alto}°`,
    cor: '#ffdc00',
  },
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
