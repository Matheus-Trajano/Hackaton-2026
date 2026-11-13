import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MapaBase } from '@/components/mapa/MapaBase';
import { MAPA } from '@/config/mapa';

afterEach(cleanup);

function elementoMapa(): HTMLElement {
  const el = screen.getByLabelText('Mapa').querySelector<HTMLElement>('.mapa__leaflet');
  if (!el) throw new Error('Contêiner do mapa não encontrado');
  return el;
}

describe('mapa base (etapa 3)', () => {
  it('inicia o Leaflet no zoom inicial, com satélite e escala métrica', () => {
    render(<MapaBase />);
    const el = elementoMapa();
    expect(el.classList.contains('leaflet-container')).toBe(true);
    expect(el.dataset.zoom).toBe(String(MAPA.zoomInicial));
    expect(el.dataset.base).toBe('satelite');
    expect(el.querySelector('.leaflet-control-scale-line')).toBeTruthy();
    expect(el.querySelector('.leaflet-control-attribution')?.textContent).toContain('Esri');
  });

  it('aproxima e afasta pelos botões, respeitando o zoom mínimo', async () => {
    render(<MapaBase />);
    const el = elementoMapa();
    const afastar = screen.getByRole('button', { name: 'Afastar' }) as HTMLButtonElement;
    expect(afastar.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Aproximar' }));
    await waitFor(() => expect(el.dataset.zoom).toBe(String(MAPA.zoomInicial + 1)));
    expect(afastar.disabled).toBe(false);

    fireEvent.click(afastar);
    await waitFor(() => expect(el.dataset.zoom).toBe(String(MAPA.zoomInicial)));
  });

  it('centralizar volta ao zoom inicial', async () => {
    render(<MapaBase />);
    const el = elementoMapa();
    fireEvent.click(screen.getByRole('button', { name: 'Aproximar' }));
    await waitFor(() => expect(el.dataset.zoom).toBe(String(MAPA.zoomInicial + 1)));
    fireEvent.click(screen.getByRole('button', { name: 'Centralizar em Pernambuco' }));
    await waitFor(() => expect(el.dataset.zoom).toBe(String(MAPA.zoomInicial)));
  });

  it('troca a camada entre satélite e ruas', async () => {
    render(<MapaBase />);
    const el = elementoMapa();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar mapa base para Ruas' }));
    await waitFor(() => expect(el.dataset.base).toBe('ruas'));
    expect(el.querySelector('.leaflet-control-attribution')?.textContent).toContain('OpenStreetMap');
    expect(screen.getByRole('button', { name: 'Trocar mapa base para Satélite' })).toBeTruthy();
  });
});
