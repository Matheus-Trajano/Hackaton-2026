import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CamadaSetores } from '@/components/mapa/CamadaSetores';
import { MapaBase } from '@/components/mapa/MapaBase';
import { APP, LIMITES_PE } from '@/config/app';
import { FAIXAS_INCLINACAO, GRADE } from '@/config/inclinacao';
import { PONTOS_DEMO } from '@/config/pontosDemo';
import type { Coordenada } from '@/domain/geografia';
import {
  centroDoSetor,
  idDoSetor,
  limitesDoSetor,
  METROS_POR_GRAU_LAT,
  METROS_POR_GRAU_LON,
  mesmoSetor,
  setorDe,
  setoresNaArea,
} from '@/domain/grade';
import { classificarInclinacao, grausParaExibir, inclinacaoDoSetor, inclinacaoHorn, pontosDeAmostra } from '@/domain/inclinacao';
import type { EstadoLocalizacao } from '@/domain/localizacao';
import { useSetorAtual } from '@/hooks/useSetorAtual';
import { consultarAltitude } from '@/services/terreno';

afterEach(cleanup);

/** Distância real entre dois pontos (haversine), independente das constantes da grade. */
function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6_371_008 * Math.asin(Math.sqrt(h));
}

/** Terreno sintético: a altitude é uma função dos metros a leste e ao norte da origem da grade. */
function terreno(f: (leste: number, norte: number) => number) {
  return (p: Coordenada) =>
    Promise.resolve(f((p.lon - LIMITES_PE.oeste) * METROS_POR_GRAU_LON, (p.lat - LIMITES_PE.sul) * METROS_POR_GRAU_LAT));
}

const RECIFE = { lat: -8.0476, lon: -34.877 };

describe('grade de setores de 100 m', () => {
  it.each([
    ['Recife (leste)', RECIFE],
    ['Petrolina (sudoeste)', { lat: -9.3891, lon: -40.5027 }],
    ['Goiana (norte)', { lat: -7.5606, lon: -35.0027 }],
  ])('em %s, cada setor mede 100 m de lado (erro < 1%%)', (_nome, ponto) => {
    const l = limitesDoSetor(setorDe(ponto));
    const altura = distanciaMetros({ lat: l.sul, lon: l.oeste }, { lat: l.norte, lon: l.oeste });
    const largura = distanciaMetros({ lat: l.sul, lon: l.oeste }, { lat: l.sul, lon: l.leste });
    expect(Math.abs(altura - 100)).toBeLessThan(1);
    expect(Math.abs(largura - 100)).toBeLessThan(1);
    expect(APP.tamanhoSetorMetros).toBe(100);
  });

  it('o ponto fica dentro dos limites do seu setor', () => {
    for (const ponto of [RECIFE, ...PONTOS_DEMO]) {
      const l = limitesDoSetor(setorDe(ponto));
      expect(ponto.lat).toBeGreaterThanOrEqual(l.sul);
      expect(ponto.lat).toBeLessThan(l.norte);
      expect(ponto.lon).toBeGreaterThanOrEqual(l.oeste);
      expect(ponto.lon).toBeLessThan(l.leste);
    }
  });

  it('o centro de um setor pertence a ele mesmo', () => {
    const setor = { linha: 1602, coluna: 7125 };
    expect(setorDe(centroDoSetor(setor))).toEqual(setor);
  });

  it('a origem da grade é o canto sudoeste da cobertura', () => {
    expect(setorDe({ lat: LIMITES_PE.sul + 1e-6, lon: LIMITES_PE.oeste + 1e-6 })).toEqual({ linha: 0, coluna: 0 });
  });

  it('andar 100 m muda para o setor vizinho; andar 10 m dentro do setor, não', () => {
    const base = centroDoSetor({ linha: 1602, coluna: 7125 });
    const grausLat = (m: number) => m / METROS_POR_GRAU_LAT;
    const grausLon = (m: number) => m / METROS_POR_GRAU_LON;
    expect(setorDe({ lat: base.lat + grausLat(100), lon: base.lon })).toEqual({ linha: 1603, coluna: 7125 });
    expect(setorDe({ lat: base.lat, lon: base.lon + grausLon(100) })).toEqual({ linha: 1602, coluna: 7126 });
    expect(setorDe({ lat: base.lat + grausLat(10), lon: base.lon - grausLon(10) })).toEqual({ linha: 1602, coluna: 7125 });
  });

  it('gera identificador e compara setores', () => {
    expect(idDoSetor({ linha: 12, coluna: 34 })).toBe('L12-C34');
    expect(mesmoSetor({ linha: 1, coluna: 2 }, { linha: 1, coluna: 2 })).toBe(true);
    expect(mesmoSetor({ linha: 1, coluna: 2 }, { linha: 2, coluna: 1 })).toBe(false);
  });

  it('lista os setores de uma área de 300 m × 200 m', () => {
    const canto = limitesDoSetor({ linha: 500, coluna: 800 });
    const fim = limitesDoSetor({ linha: 501, coluna: 802 });
    const area = { sul: canto.sul + 1e-7, oeste: canto.oeste + 1e-7, norte: fim.norte - 1e-7, leste: fim.leste - 1e-7 };
    const setores = setoresNaArea(area, 100);
    expect(setores).toHaveLength(6);
    expect(setores).toContainEqual({ linha: 500, coluna: 800 });
    expect(setores).toContainEqual({ linha: 501, coluna: 802 });
  });

  it('devolve null quando a área tem setores demais e vazio fora da cobertura', () => {
    expect(setoresNaArea(LIMITES_PE, 1500)).toBeNull();
    expect(setoresNaArea({ sul: -24, norte: -23, oeste: -47, leste: -46 }, 1500)).toEqual([]);
  });
});

