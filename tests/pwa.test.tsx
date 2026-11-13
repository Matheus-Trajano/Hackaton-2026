import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { BarreiraDeErro } from '@/components/layout/BarreiraDeErro';
import { APP, ETAPA_ATUAL, TOTAL_ETAPAS } from '@/config/app';
import { useInstalacao } from '@/hooks/useInstalacao';
import { registrarServiceWorker } from '@/pwa/registrar';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const raiz = resolve(__dirname, '..');
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho));

describe('manifesto e ícones', () => {
  const manifesto = JSON.parse(ler('public/manifest.webmanifest').toString()) as {
    name: string;
    short_name: string;
    start_url: string;
    display: string;
    theme_color: string;
    icons: { src: string; sizes: string; type: string; purpose: string }[];
  };

  it('tem o que o Android exige para instalar', () => {
    expect(manifesto.name).toBe(APP.nome);
    expect(manifesto.short_name.length).toBeLessThanOrEqual(15);
    expect(manifesto.start_url).toBe('/');
    expect(manifesto.display).toBe('standalone');
    const tamanhos = manifesto.icons.filter((i) => i.purpose === 'any').map((i) => i.sizes);
    expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifesto.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('cada ícone existe, é PNG e tem o tamanho declarado', () => {
    for (const icone of manifesto.icons) {
      const png = ler(`public${icone.src}`);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      // Largura e altura ficam no cabeçalho IHDR, nos bytes 16 a 23.
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icone.sizes);
      expect(icone.type).toBe('image/png');
    }
  });

  it('a página aponta para o manifesto e os ícones, que existem', () => {
    const html = ler('index.html').toString();
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    for (const [, caminho] of html.matchAll(/href="(\/[^"]+)"/g)) expect(() => ler(`public${caminho}`)).not.toThrow();
    expect(html).toContain(`content="${manifesto.theme_color}"`);
  });

  it('a Vercel não guarda o service worker em cache e não desvia a API', () => {
    const vercel = JSON.parse(ler('vercel.json').toString()) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
      rewrites: { source: string }[];
    };
    expect(vercel.headers.find((h) => h.source === '/sw.js')?.headers[0]).toEqual({ key: 'Cache-Control', value: 'no-cache' });
    expect(vercel.rewrites[0]!.source).toContain('(?!api/)');
  });
});

