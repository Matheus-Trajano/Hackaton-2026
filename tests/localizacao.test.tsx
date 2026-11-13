import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { MapaBase } from '@/components/mapa/MapaBase';
import { MAPA } from '@/config/mapa';
import { PONTOS_DEMO, PONTO_DEMO_PADRAO } from '@/config/pontosDemo';
import { dentroDePernambuco } from '@/domain/geografia';
import {
  formatarCoordenada,
  mensagemLocalizacao,
  posicaoUtilizavel,
  statusDoErro,
  type EstadoLocalizacao,
} from '@/domain/localizacao';
import { useLocalizacao } from '@/hooks/useLocalizacao';

type Sucesso = (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void;
type Falha = (e: { code: number }) => void;

/** Substitui `navigator.geolocation` por uma versão controlada pelo teste. */
function simularGps() {
  let sucesso: Sucesso = () => {};
  let falha: Falha = () => {};
  const clearWatch = vi.fn();
  const watchPosition = vi.fn((ok: Sucesso, erro: Falha) => {
    sucesso = ok;
    falha = erro;
    return 7;
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { watchPosition, clearWatch },
  });
  return {
    watchPosition,
    clearWatch,
    posicionar: (latitude: number, longitude: number, accuracy = 12) =>
      act(() => sucesso({ coords: { latitude, longitude, accuracy } })),
    falhar: (code: number) => act(() => falha({ code })),
  };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'geolocation');
});

describe('regras de localização', () => {
  it('traduz os erros do navegador', () => {
    expect(statusDoErro(1)).toBe('negada');
    expect(statusDoErro(2)).toBe('indisponivel');
    expect(statusDoErro(3)).toBe('indisponivel');
  });

  it('formata coordenadas com 4 casas', () => {
    expect(formatarCoordenada({ lat: -8.01534, lon: -34.9125 })).toBe('-8.0153, -34.9125');
  });

  it('só considera utilizável a posição obtida e dentro da cobertura', () => {
    const base: EstadoLocalizacao = { modo: 'gps', status: 'ok', posicao: { lat: -8, lon: -35 }, naCobertura: true };
    expect(posicaoUtilizavel(base)).toBe(true);
    expect(posicaoUtilizavel({ ...base, naCobertura: false })).toBe(false);
    expect(posicaoUtilizavel({ modo: 'gps', status: 'negada', naCobertura: false })).toBe(false);
  });

  it('gera o aviso certo para cada situação', () => {
    const sem = (status: EstadoLocalizacao['status']): EstadoLocalizacao => ({ modo: 'gps', status, naCobertura: false });
    expect(mensagemLocalizacao(sem('buscando'))).toContain('Obtendo');
    expect(mensagemLocalizacao(sem('negada'))).toContain('negada');
    expect(mensagemLocalizacao(sem('indisponivel'))).toContain('Não foi possível');
    expect(mensagemLocalizacao(sem('nao-suportada'))).toContain('não oferece');
    expect(mensagemLocalizacao({ modo: 'gps', status: 'ok', posicao: { lat: -23.5, lon: -46.6 }, naCobertura: false })).toContain(
      'fora da área de cobertura',
    );
    expect(mensagemLocalizacao({ modo: 'gps', status: 'ok', posicao: { lat: -8, lon: -35 }, naCobertura: true })).toBeNull();
  });

  it('todos os pontos de demonstração ficam em Pernambuco e têm id único', () => {
    for (const ponto of PONTOS_DEMO) expect(dentroDePernambuco(ponto), ponto.nome).toBe(true);
    expect(new Set(PONTOS_DEMO.map((p) => p.id)).size).toBe(PONTOS_DEMO.length);
  });
});

