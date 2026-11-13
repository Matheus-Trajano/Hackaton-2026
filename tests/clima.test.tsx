import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { PainelClima } from '@/components/inicio/PainelClima';
import { CLIMA } from '@/config/clima';
import { faixaDaChuva, proximasHoras, resumirClima, type HoraPrevista, type ResumoClima } from '@/domain/clima';
import { useClima } from '@/hooks/useClima';
import { buscarClima, interpretarClima, urlDoClima } from '@/services/clima';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const AGORA = new Date('2026-11-13T14:37:00Z');
const seg = (iso: string) => new Date(iso).getTime() / 1000;

/** Resposta no formato da Open-Meteo (horários em segundos, UTC). */
function respostaApi(alteracoes: Record<string, unknown> = {}) {
  return {
    latitude: -8.05,
    longitude: -34.88,
    current: { time: seg('2026-11-13T14:30:00Z'), temperature_2m: 27.4 },
    hourly: {
      time: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((h) => seg(`2026-11-13T${h}:00Z`)),
      precipitation_probability: [10, 20, 60, 85, 70, 30, 5],
      precipitation: [0, 0, 1.2, 30.5, 8, 0.3, 0],
    },
    ...alteracoes,
  };
}

function hora(iso: string, probabilidade: number | null, volumeMm: number): HoraPrevista {
  return { inicio: new Date(iso), probabilidade, volumeMm };
}

const RESUMO: ResumoClima = {
  temperatura: 22,
  probabilidadeChuva: 85,
  volumeMm: 39.7,
  picoMmPorHora: 30.5,
  intensidade: 'forte',
  rotuloIntensidade: 'Chuva forte',
  horas: [hora('2026-11-13T14:00:00Z', 60, 1.2), hora('2026-11-13T15:00:00Z', 85, 30.5), hora('2026-11-13T16:00:00Z', 70, 8)],
};

describe('classificação da chuva', () => {
  it.each([
    [0, 'sem-chuva'],
    [0.09, 'sem-chuva'],
    [0.1, 'fraca'],
    [4.9, 'fraca'],
    [5, 'moderada'],
    [24.9, 'moderada'],
    [25, 'forte'],
    [49.9, 'forte'],
    [50, 'muito-forte'],
    [120, 'muito-forte'],
  ])('%d mm/h é "%s"', (mm, intensidade) => {
    expect(faixaDaChuva(mm).intensidade).toBe(intensidade);
  });
});

describe('janela das próximas horas', () => {
  const horas = ['12', '13', '14', '15', '16', '17', '18'].map((h) => hora(`2026-11-13T${h}:00:00Z`, 0, 0));

  it('começa na hora em andamento e pega as 3 seguintes em ordem', () => {
    const janela = proximasHoras(horas, AGORA, 3);
    expect(janela.map((h) => h.inicio.toISOString().slice(11, 13))).toEqual(['14', '15', '16']);
  });

  it('na virada exata da hora, a hora que terminou sai', () => {
    const janela = proximasHoras(horas, new Date('2026-11-13T15:00:00Z'), 3);
    expect(janela.map((h) => h.inicio.toISOString().slice(11, 13))).toEqual(['15', '16', '17']);
  });

  it('funciona com as horas fora de ordem e devolve menos se não houver horas suficientes', () => {
    expect(proximasHoras([...horas].reverse(), AGORA, 3)[0]!.inicio.toISOString()).toContain('T14:00');
    expect(proximasHoras(horas, new Date('2026-11-13T18:30:00Z'), 3)).toHaveLength(1);
    expect(proximasHoras(horas, new Date('2026-11-14T09:00:00Z'), 3)).toEqual([]);
  });
});

describe('resumo do clima', () => {
  it('usa a maior probabilidade, soma o volume e classifica pelo pico', () => {
    const r = resumirClima(27.4, RESUMO.horas);
    expect(r.probabilidadeChuva).toBe(85);
    expect(r.volumeMm).toBeCloseTo(39.7, 6);
    expect(r.picoMmPorHora).toBe(30.5);
    expect(r.intensidade).toBe('forte');
    expect(r.rotuloIntensidade).toBe('Chuva forte');
    expect(r.temperatura).toBe(27.4);
  });

  it('sem probabilidade informada, não inventa: fica null', () => {
    const r = resumirClima(25, [hora('2026-11-13T14:00:00Z', null, 0), hora('2026-11-13T15:00:00Z', null, 0)]);
    expect(r.probabilidadeChuva).toBeNull();
    expect(r.intensidade).toBe('sem-chuva');
  });

  it('recusa previsão sem horas', () => {
    expect(() => resumirClima(25, [])).toThrow();
  });
});

