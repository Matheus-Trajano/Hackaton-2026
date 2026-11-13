/** Abas da navegação inferior. */
export type Aba = 'inicio' | 'mapa' | 'alertas' | 'sobre';

/**
 * Situação do usuário quanto ao risco.
 * - `indefinido`: ainda não há dados suficientes para avaliar.
 * - `atencao`: inclinação moderada com chuva significativa prevista.
 * - `risco`: o setor do usuário é zona de risco (inclinação alta ou muito alta).
 */
export type EstadoRisco = 'indefinido' | 'seguro' | 'atencao' | 'risco';