describe('cálculo de inclinação', () => {
  it('terreno plano tem inclinação zero', () => {
    const r = inclinacaoHorn(Array(9).fill(42), 50);
    expect(r.percentual).toBe(0);
    expect(r.graus).toBe(0);
    expect(r.classe).toBe('normal');
  });

  it('rampa de 10 m a cada 100 m para leste dá 10%', () => {
    // colunas a 0, 50 e 100 m → altitudes 0, 5 e 10
    const r = inclinacaoHorn([0, 5, 10, 0, 5, 10, 0, 5, 10], 50);
    expect(r.percentual).toBeCloseTo(10, 6);
    expect(r.graus).toBeCloseTo(5.7106, 3);
    expect(r.classe).toBe('normal'); // 5,7°: abaixo de 20°
  });

  it('rampa para o norte dá o mesmo valor que para o leste', () => {
    expect(inclinacaoHorn([10, 10, 10, 5, 5, 5, 0, 0, 0], 50).percentual).toBeCloseTo(10, 6);
  });

  it('rampa de 100% equivale a 45 graus', () => {
    const r = inclinacaoHorn([0, 50, 100, 0, 50, 100, 0, 50, 100], 50);
    expect(r.percentual).toBeCloseTo(100, 6);
    expect(r.graus).toBeCloseTo(45, 6);
    expect(r.classe).toBe('muito-alto');
  });

  it('rampa na diagonal combina as duas direções (30% leste + 40% norte = 50%)', () => {
    const alt = (leste: number, norte: number) => 0.3 * leste + 0.4 * norte;
    const grade = [100, 50, 0].flatMap((norte) => [0, 50, 100].map((leste) => alt(leste, norte)));
    expect(inclinacaoHorn(grade, 50).percentual).toBeCloseTo(50, 6);
  });

  it('exige exatamente 9 altitudes', () => {
    expect(() => inclinacaoHorn([1, 2, 3], 50)).toThrow();
  });

  it.each([
    [0, 'normal'],
    [5, 'normal'],
    [15, 'normal'],
    [19.99, 'normal'],
    [20, 'alto'],
    [25, 'alto'],
    [30, 'alto'],
    [30.01, 'muito-alto'],
    [80, 'muito-alto'],
  ])('%d° é classe "%s"', (graus, classe) => {
    expect(classificarInclinacao(graus)).toBe(classe);
  });

  it('a classe sai do ângulo em graus, não do percentual', () => {
    // 30% de rampa são 16,7°: faixa normal. 40% são 21,8°: alto. 60% são 31°: muito alto.
    const rampa = (percentual: number) => inclinacaoHorn([0, 1, 2, 0, 1, 2, 0, 1, 2].map((v) => (v * percentual) / 2), 50);
    expect(rampa(30)).toMatchObject({ classe: 'normal' });
    expect(rampa(30).graus).toBeCloseTo(16.7, 1);
    expect(rampa(40)).toMatchObject({ classe: 'alto' });
    expect(rampa(60)).toMatchObject({ classe: 'muito-alto' });
  });

  it('graus para exibir arredonda para baixo, sem contradizer a classe', () => {
    expect(grausParaExibir({ graus: 19.99 })).toBe(19);
    expect(grausParaExibir({ graus: 20 })).toBe(20);
    expect(grausParaExibir({ graus: 30.9 })).toBe(30);
  });

  it('as faixas da legenda cobrem as três classes, em ordem, com verde para a faixa normal', () => {
    expect(FAIXAS_INCLINACAO.map((f) => f.classe)).toEqual(['normal', 'alto', 'muito-alto']);
    expect(FAIXAS_INCLINACAO.map((f) => f.faixa)).toEqual(['< 20°', '20° – 30°', '> 30°']);
    expect(FAIXAS_INCLINACAO[0]!.cor).toBe('#2ecc40');
  });
});

