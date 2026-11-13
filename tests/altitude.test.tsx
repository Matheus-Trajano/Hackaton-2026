import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapaBase } from '@/components/mapa/MapaBase';
import { ESCALA_ALTITUDE, RELEVO } from '@/config/relevo';
import {
  altitudeTerrarium,
  colorirAltitudes,
  corDaAltitude,
  decodificarTerrarium,
  posicaoNoTile,
} from '@/domain/altitude';
import type { EstadoLocalizacao } from '@/domain/localizacao';
import { useAltitude } from '@/hooks/useAltitude';
import { consultarAltitude, criarCacheDeTiles, urlDoTile, type CarregadorTile } from '@/services/terreno';

afterEach(cleanup);

/** Codifica uma altitude no formato Terrarium (inverso da leitura). */
function codificar(altitude: number): [number, number, number] {
  const v = altitude + 32768;
  return [Math.floor(v / 256), Math.floor(v) % 256, Math.round((v - Math.floor(v)) * 256)];
}

describe('formato Terrarium', () => {
  it('decodifica valores conhecidos', () => {
    expect(altitudeTerrarium(128, 0, 0)).toBe(0);
    expect(altitudeTerrarium(128, 100, 0)).toBe(100);
    expect(altitudeTerrarium(132, 76, 128)).toBe(1100.5);
    expect(altitudeTerrarium(127, 246, 0)).toBe(-10);
  });

  it.each([0, 1, 67.5, 250, 1195, -12])('codificar e decodificar %d m devolve o mesmo valor', (altitude) => {
    expect(altitudeTerrarium(...codificar(altitude))).toBeCloseTo(altitude, 2);
  });

  it('decodifica um bloco de pixels RGBA, ignorando o canal alfa', () => {
    const rgba = [...codificar(10), 255, ...codificar(250), 0, ...codificar(-5), 255];
    expect(Array.from(decodificarTerrarium(rgba))).toEqual([10, 250, -5]);
  });
});

describe('escala de cores', () => {
  const brilho = (cor: readonly number[]) => cor[0]! + cor[1]! + cor[2]!;

  it('usa exatamente a cor de cada parada', () => {
    for (const parada of ESCALA_ALTITUDE) expect(corDaAltitude(parada.altitude)).toEqual([...parada.cor]);
  });

  it('interpola no meio de duas paradas', () => {
    const escala = [
      { altitude: 0, cor: [0, 0, 0] as const },
      { altitude: 100, cor: [200, 100, 50] as const },
    ];
    expect(corDaAltitude(50, escala)).toEqual([100, 50, 25]);
  });

  it('limita abaixo da primeira e acima da última parada', () => {
    expect(corDaAltitude(-50)).toEqual([...ESCALA_ALTITUDE[0]!.cor]);
    expect(corDaAltitude(5000)).toEqual([...ESCALA_ALTITUDE.at(-1)!.cor]);
  });

  it('quanto mais alto, mais escuro e mais vermelho (mais claro = mais baixo)', () => {
    const altitudes = [0, 10, 20, 35, 50, 80, 100, 150, 200, 350, 500, 800, 1000];
    const cores = altitudes.map((a) => corDaAltitude(a));
    for (let i = 1; i < cores.length; i++) {
      expect(brilho(cores[i]!), `${altitudes[i]} m`).toBeLessThan(brilho(cores[i - 1]!));
    }
    // No topo da escala, o vermelho domina com folga.
    const [r, g, b] = corDaAltitude(500);
    expect(r).toBeGreaterThan(g * 3);
    expect(r).toBeGreaterThan(b * 3);
  });

  it('morros do litoral (60–100 m) ficam visivelmente diferentes da planície (5 m)', () => {
    expect(brilho(corDaAltitude(5)) - brilho(corDaAltitude(80))).toBeGreaterThan(150);
  });

  it('pinta terra firme e deixa o mar transparente', () => {
    const pixels = colorirAltitudes([0, -3, 100]);
    expect(Array.from(pixels.slice(0, 8))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(Array.from(pixels.slice(8))).toEqual([...corDaAltitude(100), 255]);
  });
});

describe('grade de tiles', () => {
  it('no zoom 0 o mundo é um único tile e (0, 0) cai no centro', () => {
    expect(posicaoNoTile({ lat: 0, lon: 0 }, 0)).toEqual({ z: 0, x: 0, y: 0, px: 128, py: 128 });
  });

  it('no zoom 1, cada hemisfério cai no quadrante certo', () => {
    expect(posicaoNoTile({ lat: 45, lon: -90 }, 1)).toMatchObject({ x: 0, y: 0 });
    expect(posicaoNoTile({ lat: -8, lon: -35 }, 1)).toMatchObject({ x: 0, y: 1 });
    expect(posicaoNoTile({ lat: -8, lon: 35 }, 1)).toMatchObject({ x: 1, y: 1 });
  });

  it('localiza Recife no zoom 14', () => {
    // x = (−34,877 + 180) / 360 × 16384 ≈ 6604,7
    // y = (1 − asinh(tan(−8,0476°)) / π) / 2 × 16384 ≈ 8559,4
    expect(posicaoNoTile({ lat: -8.0476, lon: -34.877 }, 14)).toMatchObject({ z: 14, x: 6604, y: 8559 });
  });

  it.each([
    ['Recife', -8.0476, -34.877],
    ['Morro da Conceição', -8.0153, -34.9125],
    ['Petrolina', -9.3891, -40.5027],
    ['Triunfo', -7.8383, -38.1017],
  ])('coincide com a projeção do Leaflet em %s', (_nome, lat, lon) => {
    for (const z of [10, 14]) {
      const ponto = L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lon), z);
      expect(posicaoNoTile({ lat, lon }, z)).toEqual({
        z,
        x: Math.floor(ponto.x / 256),
        y: Math.floor(ponto.y / 256),
        px: Math.floor(ponto.x % 256),
        py: Math.floor(ponto.y % 256),
      });
    }
  });

  it('nunca sai dos limites do tile, mesmo nas bordas do mundo', () => {
    const p = posicaoNoTile({ lat: -85.0511, lon: 180 }, 3);
    expect(p.x).toBe(7);
    expect(p.y).toBe(7);
    expect(p.px).toBeLessThanOrEqual(255);
    expect(p.py).toBeLessThanOrEqual(255);
  });
});

