import { useEffect, useState } from 'react';
import type { Coordenada } from '@/domain/geografia';
import { consultarAltitude } from '@/services/terreno';

export type EstadoAltitude =
  | { status: 'sem-posicao' }
  | { status: 'carregando' }
  | { status: 'ok'; metros: number }
  | { status: 'erro' };

/** Altitude do ponto informado. Passe `null` quando não houver posição utilizável. */
export function useAltitude(
  posicao: Coordenada | null,
  consultar: (ponto: Coordenada) => Promise<number> = consultarAltitude,
): EstadoAltitude {
  const lat = posicao?.lat;
  const lon = posicao?.lon;
  const [estado, setEstado] = useState<EstadoAltitude>({ status: 'sem-posicao' });

  useEffect(() => {
    if (lat === undefined || lon === undefined) {
      setEstado({ status: 'sem-posicao' });
      return;
    }
    let cancelado = false;
    setEstado({ status: 'carregando' });
    consultar({ lat, lon }).then(
      (metros) => !cancelado && setEstado({ status: 'ok', metros }),
      () => !cancelado && setEstado({ status: 'erro' }),
    );
    return () => {
      cancelado = true;
    };
  }, [lat, lon, consultar]);

  return estado;
}
