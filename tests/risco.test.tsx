import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { PainelRisco } from '@/components/inicio/PainelRisco';
import type { IntensidadeChuva } from '@/config/clima';
import type { ClasseInclinacao } from '@/config/inclinacao';
import { LIMITES_PE } from '@/config/app';
import { faixaDaChuva, type ResumoClima } from '@/domain/clima';
import type { Coordenada } from '@/domain/geografia';
import { METROS_POR_GRAU_LON } from '@/domain/grade';
import { classificarInclinacao } from '@/domain/inclinacao';
import { avaliacaoDeDemonstracao, avaliarRisco, type ChuvaParaRisco, type InclinacaoParaRisco } from '@/domain/risco';
import type { EstadoRisco } from '@/types';

// Terreno controlado pelo teste: rampa para leste com a inclinação escolhida.
const terreno = vi.hoisted(() => ({ percentual: 0, falhar: false }));
vi.mock('@/services/terreno', async (original) => ({
  ...(await original<typeof import('@/services/terreno')>()),
  consultarAltitude: (p: Coordenada) =>
    terreno.falhar
      ? Promise.reject(new Error('sem relevo'))
      : Promise.resolve(100 + (terreno.percentual / 100) * (p.lon - LIMITES_PE.oeste) * METROS_POR_GRAU_LON),
}));

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'geolocation');
  terreno.percentual = 0;
  terreno.falhar = false;
});

const MM: Record<IntensidadeChuva, number> = { 'sem-chuva': 0, fraca: 2, moderada: 10, forte: 30, 'muito-forte': 70 };
const PERCENTUAL: Record<ClasseInclinacao, number> = { baixo: 2, moderado: 10, alto: 22, 'muito-alto': 45 };

function inclinacao(classe: ClasseInclinacao): InclinacaoParaRisco {
  const percentual = PERCENTUAL[classe];
  return { status: 'ok', inclinacao: { percentual, graus: 0, classe: classificarInclinacao(percentual) } };
}

function clima(intensidade: IntensidadeChuva): ResumoClima {
  const mm = MM[intensidade];
  const faixa = faixaDaChuva(mm);
  return {
    temperatura: 25,
    probabilidadeChuva: 80,
    volumeMm: mm,
    picoMmPorHora: mm,
    intensidade: faixa.intensidade,
    rotuloIntensidade: faixa.rotulo,
    horas: [],
  };
}

const chuva = (intensidade: IntensidadeChuva): ChuvaParaRisco => ({ status: 'ok', clima: clima(intensidade) });