describe('serviço de terreno', () => {
  it('monta a URL do tile', () => {
    expect(urlDoTile(14, 6604, 8558)).toBe(
      'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/6604/8558.png',
    );
  });

  it('consulta a altitude no tile e no pixel corretos', async () => {
    const ponto = { lat: -8.0153, lon: -34.9125 };
    const alvo = posicaoNoTile(ponto, RELEVO.zoomConsulta);
    const tile = new Float32Array(256 * 256).fill(3);
    tile[alvo.py * 256 + alvo.px] = 72;
    const carregar = vi.fn<CarregadorTile>().mockResolvedValue(tile);

    await expect(consultarAltitude(ponto, carregar)).resolves.toBe(72);
    expect(carregar).toHaveBeenCalledWith(RELEVO.zoomConsulta, alvo.x, alvo.y);
  });

  it('repassa a falha do carregamento', async () => {
    const carregar: CarregadorTile = () => Promise.reject(new Error('sem rede'));
    await expect(consultarAltitude({ lat: -8, lon: -35 }, carregar)).rejects.toThrow('sem rede');
  });

  it('o cache não baixa o mesmo tile duas vezes', async () => {
    const carregar = vi.fn<CarregadorTile>().mockResolvedValue(new Float32Array(1));
    const comCache = criarCacheDeTiles(carregar);
    await Promise.all([comCache(14, 1, 2), comCache(14, 1, 2), comCache(14, 1, 3)]);
    await comCache(14, 1, 2);
    expect(carregar).toHaveBeenCalledTimes(2);
  });

  it('o cache não guarda falhas: a próxima tentativa baixa de novo', async () => {
    const carregar = vi
      .fn<CarregadorTile>()
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValue(new Float32Array(1));
    const comCache = criarCacheDeTiles(carregar);
    await expect(comCache(14, 1, 2)).rejects.toThrow('falhou');
    await expect(comCache(14, 1, 2)).resolves.toBeInstanceOf(Float32Array);
    expect(carregar).toHaveBeenCalledTimes(2);
  });

  it('o cache descarta o tile usado há mais tempo ao passar do limite', async () => {
    const carregar = vi.fn<CarregadorTile>().mockResolvedValue(new Float32Array(1));
    const comCache = criarCacheDeTiles(carregar, 2);
    await comCache(1, 0, 0);
    await comCache(1, 0, 1);
    await comCache(1, 0, 0); // marca 0/0 como recente
    await comCache(1, 1, 1); // descarta 0/1
    await comCache(1, 0, 0); // ainda em cache
    expect(carregar).toHaveBeenCalledTimes(3);
    await comCache(1, 0, 1); // precisa baixar de novo
    expect(carregar).toHaveBeenCalledTimes(4);
  });
});

