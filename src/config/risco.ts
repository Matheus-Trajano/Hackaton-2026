import type { IntensidadeChuva } from './clima';
import type { ClasseInclinacao } from './inclinacao';

/**
 * Regras do motor de risco. São parâmetros do protótipo, não critérios oficiais
 * da Defesa Civil; ficam aqui para serem ajustados com facilidade.
 */
export const RISCO = {
  /** Classes de inclinação que fazem do setor uma zona de risco, com ou sem chuva. */
  classesDeRisco: ['alto', 'muito-alto'] as readonly ClasseInclinacao[],
  /** Classe intermediária: só preocupa quando há chuva significativa. */
  classeDeAtencao: 'moderado' as ClasseInclinacao,
  /** Intensidades de chuva consideradas significativas. */
  chuvaSignificativa: ['moderada', 'forte', 'muito-forte'] as readonly IntensidadeChuva[],
} as const;
