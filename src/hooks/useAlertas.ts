import { useCallback, useState } from 'react';
import type { Coordenada } from '@/domain/geografia';

/** Um pedido de socorro feito neste aparelho. */
export interface RegistroDeAlerta {
  id: string;
  /** Momento do pedido (ISO 8601). */
  momento: string;
  posicao: Coordenada;
  localizacaoSimulada: boolean;
  /** Título do painel de risco no momento do pedido. */
  situacao: string;
  status: 'enviado' | 'falhou';
  /** Presente quando o envio deu certo. */
  protocolo?: string;
}

const CHAVE = 'encosta-segura:alertas';
const MAXIMO = 50;

function ler(): RegistroDeAlerta[] {
  try {
    const dados: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(dados) ? (dados as RegistroDeAlerta[]) : [];
  } catch {
    // Armazenamento indisponível ou corrompido: começa vazio.
    return [];
  }
}

function gravar(registros: RegistroDeAlerta[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(registros));
  } catch {
    // Sem armazenamento (modo privado, cota cheia): o histórico vale só nesta sessão.
  }
}

/** Histórico dos pedidos de socorro, guardado no próprio aparelho (mais recente primeiro). */
export function useAlertas() {
  const [registros, setRegistros] = useState<RegistroDeAlerta[]>(ler);

  const registrar = useCallback((novo: Omit<RegistroDeAlerta, 'id'>) => {
    setRegistros((anteriores) => {
      const atualizados = [{ ...novo, id: crypto.randomUUID() }, ...anteriores].slice(0, MAXIMO);
      gravar(atualizados);
      return atualizados;
    });
  }, []);

  const limpar = useCallback(() => {
    gravar([]);
    setRegistros([]);
  }, []);

  return { registros, registrar, limpar };
}
