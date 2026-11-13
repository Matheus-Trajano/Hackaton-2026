export type ClasseInclinacao = 'baixo' | 'moderado' | 'alto' | 'muito-alto';

export interface FaixaInclinacao {
  classe: ClasseInclinacao;
  rotulo: string;
  /** Texto da faixa, para a legenda. */
  faixa: string;
  cor: string;
}

/**
 * Faixas de inclinação, da menor para a maior. A classificação é feita em
 * percentual (baixo < 5 · moderado 5 a < 15 · alto 15 a 30 · muito alto > 30);
 * a legenda mostra os mesmos limites em graus: 5% = 2,9° · 15% = 8,5° · 30% = 16,7°.
 */
export const FAIXAS_INCLINACAO: readonly FaixaInclinacao[] = [
  { classe: 'baixo', rotulo: 'Baixo', faixa: '< 2,9°', cor: '#2ecc40' },
  { classe: 'moderado', rotulo: 'Moderado', faixa: '2,9° – 8,5°', cor: '#ffdc00' },
  { classe: 'alto', rotulo: 'Alto', faixa: '8,5° – 16,7°', cor: '#ff851b' },
  { classe: 'muito-alto', rotulo: 'Muito alto', faixa: '> 16,7°', cor: '#e5262b' },
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
