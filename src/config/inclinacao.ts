export type ClasseInclinacao = 'baixo' | 'moderado' | 'alto' | 'muito-alto';

export interface FaixaInclinacao {
  classe: ClasseInclinacao;
  rotulo: string;
  /** Texto da faixa, para a legenda. */
  faixa: string;
  cor: string;
}

/**
 * Faixas de inclinação (em %), da menor para a maior:
 * baixo < 5 · moderado 5 a < 15 · alto 15 a 30 · muito alto > 30.
 */
export const FAIXAS_INCLINACAO: readonly FaixaInclinacao[] = [
  { classe: 'baixo', rotulo: 'Baixo', faixa: '< 5%', cor: '#2ecc40' },
  { classe: 'moderado', rotulo: 'Moderado', faixa: '5% – 15%', cor: '#ffdc00' },
  { classe: 'alto', rotulo: 'Alto', faixa: '15% – 30%', cor: '#ff851b' },
  { classe: 'muito-alto', rotulo: 'Muito alto', faixa: '> 30%', cor: '#e5262b' },
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
