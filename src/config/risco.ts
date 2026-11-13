import type { IntensidadeChuva } from './clima';
import type { ClasseInclinacao } from './inclinacao';

/**
 * Regras do motor de risco. São parâmetros do protótipo, não critérios oficiais
 * da Defesa Civil; ficam aqui para serem ajustados com facilidade.
 */
export const RISCO = {
  /**
   * Classes de inclinação que fazem do setor uma zona de risco, com ou sem chuva
   * (a partir de 20°).
   */
  classesDeRisco: ['alto', 'muito-alto'] as readonly ClasseInclinacao[],
  /**
   * Classe intermediária (11° a 20°): atenção para deslizamento quando há chuva
   * significativa ou quando a previsão está indisponível; segura sem chuva.
   */
  classeDeAtencao: 'moderado' as ClasseInclinacao,
  /**
   * Intensidades de chuva que geram alerta de alagamento em setor de inclinação
   * normal (terreno plano ou pouco inclinado, onde a água tende a acumular).
   */
  chuvaDeAlagamento: ['moderada', 'forte', 'muito-forte'] as readonly IntensidadeChuva[],
  /** Intensidades de chuva consideradas significativas. */
  chuvaSignificativa: ['moderada', 'forte', 'muito-forte'] as readonly IntensidadeChuva[],
} as const;
