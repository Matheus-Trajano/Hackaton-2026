import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { gerarProtocolo, processarAlerta, validarPedido } from '../api/alerta';
import { App } from '@/App';
import { DialogoSocorro } from '@/components/socorro/DialogoSocorro';
import { TelaAlertas } from '@/components/telas/TelaAlertas';
import { PONTO_DEMO_PADRAO } from '@/config/pontosDemo';
import { formatarCoordenada } from '@/domain/localizacao';
import { useAlertas, type RegistroDeAlerta } from '@/hooks/useAlertas';
import { enviarAlerta } from '@/services/alerta';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const AGORA = new Date('2026-11-13T14:37:00Z');
const PEDIDO = { lat: -8.0153, lon: -34.9125, precisaoMetros: 12, risco: 'risco', momento: AGORA.toISOString() };
const RECEBIDO = { protocolo: 'ES-20261113-ABC123', recebidoEm: AGORA.toISOString(), simulado: true as const };

describe('rota /api/alerta', () => {
  it('aceita um pedido válido: 201, protocolo e marca de simulado', () => {
    const r = processarAlerta('POST', PEDIDO, AGORA);
    expect(r.status).toBe(201);
    expect(r.corpo).toMatchObject({ recebidoEm: AGORA.toISOString(), simulado: true });
    expect((r.corpo as { protocolo: string }).protocolo).toMatch(/^ES-20261113-[0-9A-F]{6}$/);
  });

  it('aceita o corpo como texto JSON (como chega no servidor de desenvolvimento)', () => {
    expect(processarAlerta('POST', JSON.stringify(PEDIDO), AGORA).status).toBe(201);
  });

  it('registra o alerta no log da função', () => {
    processarAlerta('POST', PEDIDO, AGORA);
    expect(console.log).toHaveBeenCalledWith('[alerta simulado]', expect.stringContaining('"lat":-8.0153'));
  });

  it.each([
    ['GET', PEDIDO, 405],
    ['POST', '{não é json', 400],
    ['POST', undefined, 400],
    ['POST', {}, 400],
    ['POST', { lat: 'abc', lon: -34.9 }, 400],
    ['POST', { lat: -8, lon: 500 }, 400],
    ['POST', { lat: 95, lon: -34.9 }, 400],
    ['POST', { lat: Number.NaN, lon: -34.9 }, 400],
  ])('%s com %o → %d, com mensagem de erro e sem log', (metodo, corpo, status) => {
    const r = processarAlerta(metodo, corpo, AGORA);
    expect(r.status).toBe(status);
    expect((r.corpo as { erro: string }).erro).toBeTruthy();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('normaliza o pedido: descarta campos inválidos e ignora os desconhecidos', () => {
    const p = validarPedido({ ...PEDIDO, precisaoMetros: -5, risco: 'x'.repeat(100), inclinacaoGraus: '24', outro: 1 });
    expect(p).toEqual({
      lat: -8.0153,
      lon: -34.9125,
      precisaoMetros: undefined,
      localizacaoSimulada: false,
      risco: undefined,
      inclinacaoGraus: undefined,
      chuva: undefined,
      momento: AGORA.toISOString(),
    });
  });

  it('guarda a inclinação em graus quando é um número', () => {
    expect(validarPedido({ ...PEDIDO, inclinacaoGraus: 24.5 })).toMatchObject({ inclinacaoGraus: 24.5 });
  });

  it('gera protocolos no formato ES-AAAAMMDD-XXXXXX', () => {
    expect(gerarProtocolo(AGORA, 'ab12cd34-0000')).toBe('ES-20261113-AB12CD');
    expect(gerarProtocolo(AGORA)).not.toBe(gerarProtocolo(AGORA));
  });

  it('o handler da Vercel responde com status e JSON, e informa o método aceito no 405', () => {
    const resposta = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    handler({ method: 'POST', body: PEDIDO }, resposta);
    expect(resposta.status).toHaveBeenCalledWith(201);
    expect(resposta.json).toHaveBeenCalledWith(expect.objectContaining({ simulado: true }));

    handler({ method: 'GET' }, resposta);
    expect(resposta.status).toHaveBeenLastCalledWith(405);
    expect(resposta.setHeader).toHaveBeenCalledWith('Allow', 'POST');
  });
});

describe('envio do alerta pelo app', () => {
  const resposta = (ok: boolean, status: number, corpo: unknown) =>
    vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(corpo) }) as unknown as typeof fetch;

  it('faz POST em /api/alerta com o pedido em JSON e devolve o protocolo', async () => {
    const buscar = resposta(true, 201, RECEBIDO);
    await expect(enviarAlerta(PEDIDO, buscar)).resolves.toEqual(RECEBIDO);
    const [rota, opcoes] = vi.mocked(buscar).mock.calls[0]!;
    expect(rota).toBe('/api/alerta');
    expect(opcoes).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(String(opcoes!.body))).toEqual(PEDIDO);
  });

  it('usa a mensagem de erro do servidor quando o pedido é recusado', async () => {
    await expect(enviarAlerta(PEDIDO, resposta(false, 400, { erro: 'Latitude ausente ou inválida.' }))).rejects.toThrow(
      'Latitude ausente ou inválida.',
    );
  });

  it('falha com erro do servidor sem corpo, resposta sem protocolo e queda de rede', async () => {
    await expect(enviarAlerta(PEDIDO, resposta(false, 500, null))).rejects.toThrow('500');
    await expect(enviarAlerta(PEDIDO, resposta(true, 200, { ok: true }))).rejects.toThrow('Resposta inesperada');
    const semRede = vi.fn().mockRejectedValue(new Error('sem rede')) as unknown as typeof fetch;
    await expect(enviarAlerta(PEDIDO, semRede)).rejects.toThrow('sem rede');
  });

  it('ida e volta: o pedido montado pelo app é aceito pela rota', async () => {
    const buscar = (async (_rota: unknown, opcoes?: RequestInit) => {
      const r = processarAlerta(opcoes?.method ?? 'GET', opcoes?.body, AGORA);
      return { ok: r.status < 300, status: r.status, json: () => Promise.resolve(r.corpo) };
    }) as unknown as typeof fetch;
    const recebido = await enviarAlerta(PEDIDO, buscar);
    expect(recebido.protocolo).toMatch(/^ES-20261113-/);
  });
});

