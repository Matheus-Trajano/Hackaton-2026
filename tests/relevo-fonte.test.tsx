import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FONTE_PADRAO, fonteDoRelevo, RELEVO } from '@/config/relevo';

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('fonte do relevo (configuração)', () => {
  it('sem configuração, usa a fonte padrão, identificada como modelo de superfície', () => {
    expect(fonteDoRelevo({})).toBe(FONTE_PADRAO);
    expect(fonteDoRelevo({ VITE_RELEVO_URL: '   ' })).toBe(FONTE_PADRAO);
    expect(FONTE_PADRAO.tipo).toBe('superficie');
    expect(FONTE_PADRAO.zoomMaximoNativo).toBe(14);
  });

  it('com endereço de tiles próprios, usa-os como modelo do terreno (zoom 13 por padrão)', () => {
    expect(fonteDoRelevo({ VITE_RELEVO_URL: 'https://exemplo.com/relevo/{z}/{x}/{y}.png' })).toEqual({
      urlTiles: 'https://exemplo.com/relevo/{z}/{x}/{y}.png',
      nome: 'Modelo digital do terreno (tiles próprios)',
      atribuicao: 'Relevo: Modelo digital do terreno (tiles próprios)',
      tipo: 'terreno',
      zoomMaximoNativo: 13,
    });
  });

  it('aceita endereço no próprio app, zoom e nome informados', () => {
    const fonte = fonteDoRelevo({
      VITE_RELEVO_URL: '/relevo/{z}/{x}/{y}.png',
      VITE_RELEVO_ZOOM_MAXIMO: '12',
      VITE_RELEVO_NOME: 'FABDEM (30 m)',
    });
    expect(fonte).toMatchObject({ urlTiles: '/relevo/{z}/{x}/{y}.png', zoomMaximoNativo: 12, nome: 'FABDEM (30 m)' });
    expect(fonte.atribuicao).toBe('Relevo: FABDEM (30 m)');
    expect(fonte.avisoConfiguracao).toBeUndefined();
  });

  it.each([
    [{ VITE_RELEVO_URL: 'http://exemplo.com/{z}/{x}/{y}.png' }, 'https://'],
    [{ VITE_RELEVO_URL: 'https://exemplo.com/relevo/{z}/{x}.png' }, '{z}, {x} e {y}'],
    [{ VITE_RELEVO_URL: '/relevo/{z}/{x}/{y}.png', VITE_RELEVO_ZOOM_MAXIMO: 'treze' }, 'inteiro de 8 a 15'],
    [{ VITE_RELEVO_URL: '/relevo/{z}/{x}/{y}.png', VITE_RELEVO_ZOOM_MAXIMO: '20' }, 'inteiro de 8 a 15'],
    [{ VITE_RELEVO_URL: '/relevo/{z}/{x}/{y}.png', VITE_RELEVO_ZOOM_MAXIMO: '12.5' }, 'inteiro de 8 a 15'],
  ])('configuração inválida %o: volta à fonte padrão inteira e explica o motivo', (ambiente, trecho) => {
    const fonte = fonteDoRelevo(ambiente);
    expect(fonte).toMatchObject(FONTE_PADRAO);
    expect(fonte.avisoConfiguracao).toContain(trecho);
    expect(fonte.avisoConfiguracao).toContain('Usando a fonte padrão.');
  });

  it('nos testes (sem variáveis), o app usa a fonte padrão e consulta no zoom 14', () => {
    expect(RELEVO.urlTiles).toBe(FONTE_PADRAO.urlTiles);
    expect(RELEVO.zoomConsulta).toBe(14);
  });
});

describe('com tiles próprios configurados', () => {
  async function carregarComAmbiente(ambiente: Record<string, string>) {
    for (const [nome, valor] of Object.entries(ambiente)) vi.stubEnv(nome, valor);
    vi.resetModules();
    return {
      relevo: (await import('@/config/relevo')).RELEVO,
      terreno: await import('@/services/terreno'),
      sobre: (await import('@/components/telas/TelaSobre')).TelaSobre,
    };
  }
  const propsSobre = {
    modoRisco: 'automatico' as const,
    aoMudarModoRisco: () => {},
    instalacao: { estado: 'indisponivel' as const, instalar: async () => {} },
    localizacao: {
      estado: { modo: 'gps', status: 'aguardando' },
      pontoDemoId: null,
      usarGps: () => {},
      usarPontoDemo: () => {},
    },
  };

  it('os tiles são pedidos no novo endereço e a consulta usa o zoom configurado', async () => {
    const { relevo, terreno } = await carregarComAmbiente({
      VITE_RELEVO_URL: 'https://exemplo.com/relevo/{z}/{x}/{y}.png',
      VITE_RELEVO_ZOOM_MAXIMO: '13',
    });
    expect(terreno.urlDoTile(13, 3302, 4279)).toBe('https://exemplo.com/relevo/13/3302/4279.png');
    expect(relevo.zoomConsulta).toBe(13);

    // Recife no zoom 13 fica no tile 3302/4279 (metade dos índices do zoom 14: 6604/8559).
    const carregar = vi.fn(async () => new Float32Array(256 * 256).fill(42));
    await expect(terreno.consultarAltitude({ lat: -8.0476, lon: -34.877 }, carregar)).resolves.toBe(42);
    expect(carregar).toHaveBeenCalledWith(13, 3302, 4279);
  });

  it('a aba Sobre informa a fonte e que é modelo do terreno', async () => {
    const { sobre: TelaSobre } = await carregarComAmbiente({
      VITE_RELEVO_URL: '/relevo/{z}/{x}/{y}.png',
      VITE_RELEVO_NOME: 'FABDEM (30 m)',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<TelaSobre {...(propsSobre as any)} />);
    expect(screen.getByText('FABDEM (30 m)')).toBeTruthy();
    expect(screen.getByText(/sem prédios nem vegetação/)).toBeTruthy();
  });

  it('a aba Sobre mostra o aviso quando a configuração é inválida', async () => {
    const { sobre: TelaSobre } = await carregarComAmbiente({ VITE_RELEVO_URL: 'relevo/{z}/{x}/{y}.png' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<TelaSobre {...(propsSobre as any)} />);
    expect(screen.getByRole('alert').textContent).toContain('Usando a fonte padrão.');
    expect(screen.getByText(/inclui prédios e copas de árvores/)).toBeTruthy();
  });
});