describe('motor de risco: inclinação × chuva', () => {
  const R = 'risco', A = 'atencao', S = 'seguro';
  // prettier-ignore
  const MATRIZ: [ClasseInclinacao, IntensidadeChuva, EstadoRisco][] = [
    ['baixo', 'sem-chuva', S],      ['baixo', 'fraca', S],      ['baixo', 'moderada', S],      ['baixo', 'forte', S],      ['baixo', 'muito-forte', S],
    ['moderado', 'sem-chuva', S],   ['moderado', 'fraca', S],   ['moderado', 'moderada', A],   ['moderado', 'forte', A],   ['moderado', 'muito-forte', A],
    ['alto', 'sem-chuva', R],       ['alto', 'fraca', R],       ['alto', 'moderada', R],       ['alto', 'forte', R],       ['alto', 'muito-forte', R],
    ['muito-alto', 'sem-chuva', R], ['muito-alto', 'fraca', R], ['muito-alto', 'moderada', R], ['muito-alto', 'forte', R], ['muito-alto', 'muito-forte', R],
  ];

  it.each(MATRIZ)('inclinação %s + chuva %s → %s', (classe, intensidade, esperado) => {
    expect(avaliarRisco(inclinacao(classe), chuva(intensidade)).estado).toBe(esperado);
  });

  it('zona de risco com chuva significativa: alerta máximo, citando inclinação e chuva', () => {
    const r = avaliarRisco(inclinacao('muito-alto'), chuva('forte'));
    expect(r).toMatchObject({ estado: 'risco', titulo: 'Você está em risco!', chuvaAgrava: true });
    expect(r.texto).toBe('Seu setor tem inclinação de 45% (muito alto) e há previsão de chuva forte nas próximas 3 h.');
  });

  it('zona de risco sem chuva significativa: continua em risco, com título mais brando', () => {
    const r = avaliarRisco(inclinacao('alto'), chuva('fraca'));
    expect(r).toMatchObject({ estado: 'risco', titulo: 'Você está em área de risco', chuvaAgrava: false });
    expect(r.texto).toContain('22% (alto)');
    expect(r.texto).toContain('não há previsão de chuva significativa');
  });

  it('área segura explica o motivo', () => {
    expect(avaliarRisco(inclinacao('baixo'), chuva('forte')).texto).toBe(
      'Seu setor tem inclinação de 2% (baixo) e há previsão de chuva forte nas próximas 3 h.',
    );
  });

  describe('previsão do tempo indisponível ou carregando', () => {
    it.each([
      ['alto', 'risco'],
      ['muito-alto', 'risco'],
      ['moderado', 'atencao'], // por cautela: sem saber da chuva, não afirma segurança
      ['baixo', 'seguro'],
    ] as [ClasseInclinacao, EstadoRisco][])('inclinação %s → %s', (classe, esperado) => {
      for (const status of ['erro', 'carregando'] as const) {
        const r = avaliarRisco(inclinacao(classe), { status });
        expect(r.estado).toBe(esperado);
        expect(r.chuvaAgrava).toBe(false);
      }
    });

    it('o texto diz que a previsão está indisponível ou sendo consultada, sem citar chuva', () => {
      expect(avaliarRisco(inclinacao('alto'), { status: 'erro' }).texto).toContain('previsão do tempo está indisponível');
      expect(avaliarRisco(inclinacao('alto'), { status: 'carregando' }).texto).toContain('ainda está sendo consultada');
      expect(avaliarRisco(inclinacao('baixo'), { status: 'erro' }).texto).toBe('Seu setor tem inclinação de 2% (baixo).');
    });
  });

  describe('sem inclinação conhecida, nunca afirma segurança nem risco', () => {
    it.each([
      [{ status: 'sem-posicao' }, 'Aguardando sua localização.'],
      [{ status: 'sem-posicao', aviso: 'Permissão de localização negada.' }, 'Permissão de localização negada.'],
      [{ status: 'carregando' }, 'Calculando a inclinação do seu setor…'],
      [{ status: 'erro' }, 'Não foi possível obter os dados de relevo do seu setor.'],
    ] as [InclinacaoParaRisco, string][])('%o', (entrada, texto) => {
      // Mesmo com chuva muito forte prevista.
      expect(avaliarRisco(entrada, chuva('muito-forte'))).toEqual({
        estado: 'indefinido',
        titulo: 'Risco ainda não avaliado',
        texto,
        chuvaAgrava: false,
      });
    });
  });

  it('o modo demonstração tem uma avaliação para cada estado', () => {
    for (const estado of ['indefinido', 'seguro', 'atencao', 'risco'] as const) {
      expect(avaliacaoDeDemonstracao(estado).estado).toBe(estado);
    }
  });
});