describe('inclinação de um setor', () => {
  const setor = setorDe(RECIFE);

  it('usa 9 pontos: cantos, meios das bordas e centro, de norte para sul', () => {
    const pontos = pontosDeAmostra(setor);
    const l = limitesDoSetor(setor);
    expect(pontos).toHaveLength(9);
    expect(pontos[0]).toEqual({ lat: l.norte, lon: l.oeste });
    expect(pontos[4]).toEqual(centroDoSetor(setor));
    expect(pontos[8]).toEqual({ lat: l.sul, lon: l.leste });
  });

  it.each([
    ['plano', () => 30, 0],
    ['subindo 8% para leste', (leste: number) => 0.08 * leste, 8],
    ['subindo 22% para o norte', (_l: number, norte: number) => 0.22 * norte, 22],
    ['descendo 45% para leste', (leste: number) => -0.45 * leste, 45],
    ['subindo 70% para o norte', (_l: number, norte: number) => 0.7 * norte, 70],
  ])('terreno %s → %d%%', async (_nome, f, esperado) => {
    const r = await inclinacaoDoSetor(setor, terreno(f));
    const graus = (Math.atan(esperado / 100) * 180) / Math.PI;
    expect(r.percentual).toBeCloseTo(esperado, 1);
    expect(r.graus).toBeCloseTo(graus, 1);
    expect(r.classe).toBe(esperado < 40 ? 'normal' : esperado < 60 ? 'alto' : 'muito-alto');
  });

  it('consulta cada ponto passando só a coordenada (regressão: índice do map virava opção da consulta)', async () => {
    const consultar = vi.fn((...argumentos: unknown[]) =>
      argumentos.length === 1 ? Promise.resolve(10) : Promise.reject(new Error('argumentos inesperados')),
    );
    await expect(inclinacaoDoSetor(setor, consultar as (p: Coordenada) => Promise<number>)).resolves.toMatchObject({
      percentual: 0,
    });
    expect(consultar).toHaveBeenCalledTimes(9);
  });

  it('funciona com a consulta real de altitude, lendo de um tile em memória', async () => {
    // Tile sintético: a altitude sobe 1 m a cada pixel para leste.
    const tile = new Float32Array(256 * 256);
    for (let i = 0; i < tile.length; i++) tile[i] = i % 256;
    const carregar = vi.fn().mockResolvedValue(tile);
    const consultar = (p: Coordenada) => consultarAltitude(p, carregar);
    const r = await inclinacaoDoSetor(setor, consultar);
    // ~9,5 m por pixel no zoom 14 nesta latitude → cerca de 10% de inclinação.
    expect(r.percentual).toBeGreaterThan(7);
    expect(r.percentual).toBeLessThan(14);
  });

  it('falha se a altitude não puder ser consultada', async () => {
    await expect(inclinacaoDoSetor(setor, () => Promise.reject(new Error('sem rede')))).rejects.toThrow('sem rede');
  });
});