describe('useAltitude', () => {
  it('sem posição, não consulta', () => {
    const consultar = vi.fn();
    const { result } = renderHook(() => useAltitude(null, consultar));
    expect(result.current).toEqual({ status: 'sem-posicao' });
    expect(consultar).not.toHaveBeenCalled();
  });

  it('carrega e devolve a altitude', async () => {
    const consultar = vi.fn().mockResolvedValue(64.2);
    const { result } = renderHook(() => useAltitude({ lat: -8, lon: -35 }, consultar));
    expect(result.current.status).toBe('carregando');
    await waitFor(() => expect(result.current).toEqual({ status: 'ok', metros: 64.2 }));
  });

  it('informa erro quando a consulta falha', async () => {
    const consultar = vi.fn().mockRejectedValue(new Error('sem rede'));
    const { result } = renderHook(() => useAltitude({ lat: -8, lon: -35 }, consultar));
    await waitFor(() => expect(result.current).toEqual({ status: 'erro' }));
  });

  it('ignora a resposta de uma posição antiga', async () => {
    let resolverPrimeira: (v: number) => void = () => {};
    const consultar = vi
      .fn()
      .mockImplementationOnce(() => new Promise<number>((r) => (resolverPrimeira = r)))
      .mockResolvedValue(20);
    const { result, rerender } = renderHook(({ p }) => useAltitude(p, consultar), {
      initialProps: { p: { lat: -8, lon: -35 } },
    });
    rerender({ p: { lat: -8.1, lon: -35.1 } });
    await waitFor(() => expect(result.current).toEqual({ status: 'ok', metros: 20 }));
    resolverPrimeira(999);
    await Promise.resolve();
    expect(result.current).toEqual({ status: 'ok', metros: 20 });
  });
});

describe('relevo no mapa', () => {
  const aqui: EstadoLocalizacao = {
    modo: 'simulado',
    status: 'ok',
    posicao: { lat: -8.0153, lon: -34.9125 },
    naCobertura: true,
    nomeLocal: 'Teste',
  };

  it('começa com o relevo ligado, com legenda e crédito da fonte', () => {
    render(<MapaBase />);
    const mapa = screen.getByLabelText('Mapa');
    expect(mapa.querySelector<HTMLElement>('.mapa__leaflet')?.dataset.relevo).toBe('true');
    const legenda = screen.getByRole('group', { name: 'Legenda de altitude' });
    expect(legenda.textContent).toContain('Altitude (m)');
    expect(legenda.textContent).toContain('1000+');
    expect(mapa.querySelector('.leaflet-control-attribution')?.textContent).toContain('Relevo');
  });

  it('o botão oculta e mostra o relevo e a legenda', () => {
    render(<MapaBase />);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar relevo' }));
    expect(screen.queryByRole('group', { name: 'Legenda de altitude' })).toBeNull();
    expect(screen.getByLabelText('Mapa').querySelector('.leaflet-control-attribution')?.textContent).not.toContain(
      'Relevo',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar relevo' }));
    expect(screen.getByRole('group', { name: 'Legenda de altitude' })).toBeTruthy();
  });

  it('mostra a altitude do usuário conforme o estado da consulta', () => {
    const { rerender } = render(<MapaBase localizacao={aqui} altitude={{ status: 'carregando' }} />);
    expect(screen.getByText('Altitude: consultando…')).toBeTruthy();
    rerender(<MapaBase localizacao={aqui} altitude={{ status: 'ok', metros: 71.6 }} />);
    expect(screen.getByText('Altitude: 72 m')).toBeTruthy();
    rerender(<MapaBase localizacao={aqui} altitude={{ status: 'erro' }} />);
    expect(screen.getByText('Altitude indisponível')).toBeTruthy();
  });
});
