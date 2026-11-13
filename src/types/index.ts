/** Abas da navegação inferior. */
export type Aba = 'inicio' | 'mapa' | 'alertas' | 'sobre';

/**
 * Situação do usuário quanto ao risco.
 * - `indefinido`: ainda não há dados suficientes para avaliar.
 */
export type EstadoRisco = 'indefinido' | 'seguro' | 'risco';
