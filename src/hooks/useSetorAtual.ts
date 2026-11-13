import { useEffect, useRef, useState } from 'react';
import type { Coordenada } from '@/domain/geografia';
import { setorDe, type Setor } from '@/domain/grade';
import { inclinacaoDoSetor, type Inclinacao } from '@/domain/inclinacao';
import { consultarAltitude } from '@/services/terreno';

export type EstadoSetor =
  | { status: 'sem-posicao' }
  | { status: 'carregando'; setor: Setor }
  | { status: 'ok'; setor: Setor; inclinacao: Inclinacao }
  | { status: 'erro'; setor: Setor };

/**
 * Cruza a posição do usuário com a grade: descobre o setor de 100 m em que ele
 * está e calcula a inclinação desse setor. Só recalcula quando o setor muda.
 */
export function useSetorAtual(
  posicao: Coordenada | null,
  consultar: (ponto: Coordenada) => Promise<number> = consultarAltitude,
): EstadoSetor {
  const setor = posicao ? setorDe(posicao) : null;
  const linha = setor?.linha;
  const coluna = setor?.coluna;
  const [estado, setEstado] = useState<EstadoSetor>({ status: 'sem-posicao' });

  // Guardada em ref para que uma função recriada a cada renderização não refaça a consulta.
  const consultarAtual = useRef(consultar);
  consultarAtual.current = consultar;

  useEffect(() => {
    if (linha === undefined || coluna === undefined) {
      setEstado({ status: 'sem-posicao' });
      return;
    }
    const atual: Setor = { linha, coluna };
    let cancelado = false;
    setEstado({ status: 'carregando', setor: atual });
    inclinacaoDoSetor(atual, consultarAtual.current).then(
      (inclinacao) => !cancelado && setEstado({ status: 'ok', setor: atual, inclinacao }),
      () => !cancelado && setEstado({ status: 'erro', setor: atual }),
    );
    return () => {
      cancelado = true;
    };
  }, [linha, coluna]);

  return estado;
}