describe('serviço de clima (Open-Meteo)', () => {
  it('monta a consulta com coordenada arredondada e os campos necessários', () => {
    const url = new URL(urlDoClima({ lat: -8.01534, lon: -34.91251 }));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('-8.02');
    expect(url.searchParams.get('longitude')).toBe('-34.91');
    expect(url.searchParams.get('current')).toBe('temperature_2m');
    expect(url.searchParams.get('hourly')).toBe('precipitation_probability,precipitation');
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
  });

  it('interpreta a resposta: 14h, 15h e 16h a partir das 14:37', () => {
    const r = interpretarClima(respostaApi(), AGORA);
    expect(r.temperatura).toBe(27.4);
    expect(r.horas.map((h) => h.volumeMm)).toEqual([1.2, 30.5, 8]);
    expect(r.probabilidadeChuva).toBe(85);
    expect(r.intensidade).toBe('forte');
  });

  it('aceita probabilidade ausente (null) em algumas horas', () => {
    const base = respostaApi();
    const r = interpretarClima(
      { ...base, hourly: { ...base.hourly, precipitation_probability: [null, null, null, 40, null, null, null] } },
      AGORA,
    );
    expect(r.probabilidadeChuva).toBe(40);
  });

  it.each([
    ['resposta vazia', null],
    ['sem temperatura', respostaApi({ current: {} })],
    ['sem previsão horária', respostaApi({ hourly: undefined })],
    ['lista de volumes ausente', respostaApi({ hourly: { time: [1], precipitation_probability: [1] } })],
    ['só horas passadas', respostaApi({ hourly: { time: [seg('2026-11-13T09:00:00Z')], precipitation_probability: [5], precipitation: [0] } })],
  ])('rejeita %s em vez de inventar valores', (_nome, resposta) => {
    expect(() => interpretarClima(resposta, AGORA)).toThrow();
  });

  it('busca, confere o status e devolve o resumo', async () => {
    const buscar = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(respostaApi()) });
    const r = await buscarClima({ lat: -8.05, lon: -34.88 }, buscar as unknown as typeof fetch, () => AGORA);
    expect(r.intensidade).toBe('forte');
    expect(String(buscar.mock.calls[0]![0])).toContain('latitude=-8.05');
  });

  it('falha quando o serviço responde com erro ou a rede cai', async () => {
    const erro500 = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(buscarClima({ lat: -8, lon: -35 }, erro500 as unknown as typeof fetch)).rejects.toThrow('500');
    const semRede = vi.fn().mockRejectedValue(new Error('sem rede'));
    await expect(buscarClima({ lat: -8, lon: -35 }, semRede as unknown as typeof fetch)).rejects.toThrow('sem rede');
  });
});

describe('useClima', () => {
  const RECIFE = { lat: -8.0476, lon: -34.877 };

  it('carrega e entrega a previsão com o horário da atualização', async () => {
    const buscar = vi.fn().mockResolvedValue(RESUMO);
    const { result } = renderHook(() => useClima(RECIFE, buscar));
    expect(result.current.status).toBe('carregando');
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current).toMatchObject({ clima: RESUMO });
    expect(buscar).toHaveBeenCalledWith({ lat: -8.05, lon: -34.88 });
  });

  it('informa erro quando não há previsão anterior', async () => {
    const { result } = renderHook(() => useClima(RECIFE, () => Promise.reject(new Error('x'))));
    await waitFor(() => expect(result.current).toEqual({ status: 'erro' }));
  });

  it('não refaz a consulta por um deslocamento pequeno; refaz ao mudar de região', async () => {
    const buscar = vi.fn().mockResolvedValue(RESUMO);
    const { result, rerender } = renderHook(({ p }) => useClima(p, buscar), { initialProps: { p: RECIFE } });
    await waitFor(() => expect(result.current.status).toBe('ok'));
    rerender({ p: { lat: -8.0481, lon: -34.8772 } });
    expect(buscar).toHaveBeenCalledTimes(1);
    rerender({ p: { lat: -8.2835, lon: -35.9761 } });
    expect(result.current.status).toBe('carregando');
    await waitFor(() => expect(buscar).toHaveBeenCalledTimes(2));
  });

  it('atualiza sozinho no intervalo e mantém a última previsão se a atualização falhar', async () => {
    vi.useFakeTimers();
    const buscar = vi.fn().mockResolvedValueOnce(RESUMO).mockRejectedValueOnce(new Error('caiu')).mockResolvedValue({ ...RESUMO, temperatura: 30 });
    const { result } = renderHook(() => useClima(RECIFE, buscar));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.status).toBe('ok');

    await act(() => vi.advanceTimersByTimeAsync(CLIMA.intervaloAtualizacaoMs));
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: 'ok', clima: { temperatura: 22 } });

    await act(() => vi.advanceTimersByTimeAsync(CLIMA.intervaloAposFalhaMs));
    expect(buscar).toHaveBeenCalledTimes(3);
    expect(result.current).toMatchObject({ status: 'ok', clima: { temperatura: 30 } });
  });

  it('para de atualizar ao ser desmontado', async () => {
    vi.useFakeTimers();
    const buscar = vi.fn().mockResolvedValue(RESUMO);
    const { unmount } = renderHook(() => useClima(RECIFE, buscar));
    await act(() => vi.advanceTimersByTimeAsync(0));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(CLIMA.intervaloAtualizacaoMs * 3));
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});

