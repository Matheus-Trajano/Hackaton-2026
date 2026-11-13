import { useCallback, useEffect, useMemo, useState } from 'react';
import { PONTOS_DEMO, type PontoDemo } from '@/config/pontosDemo';
import { dentroDePernambuco, type Coordenada } from '@/domain/geografia';
import { statusDoErro, type EstadoLocalizacao, type StatusLocalizacao } from '@/domain/localizacao';

interface LeituraGps {
  status: StatusLocalizacao;
  posicao?: Coordenada;
  precisaoMetros?: number;
}

export interface Localizacao {
  estado: EstadoLocalizacao;
  /** Id do ponto de demonstração em uso, se houver. */
  pontoDemoId?: string;
  usarGps: () => void;
  usarPontoDemo: (id: string) => void;
}

/**
 * Localização do usuário: GPS do aparelho (padrão) ou um ponto de demonstração.
 * No modo GPS, acompanha a posição continuamente.
 */
export function useLocalizacao(): Localizacao {
  const [pontoDemo, setPontoDemo] = useState<PontoDemo | null>(null);
  const [gps, setGps] = useState<LeituraGps>({ status: 'buscando' });
  const usandoGps = pontoDemo === null;

  useEffect(() => {
    if (!usandoGps) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGps({ status: 'nao-suportada' });
      return;
    }
    setGps({ status: 'buscando' });
    const id = navigator.geolocation.watchPosition(
      (leitura) =>
        setGps({
          status: 'ok',
          posicao: { lat: leitura.coords.latitude, lon: leitura.coords.longitude },
          precisaoMetros: leitura.coords.accuracy,
        }),
      (erro) =>
        setGps((anterior) => {
          const status = statusDoErro(erro.code);
          // Uma falha passageira não descarta uma posição já obtida.
          if (status === 'indisponivel' && anterior.status === 'ok') return anterior;
          return { status };
        }),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [usandoGps]);

  const usarGps = useCallback(() => setPontoDemo(null), []);
  const usarPontoDemo = useCallback((id: string) => {
    const ponto = PONTOS_DEMO.find((p) => p.id === id);
    if (ponto) setPontoDemo(ponto);
  }, []);

  const estado = useMemo<EstadoLocalizacao>(() => {
    if (pontoDemo) {
      const posicao = { lat: pontoDemo.lat, lon: pontoDemo.lon };
      return {
        modo: 'simulado',
        status: 'ok',
        posicao,
        naCobertura: dentroDePernambuco(posicao),
        nomeLocal: pontoDemo.nome,
      };
    }
    return {
      modo: 'gps',
      status: gps.status,
      posicao: gps.posicao,
      precisaoMetros: gps.precisaoMetros,
      naCobertura: gps.posicao ? dentroDePernambuco(gps.posicao) : false,
    };
  }, [pontoDemo, gps]);

  return { estado, pontoDemoId: pontoDemo?.id, usarGps, usarPontoDemo };
}