describe('service worker', () => {
  const ORIGEM = 'https://app.exemplo';
  const HTML = '<link rel="manifest" href="/manifest.webmanifest" /><script src="/assets/app-abc.js"></script><a href="//outro.site/x">x</a>';
  type Tratador = (evento: Record<string, unknown>) => void;

  /** Carrega public/sw.js com rede e cache de mentira. */
  function ambiente() {
    const guardado = new Map<string, Response>();
    const cache = {
      put: async (chave: string, r: Response) => void guardado.set(chave, r),
      match: async (chave: string) => guardado.get(chave)?.clone(),
    };
    const caches = {
      open: vi.fn(async () => cache),
      keys: async () => ['encosta-segura-v0', 'encosta-segura-v1', 'de-outro-app'],
      delete: vi.fn(async () => true),
    };
    const tratadores: Record<string, Tratador> = {};
    const self = {
      addEventListener: (nome: string, t: Tratador) => (tratadores[nome] = t),
      location: { origin: ORIGEM },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    };
    const rede = {
      online: true,
      arquivos: {
        '/': new Response(HTML, { headers: { 'content-type': 'text/html' } }),
        '/manifest.webmanifest': new Response('{}', { headers: { 'content-type': 'application/manifest+json' } }),
        '/assets/app-abc.js': new Response('js', { headers: { 'content-type': 'text/javascript' } }),
      } as Record<string, Response>,
    };
    const buscar = vi.fn(async (alvo: string | { url: string }) => {
      if (!rede.online) throw new TypeError('offline');
      const caminho = typeof alvo === 'string' ? alvo : new URL(alvo.url).pathname;
      return rede.arquivos[caminho]?.clone() ?? new Response('não achei', { status: 404 });
    });
    new Function('self', 'caches', 'fetch', ler('public/sw.js').toString())(self, caches, buscar);

    const esperar = async (nome: string) => {
      let promessa: Promise<unknown> = Promise.resolve();
      tratadores[nome]!({ waitUntil: (p: Promise<unknown>) => (promessa = p) });
      await promessa;
    };
    /** Devolve a resposta do service worker, ou `null` se ele não interferiu. */
    const pedir = (caminho: string, opcoes: { method?: string; mode?: string; origem?: string } = {}) => {
      let resposta: Promise<Response> | null = null;
      tratadores.fetch!({
        request: { url: (opcoes.origem ?? ORIGEM) + caminho, method: opcoes.method ?? 'GET', mode: opcoes.mode ?? 'no-cors' },
        respondWith: (p: Promise<Response>) => (resposta = p),
      });
      return resposta as Promise<Response> | null;
    };
    return { guardado, caches, self, rede, buscar, esperar, pedir };
  }

  it('na instalação, guarda a página e os arquivos locais que ela cita', async () => {
    const a = ambiente();
    await a.esperar('install');
    expect([...a.guardado.keys()].sort()).toEqual(['/', '/assets/app-abc.js', '/manifest.webmanifest']);
    expect(a.self.skipWaiting).toHaveBeenCalled();
  });

  it('a instalação falha se a página não puder ser baixada (tenta de novo depois)', async () => {
    const a = ambiente();
    a.rede.online = false;
    await expect(a.esperar('install')).rejects.toThrow();
    expect(a.guardado.size).toBe(0);
  });

  it('na ativação, apaga só os caches antigos deste app', async () => {
    const a = ambiente();
    await a.esperar('activate');
    expect(a.caches.delete.mock.calls).toEqual([['encosta-segura-v0']]);
    expect(a.self.clients.claim).toHaveBeenCalled();
  });

  it('não interfere em outros servidores, na API nem em envios', () => {
    const a = ambiente();
    expect(a.pedir('/terrarium/14/1/1.png', { origem: 'https://s3.amazonaws.com' })).toBeNull();
    expect(a.pedir('/v1/forecast', { origem: 'https://api.open-meteo.com' })).toBeNull();
    expect(a.pedir('/api/alerta')).toBeNull();
    expect(a.pedir('/relevo/13/3302/4279.png')).toBeNull();
    expect(a.pedir('/qualquer', { method: 'POST' })).toBeNull();
  });

  it('página: usa a rede quando há, e a versão guardada quando não há', async () => {
    const a = ambiente();
    await a.esperar('install');
    a.rede.arquivos['/'] = new Response('nova versão', { headers: { 'content-type': 'text/html' } });
    expect(await (await a.pedir('/', { mode: 'navigate' })!).text()).toBe('nova versão');

    a.rede.online = false;
    expect(await (await a.pedir('/', { mode: 'navigate' })!).text()).toBe('nova versão');
  });

  it('página sem rede e sem nada guardado: o erro aparece, sem resposta inventada', async () => {
    const a = ambiente();
    a.rede.online = false;
    await expect(a.pedir('/', { mode: 'navigate' })).rejects.toThrow('offline');
  });

  it('arquivos de /assets/ vêm do que foi guardado, sem ir à rede', async () => {
    const a = ambiente();
    await a.esperar('install');
    a.buscar.mockClear();
    expect(await (await a.pedir('/assets/app-abc.js')!).text()).toBe('js');
    expect(a.buscar).not.toHaveBeenCalled();
  });

  it('outros arquivos do app: rede primeiro, guardado como reserva', async () => {
    const a = ambiente();
    await a.esperar('install');
    a.rede.arquivos['/manifest.webmanifest'] = new Response('{"novo":1}', { headers: { 'content-type': 'application/manifest+json' } });
    expect(await (await a.pedir('/manifest.webmanifest')!).text()).toBe('{"novo":1}');
    a.rede.online = false;
    expect(await (await a.pedir('/manifest.webmanifest')!).text()).toBe('{"novo":1}');
  });

  it('não guarda erro 404 nem a página devolvida no lugar de um arquivo', async () => {
    const a = ambiente();
    expect((await a.pedir('/assets/sumiu.js')!).status).toBe(404);
    a.rede.arquivos['/assets/desviado.js'] = new Response(HTML, { headers: { 'content-type': 'text/html' } });
    await a.pedir('/assets/desviado.js');
    expect(a.guardado.size).toBe(0);
  });
});

