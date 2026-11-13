import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { PainelRisco } from '@/components/inicio/PainelRisco';
import type { IntensidadeChuva } from '@/config/clima';
import type { ClasseInclinacao } from '@/config/inclinacao';
import { LIMITES_PE } from '@/config/app';
import { faixaDaChuva, type ResumoClima } from '@/domain/clima';
import type { Coordenada } from '@/domain/geografia';
import { METROS_POR_GRAU_LON } from '@/domain/grade';
import { classificarInclinacao, formatarGraus } from '@/domain/inclinacao';
import { avaliacaoDeDemonstracao, avaliarRisco, type ChuvaParaRisco, type InclinacaoParaRisco } from '@/domain/risco';
import type { EstadoRisco } from '@/types';

// Terreno controlado pelo teste: rampa para leste com a inclinação escolhida.
const terreno = vi.hoisted(() => ({ percentual: 0, falhar: false }));
vi.mock('@/services/terreno', async (original) => ({
  ...(await original<typeof import('@/services/terreno')>()),
  // Como a função real, tem parâmetros opcionais: receber argumentos a mais é erro de quem chama.
  consultarAltitude: (p: Coordenada, ...extras: unknown[]) =>
    terreno.falhar || extras.length > 0
      ? Promise.reject(new Error(extras.length > 0 ? 'argumentos inesperados' : 'sem relevo'))
      : Promise.resolve(100 + (terreno.percentual / 100) * (p.lon - LIMITES_PE.oeste) * METROS_POR_GRAU_LON),
}));

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'geolocation');
  terreno.percentual = 0;
  terreno.falhar = false;
});

const MM: Record<IntensidadeChuva, number> = { 'sem-chuva': 0, fraca: 2, moderada: 10, forte: 30, 'muito-forte': 70 };
const GRAUS: Record<ClasseInclinacao, number> = { normal: 5, moderado: 15, alto: 24, 'muito-alto': 50 };
/** Percentual de uma rampa com o ângulo informado. */
const rampa = (graus: number) => Math.tan((graus * Math.PI) / 180) * 100;