describe('histórico de alertas (useAlertas)', () => {
  const novo: Omit<RegistroDeAlerta, 'id'> = {
    momento: AGORA.toISOString(),
    posicao: { lat: -8.0153, lon: -34.9125 },
    localizacaoSimulada: false,
    situacao: 'Você está em risco!',
    status: 'enviado',
    protocolo: RECEBIDO.protocolo,
  };

  it('registra com o mais recente primeiro e guarda no aparelho', () => {
    const { result } = renderHook(() => useAlertas());
    act(() => result.current.registrar(novo));
    act(() => result.current.registrar({ ...novo, status: 'falhou', protocolo: undefined }));
    expect(result.current.registros.map((r) => r.status)).toEqual(['falhou', 'enviado']);
    // Uma nova abertura do app recupera o histórico.
    expect(renderHook(() => useAlertas()).result.current.registros).toHaveLength(2);
  });

  it('limpar apaga da tela e do aparelho', () => {
    const { result } = renderHook(() => useAlertas());
    act(() => result.current.registrar(novo));
    act(() => result.current.limpar());
    expect(result.current.registros).toEqual([]);
    expect(renderHook(() => useAlertas()).result.current.registros).toEqual([]);
  });

  it('começa vazio se o conteúdo guardado estiver corrompido', () => {
    localStorage.setItem('encosta-segura:alertas', '{quebrado');
    expect(renderHook(() => useAlertas()).result.current.registros).toEqual([]);
  });

  it('continua funcionando na sessão se o armazenamento do aparelho falhar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cota cheia');
    });
    const { result } = renderHook(() => useAlertas());
    act(() => result.current.registrar(novo));
    expect(result.current.registros).toHaveLength(1);
  });
});

