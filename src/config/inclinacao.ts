export type ClasseInclinacao = 'normal' | 'alto' | 'muito-alto';

/**
 * Limites das classes, em graus. Só inclinações a partir de `risco` contam como
 * risco: valores menores, comuns em áreas planas onde os prédios distorcem a
 * altitude, são tratados como faixa normal.
 */
export const LIMITES_INCLINACAO = {
  /** A partir deste ângulo o setor é de risco alto. */
  risco: 20,
  /** Acima deste ângulo o setor é de risco muito alto. */
  muitoAlto: 30,
} as const;

export interface FaixaInclinacao {
  classe: ClasseInclinacao;
  rotulo: string;
  /** Texto da faixa, para a legenda. */
  faixa: string;
  cor: string;
}

/** Faixas de inclinação (em graus), da menor para a maior: normal < 20 · alto 20 a 30 · muito alto > 30. */
export const FAIXAS_INCLINACAO: readonly FaixaInclinacao[] = [
  { classe: 'normal', rotulo: 'Normal', faixa: `< ${LIMITES_INCLINACAO.risco}°`, cor: '#2ecc40' },
  {
    classe: 'alto',
    rotulo: 'Alto',
    faixa: `${LIMITES_INCLINACAO.risco}° – ${LIMITES_INCLINACAO.muitoAlto}°`,
    cor: '#ff851b',
  },
  { classe: 'muito-alto', rotulo: 'Muito alto', faixa: `> ${LIMITES_INCLINACAO.muitoAlto}°`, cor: '#e5262b' },
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