function inclinacao(classe: ClasseInclinacao, graus: number = GRAUS[classe]): InclinacaoParaRisco {
  return { status: 'ok', inclinacao: { percentual: rampa(graus), graus, classe: classificarInclinacao(graus) } };
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
  const R = 'risco', A = 'atencao', S = 'seguro'; // A = alerta de alagamento
  // prettier-ignore
  const MATRIZ: [ClasseInclinacao, IntensidadeChuva, EstadoRisco][] = [
    ['normal', 'sem-chuva', S],     ['normal', 'fraca', S],     ['normal', 'moderada', A],     ['normal', 'forte', A],     ['normal', 'muito-forte', A],
    ['moderado', 'sem-chuva', S],   ['moderado', 'fraca', S],   ['moderado', 'moderada', A],   ['moderado', 'forte', A],   ['moderado', 'muito-forte', A],
    ['alto', 'sem-chuva', R],       ['alto', 'fraca', R],       ['alto', 'moderada', R],       ['alto', 'forte', R],       ['alto', 'muito-forte', R],
    ['muito-alto', 'sem-chuva', R], ['muito-alto', 'fraca', R], ['muito-alto', 'moderada', R], ['muito-alto', 'forte', R], ['muito-alto', 'muito-forte', R],
  ];

  it.each(MATRIZ)('inclinação %s + chuva %s → %s', (classe, intensidade, esperado) => {
    expect(avaliarRisco(inclinacao(classe), chuva(intensidade)).estado).toBe(esperado);
  });

  it.each([
    [0, 'atencao', 'alagamento', 'seguro', 'seguro'],
    [10.99, 'atencao', 'alagamento', 'seguro', 'seguro'],
    [11, 'atencao', 'deslizamento', 'seguro', 'atencao'],
    [19.99, 'atencao', 'deslizamento', 'seguro', 'atencao'],
    [20, 'risco', 'deslizamento', 'risco', 'risco'],
    [44.99, 'risco', 'deslizamento', 'risco', 'risco'],
    [45, 'risco', 'deslizamento', 'risco', 'risco'],
    [60, 'risco', 'deslizamento', 'risco', 'risco'],
  ] as [number, EstadoRisco, string, EstadoRisco, EstadoRisco][])(
    '%d°: com chuva muito forte → %s (%s); sem chuva → %s; sem previsão → %s',
    (graus, comChuva, perigo, semChuva, semPrevisao) => {
      expect(avaliarRisco(inclinacao('normal', graus), chuva('muito-forte'))).toMatchObject({ estado: comChuva, perigo });
      expect(avaliarRisco(inclinacao('normal', graus), chuva('sem-chuva')).estado).toBe(semChuva);
      expect(avaliarRisco(inclinacao('normal', graus), { status: 'erro' }).estado).toBe(semPrevisao);
    },
  );

  describe('inclinação moderada (11° a 20°)', () => {
    it('com chuva significativa: atenção para deslizamento, sem alerta de alagamento', () => {
      const r = avaliarRisco(inclinacao('moderado'), chuva('forte'));
      expect(r).toMatchObject({ estado: 'atencao', titulo: 'Atenção', perigo: 'deslizamento', chuvaAgrava: true });
      expect(r.texto).toBe(
        'Seu setor tem inclinação de 15° (moderado) e há previsão de chuva forte nas próximas 3 h. Fique atento a sinais de deslizamento.',
      );
    });

    it('sem chuva significativa: área segura', () => {
      const r = avaliarRisco(inclinacao('moderado'), chuva('fraca'));
      expect(r).toMatchObject({ estado: 'seguro', titulo: 'Você está em área segura', perigo: null });
      expect(r.texto).toContain('15° (moderado)');
    });

    it('sem previsão: atenção por cautela', () => {
      const r = avaliarRisco(inclinacao('moderado'), { status: 'erro' });
      expect(r).toMatchObject({ estado: 'atencao', titulo: 'Atenção', perigo: 'deslizamento', chuvaAgrava: false });
      expect(r.texto).toContain('previsão do tempo está indisponível');
    });
  });

  describe('alerta de alagamento em setor de inclinação normal', () => {
    it.each(['moderada', 'forte', 'muito-forte'] as IntensidadeChuva[])('chuva %s: alerta de alagamento', (intensidade) => {
      const r = avaliarRisco(inclinacao('normal'), chuva(intensidade));
      expect(r).toMatchObject({ estado: 'atencao', titulo: 'Alerta de alagamento', perigo: 'alagamento', chuvaAgrava: true });
    });

    it.each(['sem-chuva', 'fraca'] as IntensidadeChuva[])('chuva %s: área segura, sem alerta', (intensidade) => {
      const r = avaliarRisco(inclinacao('normal'), chuva(intensidade));
      expect(r).toMatchObject({ estado: 'seguro', titulo: 'Você está em área segura', perigo: null });
    });

    it('o texto cita a inclinação, a chuva e o alagamento', () => {
      expect(avaliarRisco(inclinacao('normal'), chuva('forte')).texto).toBe(
        'Seu setor tem inclinação de 5° (normal) e há previsão de chuva forte nas próximas 3 h. Pode haver alagamento.',
      );
    });

    it('sem previsão disponível não há alerta de alagamento', () => {
      for (const status of ['erro', 'carregando'] as const) {
        expect(avaliarRisco(inclinacao('normal'), { status })).toMatchObject({ estado: 'seguro', perigo: null });
      }
    });

    it('setores de inclinação alta ou muito alta nunca recebem alerta de alagamento: o perigo é deslizamento', () => {
      for (const classe of ['alto', 'muito-alto'] as const) {
        for (const intensidade of Object.keys(MM) as IntensidadeChuva[]) {
          expect(avaliarRisco(inclinacao(classe), chuva(intensidade))).toMatchObject({ estado: 'risco', perigo: 'deslizamento' });
        }
      }
    });

    it('o alerta de alagamento só aparece abaixo de 11°; a atenção de deslizamento, só entre 11° e 20°', () => {
      for (let graus = 0; graus <= 60; graus += 0.5) {
        for (const intensidade of Object.keys(MM) as IntensidadeChuva[]) {
          const r = avaliarRisco(inclinacao('normal', graus), chuva(intensidade));
          if (r.perigo === 'alagamento') expect(graus).toBeLessThan(11);
          if (r.estado === 'atencao' && r.perigo === 'deslizamento') {
            expect(graus).toBeGreaterThanOrEqual(11);
            expect(graus).toBeLessThan(20);
          }
          if (r.estado === 'risco') expect(graus).toBeGreaterThanOrEqual(20);
        }
      }
    });
  });

  it('zona de risco com chuva significativa: alerta máximo, citando inclinação e chuva', () => {
    const r = avaliarRisco(inclinacao('muito-alto'), chuva('forte'));
    expect(r).toMatchObject({ estado: 'risco', titulo: 'Você está em risco!', chuvaAgrava: true });
    expect(r.texto).toBe('Seu setor tem inclinação de 50° (muito alto) e há previsão de chuva forte nas próximas 3 h.');
  });

  it('zona de risco sem chuva significativa: continua em risco, com título mais brando', () => {
    const r = avaliarRisco(inclinacao('alto'), chuva('fraca'));
    expect(r).toMatchObject({ estado: 'risco', titulo: 'Você está em área de risco', chuvaAgrava: false });
    expect(r.texto).toContain('24° (alto)');
    expect(r.texto).toContain('não há previsão de chuva significativa');
  });

  it('área segura explica o motivo', () => {
    expect(avaliarRisco(inclinacao('normal'), chuva('fraca')).texto).toBe(
      'Seu setor tem inclinação de 5° (normal) e não há previsão de chuva significativa nas próximas 3 h.',
    );
  });

  describe('previsão do tempo indisponível ou carregando', () => {
    it.each([
      ['alto', 'risco'],
      ['muito-alto', 'risco'],
      ['moderado', 'atencao'],
      ['normal', 'seguro'],
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
      expect(avaliarRisco(inclinacao('normal'), { status: 'erro' }).texto).toBe('Seu setor tem inclinação de 5° (normal).');
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
        perigo: null,
      });
    });
  });

  it('o modo demonstração tem uma avaliação para cada estado', () => {
    for (const estado of ['indefinido', 'seguro', 'atencao', 'risco'] as const) {
      expect(avaliacaoDeDemonstracao(estado).estado).toBe(estado);
    }
  });
});