describe('diálogo de socorro', () => {
  const posicao = { lat: -8.0153, lon: -34.9125 };

  it('avisa que é protótipo, mostra a localização e oferece ligar 199', () => {
    render(<DialogoSocorro posicao={posicao} localizacaoSimulada={false} aoEnviar={vi.fn()} aoFechar={vi.fn()} />);
    const dialogo = screen.getByRole('dialog', { name: 'Pedir socorro' });
    expect(dialogo.textContent).toContain('-8.0153, -34.9125');
    expect(dialogo.textContent).toContain('não chega à Defesa Civil');
    expect(within(dialogo).getByRole('link', { name: /Ligar 199/ }).getAttribute('href')).toBe('tel:199');
    expect(document.activeElement).toBe(dialogo);
  });

  it('envia, mostra o protocolo e reforça que ninguém foi acionado', async () => {
    const aoEnviar = vi.fn().mockResolvedValue(RECEBIDO);
    render(<DialogoSocorro posicao={posicao} localizacaoSimulada aoEnviar={aoEnviar} aoFechar={vi.fn()} />);
    expect(screen.getByRole('dialog').textContent).toContain('localização simulada');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar alerta' }));
    expect((screen.getByRole('button', { name: 'Enviando…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByRole('heading', { name: 'Alerta registrado' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(RECEBIDO.protocolo);
    expect(screen.getByRole('dialog').textContent).toContain('nenhuma equipe foi acionada');
    expect(screen.getByRole('link', { name: /Ligar 199/ })).toBeTruthy();
    expect(aoEnviar).toHaveBeenCalledOnce();
  });

  it('na falha, mostra o motivo, manda ligar e permite tentar de novo', async () => {
    const aoEnviar = vi.fn().mockRejectedValueOnce(new Error('sem rede')).mockResolvedValue(RECEBIDO);
    render(<DialogoSocorro posicao={posicao} localizacaoSimulada={false} aoEnviar={aoEnviar} aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar alerta' }));
    expect((await screen.findByRole('alert')).textContent).toBe('sem rede');
    expect(screen.getByRole('link', { name: /Ligar 199/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Alerta registrado' })).toBeTruthy();
  });

  it('sem localização, não oferece envio — só a ligação', () => {
    render(<DialogoSocorro posicao={null} localizacaoSimulada={false} aoEnviar={vi.fn()} aoFechar={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Enviar alerta' })).toBeNull();
    expect(screen.getByRole('link', { name: /Ligar 199/ })).toBeTruthy();
    expect(screen.getByRole('dialog').textContent).toContain('Sem localização disponível');
  });

  it('fecha com Cancelar e com Esc, mas não durante o envio', () => {
    const aoFechar = vi.fn();
    render(
      <DialogoSocorro posicao={posicao} localizacaoSimulada={false} aoEnviar={() => new Promise(() => {})} aoFechar={aoFechar} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(aoFechar).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar alerta' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(aoFechar).toHaveBeenCalledTimes(2);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('tela de alertas', () => {
  it('vazia: informa que não há pedidos e oferece a ligação', () => {
    render(<TelaAlertas registros={[]} aoLimpar={vi.fn()} />);
    expect(screen.getByText('Nenhum pedido de socorro feito até agora.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ligar 199/ }).getAttribute('href')).toBe('tel:199');
    expect(screen.queryByRole('button', { name: 'Limpar histórico' })).toBeNull();
  });

  it('lista enviados e falhos, com protocolo, coordenadas e marca de simulação', () => {
    const base = { momento: AGORA.toISOString(), posicao: { lat: -8.0153, lon: -34.9125 }, situacao: 'Você está em risco!' };
    const aoLimpar = vi.fn();
    render(
      <TelaAlertas
        registros={[
          { ...base, id: 'a', status: 'falhou', localizacaoSimulada: true },
          { ...base, id: 'b', status: 'enviado', localizacaoSimulada: false, protocolo: RECEBIDO.protocolo },
        ]}
        aoLimpar={aoLimpar}
      />,
    );
    const itens = within(screen.getByRole('list', { name: 'Histórico de alertas' })).getAllByRole('listitem');
    expect(itens[0]!.textContent).toContain('Envio não concluído');
    expect(itens[0]!.textContent).toContain('(localização simulada)');
    expect(itens[1]!.textContent).toContain('Alerta registrado');
    expect(itens[1]!.textContent).toContain(`Protocolo ${RECEBIDO.protocolo}`);
    expect(itens[1]!.textContent).toContain('-8.0153, -34.9125');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }));
    expect(aoLimpar).toHaveBeenCalledOnce();
  });
});

describe('socorro no app, de ponta a ponta', () => {
  /** Rede simulada: a rota de alerta usa a lógica real; o restante (clima) falha. */
  function rede(alertaFunciona: boolean) {
    const buscar = vi.fn(async (rota: unknown, opcoes?: RequestInit) => {
      if (rota !== '/api/alerta' || !alertaFunciona) throw new Error('Sem conexão.');
      const r = processarAlerta(opcoes?.method ?? 'GET', opcoes?.body);
      return { ok: r.status < 300, status: r.status, json: () => Promise.resolve(r.corpo) };
    });
    vi.stubGlobal('fetch', buscar);
    return buscar;
  }

  function abrirComLocalDeDemonstracao() {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar local de demonstração' }));
    fireEvent.click(screen.getByRole('button', { name: /Pedir socorro/ }));
  }

  it('envia o alerta com os dados do app e ele aparece na aba Alertas', async () => {
    const buscar = rede(true);
    abrirComLocalDeDemonstracao();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar alerta' }));
    await screen.findByRole('heading', { name: 'Alerta registrado' });
    const protocolo = within(screen.getByRole('dialog')).getByRole('status').textContent;

    const chamada = buscar.mock.calls.find(([rota]) => rota === '/api/alerta')!;
    expect(JSON.parse(String(chamada[1]!.body))).toMatchObject({
      lat: PONTO_DEMO_PADRAO.lat,
      lon: PONTO_DEMO_PADRAO.lon,
      localizacaoSimulada: true,
      risco: 'indefinido', // o relevo não carrega no teste; o app envia o que está mostrando
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Alertas' }));
    const item = within(screen.getByRole('list', { name: 'Histórico de alertas' })).getByRole('listitem');
    expect(item.textContent).toContain('Alerta registrado');
    expect(item.textContent).toContain(formatarCoordenada(PONTO_DEMO_PADRAO));
    expect(protocolo).toMatch(/Protocolo ES-\d{8}-[0-9A-F]{6}/);
    expect(item.textContent).toContain(protocolo!.replace('Protocolo ', ''));
  });

  it('sem conexão: mostra a falha, registra a tentativa e mantém a opção de ligar', async () => {
    rede(false);
    abrirComLocalDeDemonstracao();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar alerta' }));
    expect(await screen.findByRole('heading', { name: 'Não foi possível enviar' })).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: /Ligar 199/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alertas' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Histórico de alertas' }).textContent).toContain('Envio não concluído'));
  });

  it('sem localização, o botão abre o diálogo só com a ligação', () => {
    rede(true);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Pedir socorro/ }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).queryByRole('button', { name: 'Enviar alerta' })).toBeNull();
    expect(within(dialogo).getByRole('link', { name: /Ligar 199/ })).toBeTruthy();
  });
});