describe('painel de clima', () => {
  it('mostra probabilidade, intensidade, temperatura, horas e volume', () => {
    render(<PainelClima estado={{ status: 'ok', clima: RESUMO, atualizadoEm: AGORA }} local="sua localização" />);
    const painel = screen.getByLabelText('Previsão do tempo');
    expect(painel.textContent).toContain('Previsão de chuva (próximas 3h)');
    expect(painel.textContent).toContain('85%');
    expect(painel.textContent).toContain('Chuva forte');
    expect(painel.textContent).toContain('22°C');
    expect(painel.textContent).toContain('Previsão para sua localização · 39,7 mm no período');
    const horas = screen.getByLabelText('Previsão hora a hora').querySelectorAll('li');
    expect(horas).toHaveLength(3);
    expect(horas[1]!.textContent).toContain('85%');
    expect(horas[1]!.textContent).toContain('30,5 mm');
  });

  it('carregando ou com erro, mostra traços e não mostra números', () => {
    const { rerender } = render(<PainelClima estado={{ status: 'carregando' }} local="Recife" />);
    expect(screen.getByText('Carregando…')).toBeTruthy();
    expect(screen.queryByLabelText('Previsão hora a hora')).toBeNull();
    rerender(<PainelClima estado={{ status: 'erro' }} local="Recife" />);
    expect(screen.getByText('Sem dados')).toBeTruthy();
    expect(screen.getByText(/Não foi possível obter a previsão/)).toBeTruthy();
    expect(screen.getByLabelText('Previsão do tempo').textContent).not.toMatch(/\d+%|\d+°C/);
  });

  it('sem probabilidade informada, mostra traço mas mantém a intensidade', () => {
    render(
      <PainelClima
        estado={{ status: 'ok', clima: { ...RESUMO, probabilidadeChuva: null }, atualizadoEm: AGORA }}
        local="Recife"
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Chuva forte')).toBeTruthy();
  });
});

describe('clima no app', () => {
  it('busca a previsão real pela rede e mostra no painel; o monitoramento passa a ativo', async () => {
    const agoraSeg = Math.floor(Date.now() / 3600_000) * 3600;
    const resposta = {
      current: { temperature_2m: 26.2 },
      hourly: {
        time: [0, 1, 2, 3].map((i) => agoraSeg + i * 3600),
        precipitation_probability: [35, 55, 20, 90],
        precipitation: [0.4, 2, 0, 60],
      },
    };
    const rede = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(resposta) });
    vi.stubGlobal('fetch', rede);

    render(<App />);
    expect(await screen.findByText('Chuva fraca')).toBeTruthy();
    const painel = screen.getByLabelText('Previsão do tempo');
    expect(painel.textContent).toContain('55%'); // a 4ª hora (90%) fica fora da janela de 3 h
    expect(painel.textContent).toContain('26°C');
    // Sem GPS no teste: a previsão é a do local padrão, e o painel avisa.
    expect(painel.textContent).toContain('Previsão para Recife (sem localização)');
    expect(String(rede.mock.calls[0]![0])).toContain('api.open-meteo.com');
    expect(screen.getByText('Monitoramento em tempo real')).toBeTruthy();
  });
});
