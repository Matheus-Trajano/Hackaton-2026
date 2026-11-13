import { describe, expect, it } from 'vitest';
import { LIMITES_PE } from '@/config/app';
import { MAPA } from '@/config/mapa';
import { dentroDePernambuco, dentroDosLimites, expandirLimites } from '@/domain/geografia';

describe('geografia', () => {
  it.each([
    ['Recife', -8.0476, -34.877],
    ['Caruaru', -8.2835, -35.9761],
    ['Petrolina', -9.3891, -40.5027],
    ['Garanhuns', -8.8829, -36.4966],
  ])('%s está dentro de Pernambuco', (_nome, lat, lon) => {
    expect(dentroDePernambuco({ lat, lon })).toBe(true);
  });

  it.each([
    ['São Paulo', -23.5505, -46.6333],
    ['Fortaleza', -3.7319, -38.5267],
    ['Salvador', -12.9777, -38.5016],
    ['Oceano, a leste de Recife', -8.05, -34.0],
  ])('%s está fora de Pernambuco', (_nome, lat, lon) => {
    expect(dentroDePernambuco({ lat, lon })).toBe(false);
  });

  it('considera as bordas como dentro', () => {
    expect(dentroDosLimites({ lat: LIMITES_PE.sul, lon: LIMITES_PE.oeste }, LIMITES_PE)).toBe(true);
    expect(dentroDosLimites({ lat: LIMITES_PE.norte, lon: LIMITES_PE.leste }, LIMITES_PE)).toBe(true);
  });

  it('expande os limites para os quatro lados', () => {
    const maior = expandirLimites({ sul: -9, norte: -7, oeste: -41, leste: -35 }, 0.5);
    expect(maior).toEqual({ sul: -9.5, norte: -6.5, oeste: -41.5, leste: -34.5 });
  });

  it('o centro do mapa fica dentro de Pernambuco', () => {
    expect(dentroDePernambuco(MAPA.centro)).toBe(true);
  });
});
