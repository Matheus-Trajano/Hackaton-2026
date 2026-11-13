import { useEffect, useRef, useState } from 'react';
import { CLIMA } from '@/config/clima';
import type { ResumoClima } from '@/domain/clima';
import type { Coordenada } from '@/domain/geografia';
import { buscarClima } from '@/services/clima';

export type EstadoClima =
  | { status: 'carregando' }
  | { status: 'ok'; clima: ResumoClima; atualizadoEm: Date }
  /** Falhou e não há previsão anterior para mostrar. */
  | { status: 'erro' };

/**
 * Previsão do tempo para o ponto, atualizada periodicamente.
 * Uma falha ao atualizar mantém a última previsão obtida para o mesmo local.
 */
export function useClima(
  ponto: Coordenada,
  buscar: (ponto: Coordenada) => Promise<ResumoClima> = buscarClima,
): EstadoClima {
  // Arredonda para não refazer a consulta a cada pequeno deslocamento.
  const lat = Number(ponto.lat.toFixed(CLIMA.casasDaCoordenada));
  const lon = Number(ponto.lon.toFixed(CLIMA.casasDaCoordenada));
  const [estado, setEstado] = useState<EstadoClima>({ status: 'carregando' });
  const buscarAtual = useRef(buscar);
  buscarAtual.current = buscar;

  useEffect(() => {
    let cancelado = false;
    let proxima: ReturnType<typeof setTimeout> | undefined;
    // A previsão de outro local não serve para este.
    setEstado({ status: 'carregando' });

    const atualizar = () => {
      buscarAtual.current({ lat, lon }).then(
        (clima) => {
          if (cancelado) return;
          setEstado({ status: 'ok', clima, atualizadoEm: new Date() });
          proxima = setTimeout(atualizar, CLIMA.intervaloAtualizacaoMs);
        },
        () => {
          if (cancelado) return;
          setEstado((anterior) => (anterior.status === 'ok' ? anterior : { status: 'erro' }));
          proxima = setTimeout(atualizar, CLIMA.intervaloAposFalhaMs);
        },
      );
    };
    atualizar();

    return () => {
      cancelado = true;
      clearTimeout(proxima);
    };
  }, [lat, lon]);

  return estado;
}
