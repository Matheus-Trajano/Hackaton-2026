import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';
import { APP, LIMITES_PE } from '@/config/app';

describe('base do projeto', () => {
  it('renderiza o nome do aplicativo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: APP.nome })).toBeTruthy();
  });

  it('usa setores de 100 m', () => {
    expect(APP.tamanhoSetorMetros).toBe(100);
  });

  it('tem limites de Pernambuco coerentes (Recife dentro)', () => {
    const recife = { lat: -8.0476, lon: -34.877 };
    expect(recife.lat).toBeGreaterThan(LIMITES_PE.sul);
    expect(recife.lat).toBeLessThan(LIMITES_PE.norte);
    expect(recife.lon).toBeGreaterThan(LIMITES_PE.oeste);
    expect(recife.lon).toBeLessThan(LIMITES_PE.leste);
  });
});
