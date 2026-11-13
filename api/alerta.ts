/**
 * Função serverless da Vercel: recebe o pedido de socorro do app.
 *
 * PROTÓTIPO: o alerta é validado, recebe um protocolo e é escrito no log da
 * função. Ele NÃO é guardado em banco de dados nem encaminhado à Defesa Civil.
 *
 * Este arquivo não importa nada de `src/`, para a Vercel conseguir empacotá-lo
 * sozinho. O mesmo código atende o servidor de desenvolvimento (vite.config.ts).
 */

export interface PedidoDeAlerta {
  lat: number;
  lon: number;
  /** Margem de erro da posição, em metros. */
  precisaoMetros?: number;
  /** A posição veio de um local de demonstração, não do GPS. */
  localizacaoSimulada?: boolean;
  /** Estado de risco exibido no app no momento do pedido. */
  risco?: string;
  inclinacaoPercentual?: number;
  chuva?: string;
  /** Momento do pedido no aparelho (ISO 8601). */
  momento?: string;
}

export interface AlertaRecebido {
  protocolo: string;
  recebidoEm: string;
  /** Sempre `true` neste protótipo: o alerta não aciona ninguém. */
  simulado: true;
}

export interface RespostaDaApi {
  status: number;
  corpo: AlertaRecebido | { erro: string };
}

const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const texto = (v: unknown, maximo: number): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= maximo ? v : undefined;

/** Confere e normaliza o pedido. Devolve a mensagem de erro se for inválido. */
export function validarPedido(dados: unknown): PedidoDeAlerta | string {
  if (typeof dados !== 'object' || dados === null) return 'Corpo do pedido ausente ou inválido.';
  const d = dados as Record<string, unknown>;
  if (!numero(d.lat) || d.lat < -90 || d.lat > 90) return 'Latitude ausente ou inválida.';
  if (!numero(d.lon) || d.lon < -180 || d.lon > 180) return 'Longitude ausente ou inválida.';
  return {
    lat: d.lat,
    lon: d.lon,
    precisaoMetros: numero(d.precisaoMetros) && d.precisaoMetros >= 0 ? d.precisaoMetros : undefined,
    localizacaoSimulada: d.localizacaoSimulada === true,
    risco: texto(d.risco, 40),
    inclinacaoPercentual: numero(d.inclinacaoPercentual) ? d.inclinacaoPercentual : undefined,
    chuva: texto(d.chuva, 40),
    momento: texto(d.momento, 40),
  };
}

/** Ex.: `ES-20261113-4F9A2C`. */
export function gerarProtocolo(agora: Date, aleatorio: string = crypto.randomUUID()): string {
  const dia = agora.toISOString().slice(0, 10).replaceAll('-', '');
  return `ES-${dia}-${aleatorio.replaceAll('-', '').slice(0, 6).toUpperCase()}`;
}

/** Lógica da rota, independente do servidor. `corpo` pode vir como texto JSON ou já interpretado. */
export function processarAlerta(metodo: string, corpo: unknown, agora: Date = new Date()): RespostaDaApi {
  if (metodo !== 'POST') return { status: 405, corpo: { erro: 'Use o método POST.' } };

  let dados: unknown = corpo;
  if (typeof corpo === 'string') {
    try {
      dados = JSON.parse(corpo);
    } catch {
      return { status: 400, corpo: { erro: 'O corpo do pedido não é um JSON válido.' } };
    }
  }

  const pedido = validarPedido(dados);
  if (typeof pedido === 'string') return { status: 400, corpo: { erro: pedido } };

  const recebido: AlertaRecebido = { protocolo: gerarProtocolo(agora), recebidoEm: agora.toISOString(), simulado: true };
  console.log('[alerta simulado]', JSON.stringify({ ...recebido, ...pedido }));
  return { status: 201, corpo: recebido };
}

/** Tipos mínimos do pedido e da resposta da Vercel (evita uma dependência só para tipos). */
interface PedidoVercel {
  method?: string;
  body?: unknown;
}
interface RespostaVercel {
  status(codigo: number): RespostaVercel;
  json(corpo: unknown): void;
  setHeader(nome: string, valor: string): void;
}

export default function handler(pedido: PedidoVercel, resposta: RespostaVercel): void {
  const resultado = processarAlerta(pedido.method ?? 'GET', pedido.body);
  if (resultado.status === 405) resposta.setHeader('Allow', 'POST');
  resposta.status(resultado.status).json(resultado.corpo);
}