describe('useSetorAtual (cruza a posição com a grade)', () => {
  it('sem posição, não calcula', () => {
    const consultar = vi.fn();
    const { result } = renderHook(() => useSetorAtual(null, consultar));
    expect(result.current).toEqual({ status: 'sem-posicao' });
    expect(consultar).not.toHaveBeenCalled();
  });

  it('informa o setor do usuário e a inclinação dele', async () => {
    const consultar = terreno((leste) => 0.45 * leste); // 24°
    const { result } = renderHook(() => useSetorAtual(RECIFE, consultar));
    expect(result.current).toMatchObject({ status: 'carregando', setor: setorDe(RECIFE) });
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current).toMatchObject({ setor: setorDe(RECIFE), inclinacao: { classe: 'alto' } });
  });

  it('não recalcula ao andar dentro do mesmo setor; recalcula ao mudar de setor', async () => {
    const consultar = vi.fn(terreno(() => 10));
    const centro = centroDoSetor(setorDe(RECIFE));
    const { result, rerender } = renderHook(({ p }) => useSetorAtual(p, consultar), { initialProps: { p: centro } });
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(consultar).toHaveBeenCalledTimes(9);

    rerender({ p: { lat: centro.lat + 0.0001, lon: centro.lon + 0.0001 } }); // ~11 m
    expect(consultar).toHaveBeenCalledTimes(9);

    rerender({ p: { lat: centro.lat + 0.002, lon: centro.lon } }); // ~220 m ao norte
    await waitFor(() => expect(consultar).toHaveBeenCalledTimes(18));
  });

  it('informa erro, mantendo o setor, quando o relevo falha', async () => {
    const { result } = renderHook(() => useSetorAtual(RECIFE, () => Promise.reject(new Error('x'))));
    await waitFor(() => expect(result.current).toEqual({ status: 'erro', setor: setorDe(RECIFE) }));
  });
});

describe('grade no mapa', () => {
  function criarMapa(zoom: number) {
    const el = document.createElement('div');
    document.body.append(el);
    // O jsdom não calcula tamanhos; informa um mapa de 400 × 300 px.
    Object.defineProperty(el, 'clientWidth', { value: 400 });
    Object.defineProperty(el, 'clientHeight', { value: 300 });
    return L.map(el, { center: [RECIFE.lat, RECIFE.lon], zoom, zoomAnimation: false });
  }

  it('abaixo do zoom mínimo não desenha a grade', () => {
    const camada = new CamadaSetores(criarMapa(GRADE.zoomMinimo - 1), terreno(() => 0));
    expect(camada.desenhar({ preencher: false })).toBe(0);
  });

  it('no zoom 16 desenha os setores visíveis e pinta cada um pela inclinação', async () => {
    const mapa = criarMapa(16);
    const camada = new CamadaSetores(mapa, terreno((leste) => 0.45 * leste)); // 24°
    const total = camada.desenhar({ preencher: true });
    // 400 × 300 px a ~2,4 m/px ≈ 950 m × 710 m → cerca de 10 × 8 setores (mais as bordas).
    expect(total).toBeGreaterThan(60);
    expect(total).toBeLessThan(140);
    const formas = () => [...mapa.getContainer().querySelectorAll('path.setor')];
    expect(formas()).toHaveLength(total);
    const corAlto = FAIXAS_INCLINACAO.find((f) => f.classe === 'alto')!.cor;
    await waitFor(() => expect(formas().every((f) => f.getAttribute('fill') === corAlto)).toBe(true));
  });

  it('sem preenchimento, desenha só as linhas; e destaca o setor do usuário', () => {
    const mapa = criarMapa(16);
    const camada = new CamadaSetores(mapa, terreno(() => 0));
    camada.desenhar({ preencher: false, destaque: { setor: setorDe(RECIFE), cor: '#e5262b' } });
    const container = mapa.getContainer();
    expect([...container.querySelectorAll('path.setor')].every((f) => f.getAttribute('fill') === 'none')).toBe(true);
    const destaque = container.querySelectorAll('path.setor-usuario');
    expect(destaque).toHaveLength(1);
    expect(destaque[0]!.getAttribute('stroke')).toBe('#e5262b');
  });

  it('remover limpa o mapa', () => {
    const mapa = criarMapa(16);
    const camada = new CamadaSetores(mapa, terreno(() => 0));
    camada.desenhar({ preencher: false });
    camada.remover();
    expect(mapa.getContainer().querySelectorAll('path.setor')).toHaveLength(0);
  });
});

