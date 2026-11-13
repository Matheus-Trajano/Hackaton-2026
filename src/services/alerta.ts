import type { AlertaRecebido, PedidoDeAlerta } from '../../api/alerta';

export type { AlertaRecebido, PedidoDeAlerta };

export const ALERTA = {
  rota: '/api/alerta',
  tempoLimiteMs: 12_000,
} as const;

/** Envia o pedido de socorro. Lança erro se a rede falhar ou a resposta não for a esperada. */
export async function enviarAlerta(pedido: PedidoDeAlerta, buscar: typeof fetch = fetch): Promise<AlertaRecebido> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), ALERTA.tempoLimiteMs);
  try {
    const resposta = await buscar(ALERTA.rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal: controle.signal,
    });
    const corpo: unknown = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      const erro = (corpo as { erro?: unknown } | null)?.erro;
      throw new Error(typeof erro === 'string' ? erro : `O servidor respondeu ${resposta.status}.`);
    }
    const recebido = corpo as Partial<AlertaRecebido> | null;
    if (typeof recebido?.protocolo !== 'string' || typeof recebido.recebidoEm !== 'string') {
      throw new Error('Resposta inesperada do servidor.');
    }
    return { protocolo: recebido.protocolo, recebidoEm: recebido.recebidoEm, simulado: true };
  } finally {
    clearTimeout(limite);
  }
}