describe('painel de risco', () => {
  it('risco usa role=alert; os demais, role=status', () => {
    const { rerender } = render(<PainelRisco avaliacao={avaliacaoDeDemonstracao('risco')} />);
    expect(screen.getByRole('alert').textContent).toContain('Você está em risco!');
    rerender(<PainelRisco avaliacao={avaliacaoDeDemonstracao('atencao')} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Atenção' })).toBeTruthy();
  });

  it('avisa quando o estado é simulado', () => {
    const { rerender } = render(<PainelRisco avaliacao={avaliacaoDeDemonstracao('risco')} simulado />);
    expect(screen.getByText('Estado simulado (modo demonstração)')).toBeTruthy();
    rerender(<PainelRisco avaliacao={avaliacaoDeDemonstracao('risco')} />);
    expect(screen.queryByText('Estado simulado (modo demonstração)')).toBeNull();
  });
});

describe('risco no app, de ponta a ponta (GPS → setor → inclinação × chuva → painel)', () => {
  /** GPS simulado que entrega uma posição em Recife assim que o app pede. */
  function gpsEmRecife() {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (ok: (p: unknown) => void) => {
          queueMicrotask(() => act(() => ok({ coords: { latitude: -8.0153, longitude: -34.9125, accuracy: 10 } })));
          return 1;
        },
        clearWatch: () => {},
      },
    });
  }

  /** Rede simulada: previsão com o volume informado em cada uma das próximas horas. */
  function previsao(mmPorHora: number) {
    const inicio = Math.floor(Date.now() / 3_600_000) * 3600;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            current: { temperature_2m: 24 },
            hourly: {
              time: [0, 1, 2].map((i) => inicio + i * 3600),
              precipitation_probability: [85, 85, 85],
              precipitation: [mmPorHora, mmPorHora, mmPorHora],
            },
          }),
      }),
    );
  }

  it('encosta de 40% com chuva forte: alerta de risco e instruções de emergência', async () => {
    gpsEmRecife();
    terreno.percentual = 40;
    previsao(30);
    render(<App />);
    const alerta = await screen.findByRole('alert');
    await waitFor(() => expect(alerta.textContent).toContain('Você está em risco!'));
    expect(alerta.textContent).toContain('inclinação de 40% (muito alto) e há previsão de chuva forte');
    expect(alerta.textContent).not.toContain('Estado simulado');
    expect(screen.getByRole('heading', { name: 'O que fazer agora:' })).toBeTruthy();
  });

  it('encosta de 20% sem chuva: área de risco, com título mais brando', async () => {
    gpsEmRecife();
    terreno.percentual = 20;
    previsao(0);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Você está em área de risco'));
    expect(screen.getByRole('alert').textContent).toContain('20% (alto)');
  });

  it('terreno de 10% com chuva moderada: atenção', async () => {
    gpsEmRecife();
    terreno.percentual = 10;
    previsao(12);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Atenção' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Fique atento:' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('terreno plano com chuva forte: área segura', async () => {
    gpsEmRecife();
    terreno.percentual = 1;
    previsao(30);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Para se prevenir:' })).toBeTruthy();
  });

  it('sem dados de relevo: não avalia, e diz por quê', async () => {
    gpsEmRecife();
    terreno.falhar = true;
    previsao(30);
    render(<App />);
    expect(await screen.findByText('Não foi possível obter os dados de relevo do seu setor.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Risco ainda não avaliado' })).toBeTruthy();
  });

  it('sem localização: não avalia, mostrando o motivo da localização', async () => {
    previsao(30); // chuva forte no local padrão não basta para afirmar risco
    render(<App />);
    await screen.findByText('Chuva forte');
    const painel = screen.getByRole('heading', { name: 'Risco ainda não avaliado' }).closest('section')!;
    expect(painel.textContent).toContain('Este navegador não oferece localização.');
  });

  it('o modo demonstração sobrepõe o resultado real, com aviso; "Automático" volta ao real', async () => {
    gpsEmRecife();
    terreno.percentual = 1;
    previsao(0);
    render(<App />);
    await screen.findByRole('heading', { name: 'Você está em área segura' });

    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Em risco' }));
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(screen.getByRole('alert').textContent).toContain('Estado simulado (modo demonstração)');

    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Automático' }));
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
    expect(screen.queryByText('Estado simulado (modo demonstração)')).toBeNull();
  });
});