describe('registro do service worker', () => {
  it('registra /sw.js em produção', async () => {
    const register = vi.fn().mockResolvedValue({});
    await expect(registrarServiceWorker(true, { register })).resolves.toBe(true);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('não registra em desenvolvimento nem em navegador sem suporte', async () => {
    const register = vi.fn();
    await expect(registrarServiceWorker(false, { register })).resolves.toBe(false);
    await expect(registrarServiceWorker(true, undefined)).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('uma falha no registro não derruba o app', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const register = vi.fn().mockRejectedValue(new Error('bloqueado'));
    await expect(registrarServiceWorker(true, { register })).resolves.toBe(false);
  });
});

describe('instalação (useInstalacao)', () => {
  function oferta(resultado: 'accepted' | 'dismissed' = 'accepted') {
    const evento = new Event('beforeinstallprompt', { cancelable: true });
    const prompt = vi.fn().mockResolvedValue(undefined);
    Object.assign(evento, { prompt, userChoice: Promise.resolve({ outcome: resultado }) });
    return { evento, prompt };
  }

  it('começa indisponível; fica disponível quando o navegador oferece, sem o aviso automático', () => {
    const { result } = renderHook(() => useInstalacao());
    expect(result.current.estado).toBe('indisponivel');
    const { evento } = oferta();
    act(() => void window.dispatchEvent(evento));
    expect(result.current.estado).toBe('disponivel');
    expect(evento.defaultPrevented).toBe(true);
  });

  it('instalar abre o pedido do navegador uma única vez', async () => {
    const { result } = renderHook(() => useInstalacao());
    const { evento, prompt } = oferta('dismissed');
    act(() => void window.dispatchEvent(evento));
    await act(() => result.current.instalar());
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.estado).toBe('indisponivel');
    await act(() => result.current.instalar());
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('marca como instalado depois da instalação e quando aberto como app', () => {
    const { result } = renderHook(() => useInstalacao());
    act(() => void window.dispatchEvent(new Event('appinstalled')));
    expect(result.current.estado).toBe('instalado');

    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta === '(display-mode: standalone)' }));
    expect(renderHook(() => useInstalacao()).result.current.estado).toBe('instalado');
  });
});

describe('no app', () => {
  const definirConexao = (online: boolean) => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
    act(() => void window.dispatchEvent(new Event(online ? 'online' : 'offline')));
  };

  it('avisa quando fica sem internet, com o telefone, e retira o aviso quando volta', () => {
    render(<App />);
    expect(screen.queryByText(/Sem internet:/)).toBeNull();
    definirConexao(false);
    const aviso = screen.getByText(/Sem internet:/);
    expect(aviso.querySelector('a')!.getAttribute('href')).toBe('tel:199');
    definirConexao(true);
    expect(screen.queryByText(/Sem internet:/)).toBeNull();
  });

  it('a aba Sobre explica como instalar e mostra o botão quando o navegador oferece', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    expect(screen.getByRole('heading', { name: 'Instalar no celular' })).toBeTruthy();
    expect(screen.getByText(/Adicionar à tela inicial/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Instalar app' })).toBeNull();

    const evento = new Event('beforeinstallprompt', { cancelable: true });
    const prompt = vi.fn().mockResolvedValue(undefined);
    Object.assign(evento, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    act(() => void window.dispatchEvent(evento));
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Instalar app' })));
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('informa a versão final e todas as etapas concluídas', () => {
    expect(ETAPA_ATUAL).toBe(TOTAL_ETAPAS);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    expect(screen.getByText(new RegExp(`Versão ${APP.versao.replaceAll('.', '\\.')} · etapa 10 de 10`))).toBeTruthy();
  });
});

describe('barreira de erro', () => {
  function Quebrado(): never {
    throw new Error('defeito de teste');
  }

  it('mostra mensagem, recarregar e o telefone em vez de tela em branco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <BarreiraDeErro>
        <Quebrado />
      </BarreiraDeErro>,
    );
    expect(screen.getByRole('alert').textContent).toContain('Algo deu errado');
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ligar 199/ }).getAttribute('href')).toBe('tel:199');
  });

  it('sem erro, mostra o conteúdo normalmente', () => {
    render(
      <BarreiraDeErro>
        <p>tudo certo</p>
      </BarreiraDeErro>,
    );
    expect(screen.getByText('tudo certo')).toBeTruthy();
  });
});