describe('inclinação na interface do mapa', () => {
  const aqui: EstadoLocalizacao = { modo: 'simulado', status: 'ok', posicao: RECIFE, naCobertura: true, nomeLocal: 'Teste' };
  const setor = setorDe(RECIFE);

  it('abre no modo inclinação; com o mapa afastado, mostra a altitude e pede para aproximar', () => {
    render(<MapaBase />);
    const el = screen.getByLabelText('Mapa').querySelector<HTMLElement>('.mapa__leaflet')!;
    expect(el.dataset.relevo).toBe('inclinacao');
    expect(screen.getByRole('button', { name: 'Ocultar inclinação dos setores' }).getAttribute('aria-pressed')).toBe('true');
    // Mapa aberto no estado inteiro: os setores não cabem, então vale a altitude.
    expect(screen.getByRole('group', { name: 'Legenda de altitude' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Legenda de inclinação' })).toBeNull();
    expect(screen.getByText('Aproxime o mapa para ver a inclinação dos setores de 100 m.')).toBeTruthy();
  });

  it('com o mapa aproximado no usuário, mostra a legenda das faixas de inclinação', async () => {
    render(<MapaBase localizacao={aqui} />);
    const legenda = await screen.findByRole('group', { name: 'Legenda de inclinação' });
    for (const texto of ['Relevo / Inclinação', 'Normal (< 20°)', 'Alto (20° – 30°)', 'Muito alto (> 30°)']) {
      expect(legenda.textContent).toContain(texto);
    }
    expect(screen.queryByRole('group', { name: 'Legenda de altitude' })).toBeNull();
    expect(screen.queryByText(/Aproxime o mapa/)).toBeNull();
  });

  it('os botões alternam entre inclinação, altitude e nenhuma camada', async () => {
    render(<MapaBase localizacao={aqui} />);
    const el = screen.getByLabelText('Mapa').querySelector<HTMLElement>('.mapa__leaflet')!;
    await screen.findByRole('group', { name: 'Legenda de inclinação' });

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar altitude' }));
    expect(el.dataset.relevo).toBe('altitude');
    expect(screen.getByRole('group', { name: 'Legenda de altitude' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Legenda de inclinação' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar altitude' }));
    expect(el.dataset.relevo).toBe('nenhum');
    expect(screen.queryByRole('group', { name: /Legenda/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar inclinação dos setores' }));
    expect(el.dataset.relevo).toBe('inclinacao');
  });

  it('mostra a inclinação do setor do usuário conforme o estado do cálculo', () => {
    const { rerender } = render(<MapaBase localizacao={aqui} setorAtual={{ status: 'carregando', setor }} />);
    expect(screen.getByText('Inclinação: calculando…')).toBeTruthy();
    rerender(
      <MapaBase
        localizacao={aqui}
        setorAtual={{ status: 'ok', setor, inclinacao: { percentual: 45.6, graus: 24.5, classe: 'alto' } }}
      />,
    );
    expect(screen.getByText(/Inclinação do setor: 24° \(\s*alto\)/)).toBeTruthy();
    rerender(<MapaBase localizacao={aqui} setorAtual={{ status: 'erro', setor }} />);
    expect(screen.getByText('Inclinação indisponível')).toBeTruthy();
  });
});
