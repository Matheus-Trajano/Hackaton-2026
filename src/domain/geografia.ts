import { LIMITES_PE } from '@/config/app';

export interface Coordenada {
  lat: number;
  lon: number;
}

export interface Limites {
  sul: number;
  norte: number;
  oeste: number;
  leste: number;
}

/** Indica se a coordenada está dentro do retângulo de limites (bordas inclusas). */
export function dentroDosLimites(ponto: Coordenada, limites: Limites): boolean {
  return (
    ponto.lat >= limites.sul &&
    ponto.lat <= limites.norte &&
    ponto.lon >= limites.oeste &&
    ponto.lon <= limites.leste
  );
}

/**
 * Indica se a coordenada está na área de cobertura do app.
 * Aproximação: usa o retângulo que envolve Pernambuco, então também aceita
 * trechos de estados vizinhos que caem dentro desse retângulo.
 */
export function dentroDePernambuco(ponto: Coordenada): boolean {
  return dentroDosLimites(ponto, LIMITES_PE);
}

/** Aumenta os limites em `folga` graus para cada lado. */
export function expandirLimites(limites: Limites, folga: number): Limites {
  return {
    sul: limites.sul - folga,
    norte: limites.norte + folga,
    oeste: limites.oeste - folga,
    leste: limites.leste + folga,
  };
}
