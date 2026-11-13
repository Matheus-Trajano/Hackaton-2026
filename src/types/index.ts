/** Abas da navegação inferior. */
export type Aba = 'inicio' | 'mapa' | 'alertas' | 'sobre';

/**
 * Situação do usuário quanto ao risco.
 * - `indefinido`: ainda não há dados suficientes para avaliar.
 */
export type EstadoRisco = 'indefinido' | 'seguro' | 'risco';

/** Resumo do clima exibido no painel superior. */
export interface ResumoClima {
  /** Probabilidade de chuva nas próximas 3 h, de 0 a 100. */
  probabilidadeChuva: number;
  /** Rótulo da intensidade, ex.: "Chuva forte". */
  intensidade: string;
  /** Temperatura atual em °C. */
  temperatura: number;
}
