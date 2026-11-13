import { BarraMonitoramento } from '@/components/inicio/BarraMonitoramento';
import { BotaoSocorro } from '@/components/inicio/BotaoSocorro';
import { Instrucoes } from '@/components/inicio/Instrucoes';
import { PainelClima } from '@/components/inicio/PainelClima';
import { MapaBase } from '@/components/mapa/MapaBase';
import { PainelRisco } from '@/components/inicio/PainelRisco';
import type { EstadoLocalizacao } from '@/domain/localizacao';
import type { EstadoAltitude } from '@/hooks/useAltitude';
import type { EstadoSetor } from '@/hooks/useSetorAtual';
import type { EstadoClima } from '@/hooks/useClima';
import type { AvaliacaoRisco } from '@/domain/risco';

interface Props {
  risco: AvaliacaoRisco;
  /** O estado de risco foi forçado pelo modo demonstração? */
  riscoSimulado: boolean;
  localizacao: EstadoLocalizacao;
  aoUsarDemonstracao: () => void;
  altitude: EstadoAltitude;
  setorAtual: EstadoSetor;
  clima: EstadoClima;
  /** De onde é a previsão do tempo. */
  localDoClima: string;
  aoVerDetalhes: () => void;
  aoPedirSocorro: () => void;
}

export function TelaInicio({
  risco,
  riscoSimulado,
  localizacao,
  aoUsarDemonstracao,
  altitude,
  setorAtual,
  clima,
  localDoClima,
  aoVerDetalhes,
  aoPedirSocorro,
}: Props) {
  return (
    <div className="inicio">
      <PainelClima estado={clima} local={localDoClima} />
      <MapaBase
        localizacao={localizacao}
        aoUsarDemonstracao={aoUsarDemonstracao}
        altitude={altitude}
        setorAtual={setorAtual}
      />
      <PainelRisco avaliacao={risco} simulado={riscoSimulado} />
      <div className="inicio__acoes">
        <Instrucoes estado={risco.estado} perigo={risco.perigo} />
        <BotaoSocorro aoPedir={aoPedirSocorro} />
      </div>
      <BarraMonitoramento
        ultimaAtualizacao={clima.status === 'ok' ? clima.atualizadoEm : undefined}
        aoVerDetalhes={aoVerDetalhes}
      />
    </div>
  );
}