describe('useLocalizacao', () => {
  it('sem suporte a geolocalização, informa "nao-suportada"', () => {
    const { result } = renderHook(() => useLocalizacao());
    expect(result.current.estado.status).toBe('nao-suportada');
  });

  it('começa buscando e passa a "ok" com posição e precisão', () => {
    const gps = simularGps();
    const { result } = renderHook(() => useLocalizacao());
    expect(result.current.estado).toMatchObject({ modo: 'gps', status: 'buscando', naCobertura: false });

    gps.posicionar(-8.0476, -34.877, 15);
    expect(result.current.estado).toMatchObject({
      status: 'ok',
      posicao: { lat: -8.0476, lon: -34.877 },
      precisaoMetros: 15,
      naCobertura: true,
    });
  });

  it('permissão negada vira status "negada", sem posição', () => {
    const gps = simularGps();
    const { result } = renderHook(() => useLocalizacao());
    gps.falhar(1);
    expect(result.current.estado.status).toBe('negada');
    expect(result.current.estado.posicao).toBeUndefined();
  });

  it('posição fora de Pernambuco é marcada como fora da cobertura', () => {
    const gps = simularGps();
    const { result } = renderHook(() => useLocalizacao());
    gps.posicionar(-23.5505, -46.6333);
    expect(result.current.estado).toMatchObject({ status: 'ok', naCobertura: false });
    expect(posicaoUtilizavel(result.current.estado)).toBe(false);
  });

  it('falha passageira não descarta posição já obtida; negação descarta', () => {
    const gps = simularGps();
    const { result } = renderHook(() => useLocalizacao());
    gps.posicionar(-8.05, -34.9);
    gps.falhar(3);
    expect(result.current.estado.status).toBe('ok');
    gps.falhar(1);
    expect(result.current.estado.status).toBe('negada');
  });

  it('alterna para ponto de demonstração e volta ao GPS, encerrando e reabrindo o acompanhamento', () => {
    const gps = simularGps();
    const { result } = renderHook(() => useLocalizacao());
    expect(gps.watchPosition).toHaveBeenCalledTimes(1);

    act(() => result.current.usarPontoDemo(PONTO_DEMO_PADRAO.id));
    expect(gps.clearWatch).toHaveBeenCalledWith(7);
    expect(result.current.pontoDemoId).toBe(PONTO_DEMO_PADRAO.id);
    expect(result.current.estado).toMatchObject({
      modo: 'simulado',
      status: 'ok',
      naCobertura: true,
      nomeLocal: PONTO_DEMO_PADRAO.nome,
      posicao: { lat: PONTO_DEMO_PADRAO.lat, lon: PONTO_DEMO_PADRAO.lon },
    });

    act(() => result.current.usarGps());
    expect(gps.watchPosition).toHaveBeenCalledTimes(2);
    expect(result.current.estado).toMatchObject({ modo: 'gps', status: 'buscando' });
  });

  it('ignora id de ponto de demonstração desconhecido', () => {
    simularGps();
    const { result } = renderHook(() => useLocalizacao());
    act(() => result.current.usarPontoDemo('nao-existe'));
    expect(result.current.estado.modo).toBe('gps');
  });
});

describe('localização no mapa', () => {
  const noMorro: EstadoLocalizacao = {
    modo: 'gps',
    status: 'ok',
    posicao: { lat: -8.0153, lon: -34.9125 },
    precisaoMetros: 18,
    naCobertura: true,
  };

  it('mostra marcador, coordenadas e precisão, e foca no usuário', async () => {
    render(<MapaBase localizacao={noMorro} />);
    const mapa = screen.getByLabelText('Mapa');
    expect(mapa.querySelector('.marcador-usuario')).toBeTruthy();
    expect(screen.getByText('Sua localização')).toBeTruthy();
    expect(screen.getByText('-8.0153, -34.9125')).toBeTruthy();
    expect(screen.getByText('Precisão: ±18 m')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Centralizar na minha localização' })).toBeTruthy();
    await waitFor(() =>
      expect(mapa.querySelector<HTMLElement>('.mapa__leaflet')?.dataset.zoom).toBe(String(MAPA.zoomUsuario)),
    );
  });

  it('fora da cobertura: sem marcador, com aviso e oferta de demonstração', () => {
    const aoUsar = vi.fn();
    render(
      <MapaBase
        localizacao={{ modo: 'gps', status: 'ok', posicao: { lat: -23.55, lon: -46.63 }, naCobertura: false }}
        aoUsarDemonstracao={aoUsar}
      />,
    );
    expect(screen.getByLabelText('Mapa').querySelector('.marcador-usuario')).toBeNull();
    expect(screen.getByText(/fora da área de cobertura/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Usar local de demonstração' }));
    expect(aoUsar).toHaveBeenCalledOnce();
  });

  it('enquanto busca, avisa mas não oferece demonstração', () => {
    render(<MapaBase localizacao={{ modo: 'gps', status: 'buscando', naCobertura: false }} aoUsarDemonstracao={() => {}} />);
    expect(screen.getByText('Obtendo sua localização…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Usar local de demonstração' })).toBeNull();
  });

  it('remove o marcador quando a localização deixa de estar disponível', () => {
    const { rerender } = render(<MapaBase localizacao={noMorro} />);
    rerender(<MapaBase localizacao={{ modo: 'gps', status: 'negada', naCobertura: false }} />);
    expect(screen.getByLabelText('Mapa').querySelector('.marcador-usuario')).toBeNull();
    expect(screen.queryByText('Sua localização')).toBeNull();
  });
});

describe('localização no app', () => {
  it('com permissão negada, o botão do mapa ativa o local de demonstração padrão', () => {
    const gps = simularGps();
    render(<App />);
    gps.falhar(1);
    fireEvent.click(screen.getByRole('button', { name: 'Usar local de demonstração' }));
    expect(screen.getByText('Localização simulada')).toBeTruthy();
    expect(screen.getByText(formatarCoordenada(PONTO_DEMO_PADRAO))).toBeTruthy();
  });

  it('a aba Sobre permite escolher um ponto de demonstração e voltar ao GPS', () => {
    const gps = simularGps();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    const boaViagem = PONTOS_DEMO.find((p) => p.id === 'boa-viagem')!;
    const botao = screen.getByRole('button', { name: new RegExp(`^${boaViagem.nome.replace(/[()]/g, '\\$&')}`) });
    fireEvent.click(botao);
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(new RegExp(`Simulada: .*${formatarCoordenada(boaViagem).replace('.', '\\.')}`))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^GPS do aparelho/ }));
    gps.posicionar(-8.0476, -34.877);
    expect(screen.getByText(/GPS do aparelho \(-8\.0476, -34\.8770\)/)).toBeTruthy();
  });
});