describe('ângulo exibido no painel', () => {
  it.each([
    [0, '0°'],
    [5, '5°'],
    [9.04, '9°'],
    [16.7, '16,7°'],
    [16.699, '16,6°'],
    [14.99, '14,9°'], // arredonda para baixo: não aparece "15°" em setor normal
    [15, '15°'],
    [44.99, '44,9°'],
    [45, '45°'],
    [50.26, '50,2°'],
  ] as [number, string][])('%d° aparece como %s', (graus, texto) => {
    expect(formatarGraus(graus)).toBe(texto);
  });

  it('o painel mostra graus, e não percentual', () => {
    for (const graus of [0, 3, 14.99, 15, 30, 45, 60]) {
      for (const intensidade of Object.keys(MM) as IntensidadeChuva[]) {
        const { texto } = avaliarRisco(inclinacao('normal', graus), chuva(intensidade));
        expect(texto).toContain(`inclinação de ${formatarGraus(graus)} (`);
        expect(texto).not.toContain('%');
      }
    }
  });
});

describe('painel de risco', () => {
  it('risco usa role=alert; os demais, role=status', () => {
    const { rerender } = render(<PainelRisco avaliacao={avaliacaoDeDemonstracao('risco')} />);
    expect(screen.getByRole('alert').textContent).toContain('Você está em risco!');
    rerender(<PainelRisco avaliacao={avaliacaoDeDemonstracao('atencao')} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
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

  it('encosta de 50° (119%) com chuva forte: alerta de risco e instruções de emergência', async () => {
    gpsEmRecife();
    terreno.percentual = rampa(50);
    previsao(30);
    render(<App />);
    const alerta = await screen.findByRole('alert');
    await waitFor(() => expect(alerta.textContent).toContain('Você está em risco!'));
    expect(alerta.textContent).toContain('inclinação de 50° (muito alto) e há previsão de chuva forte');
    expect(alerta.textContent).not.toContain('Estado simulado');
    expect(screen.getByRole('heading', { name: 'O que fazer agora:' })).toBeTruthy();
  });

  it('encosta de 30% (16,7°, moderada) com chuva forte: atenção, com orientações de deslizamento', async () => {
    gpsEmRecife();
    terreno.percentual = 30;
    previsao(30);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Atenção' })).toBeTruthy();
    expect(screen.getByText(/inclinação de 16,6° \(moderado\) e há previsão de chuva forte/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Fique atento:' })).toBeTruthy();
    expect(screen.getByText(/Observe sinais de deslizamento/)).toBeTruthy();
    expect(screen.queryByText(/Não atravesse ruas alagadas/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('encosta de 30% (16,7°, moderada) sem chuva: área segura', async () => {
    gpsEmRecife();
    terreno.percentual = 30;
    previsao(0);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('encosta de 45% (24,2°) sem chuva: área de risco, com título mais brando', async () => {
    gpsEmRecife();
    terreno.percentual = 45;
    previsao(0);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Você está em área de risco'));
    expect(screen.getByRole('alert').textContent).toContain('24,2° (alto)');
  });

  it('terreno de 15% (8,5°) com chuva muito forte: alerta de alagamento, com orientações de alagamento', async () => {
    gpsEmRecife();
    terreno.percentual = 15;
    previsao(70);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
    expect(screen.getByText(/inclinação de 8,5° \(normal\) e há previsão de chuva muito forte.*Pode haver alagamento\./)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Fique atento:' })).toBeTruthy();
    expect(screen.getByText(/Não atravesse ruas alagadas/)).toBeTruthy();
    expect(screen.queryByText(/sinais de deslizamento/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('terreno plano com chuva moderada: alerta de alagamento', async () => {
    gpsEmRecife();
    terreno.percentual = 1;
    previsao(12);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
  });

  it('terreno plano sem chuva significativa: área segura', async () => {
    gpsEmRecife();
    terreno.percentual = 1;
    previsao(2);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Para se prevenir:' })).toBeTruthy();
    expect(screen.queryByText(/Não atravesse ruas alagadas/)).toBeNull();
  });

  it('encosta com chuva forte não mostra orientações de alagamento', async () => {
    gpsEmRecife();
    terreno.percentual = rampa(24);
    previsao(30);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Você está em risco!'));
    expect(screen.queryByText(/Não atravesse ruas alagadas/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Alerta de alagamento' })).toBeNull();
  });

  describe('chuva de teste (aba Sobre)', () => {
    /** Escolhe a chuva de teste na aba Sobre e volta para o Início. */
    function escolherChuva(rotulo: string) {
      fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
      fireEvent.click(within(screen.getByRole('group', { name: 'Chuva de teste' })).getByRole('button', { name: rotulo }));
      fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    }

    it('setor normal: fraca mantém área segura; moderada e forte geram alerta de alagamento', async () => {
      gpsEmRecife();
      terreno.percentual = 1;
      previsao(0);
      render(<App />);
      expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
      expect(screen.queryByText('Chuva simulada (modo demonstração)')).toBeNull();

      escolherChuva('Chuva fraca');
      expect(screen.getByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Para se prevenir:' })).toBeTruthy();
      expect(screen.getByText('Chuva simulada (modo demonstração)')).toBeTruthy();
      expect(within(screen.getByRole('region', { name: 'Previsão do tempo' })).getByText('Chuva fraca')).toBeTruthy();

      escolherChuva('Chuva moderada');
      expect(screen.getByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
      expect(screen.getByText(/há previsão de chuva moderada/)).toBeTruthy();
      expect(screen.getByText(/Não atravesse ruas alagadas/)).toBeTruthy();

      escolherChuva('Chuva forte');
      expect(screen.getByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
      expect(screen.getByText(/há previsão de chuva forte/)).toBeTruthy();
      expect(within(screen.getByRole('region', { name: 'Previsão do tempo' })).getByText('Chuva forte')).toBeTruthy();
    });

    it('setor moderado: fraca é área segura; forte vira atenção com orientações de deslizamento', async () => {
      gpsEmRecife();
      terreno.percentual = 30;
      previsao(0);
      render(<App />);
      expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
      escolherChuva('Chuva fraca');
      expect(screen.getByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
      escolherChuva('Chuva forte');
      expect(screen.getByRole('heading', { name: 'Atenção' })).toBeTruthy();
      expect(screen.getByText(/Observe sinais de deslizamento/)).toBeTruthy();
    });

    it('setor alto: fraca é "área de risco"; moderada agrava para "Você está em risco!"', async () => {
      gpsEmRecife();
      terreno.percentual = 45;
      previsao(0);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Você está em área de risco'));
      escolherChuva('Chuva fraca');
      expect(screen.getByRole('alert').textContent).toContain('Você está em área de risco');
      escolherChuva('Chuva moderada');
      expect(screen.getByRole('alert').textContent).toContain('Você está em risco!');
      expect(screen.getByRole('heading', { name: 'O que fazer agora:' })).toBeTruthy();
    });

    it('"Automático" volta à previsão real e tira o aviso de simulação', async () => {
      gpsEmRecife();
      terreno.percentual = 1;
      previsao(0);
      render(<App />);
      await screen.findByRole('heading', { name: 'Você está em área segura' });
      escolherChuva('Chuva forte');
      expect(screen.getByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
      escolherChuva('Automático');
      expect(screen.getByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
      expect(screen.queryByText('Chuva simulada (modo demonstração)')).toBeNull();
    });

    it('funciona mesmo com a previsão real indisponível, sem inventar temperatura', async () => {
      gpsEmRecife();
      terreno.percentual = 1;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
      render(<App />);
      await screen.findByRole('heading', { name: 'Você está em área segura' });
      escolherChuva('Chuva forte');
      expect(screen.getByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
      const painel = screen.getByRole('region', { name: 'Previsão do tempo' });
      expect(painel.textContent).not.toContain('°C');
    });

    it('escolher uma chuva de teste desfaz o estado de risco forçado', async () => {
      gpsEmRecife();
      terreno.percentual = 1;
      previsao(0);
      render(<App />);
      await screen.findByRole('heading', { name: 'Você está em área segura' });
      fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
      fireEvent.click(screen.getByRole('button', { name: 'Em risco' }));
      fireEvent.click(screen.getByRole('button', { name: 'Início' }));
      expect(screen.getByText('Estado simulado (modo demonstração)')).toBeTruthy();
      escolherChuva('Chuva moderada');
      expect(screen.queryByText('Estado simulado (modo demonstração)')).toBeNull();
      expect(screen.getByRole('heading', { name: 'Alerta de alagamento' })).toBeTruthy();
    });
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
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Estado de risco simulado' })).getByRole('button', { name: 'Automático' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(await screen.findByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
    expect(screen.queryByText('Estado simulado (modo demonstração)')).toBeNull();
  });
});
