import { BarraMonitoramento } from '@/components/inicio/BarraMonitoramento';
import { BotaoSocorro } from '@/components/inicio/BotaoSocorro';
import { Instrucoes } from '@/components/inicio/Instrucoes';
import { PainelClima } from '@/components/inicio/PainelClima';
import { MapaBase } from '@/components/mapa/MapaBase';
import { PainelRisco } from '@/components/inicio/PainelRisco';
import type { EstadoLocalizacao } from '@/domain/localizacao';
import type { EstadoAltitude } from '@/hooks/useAltitude';
import type { EstadoSetor } from '@/hooks/useSetorAtual';
import type { EstadoRisco, ResumoClima } from '@/types';

interface Props {
  estadoRisco: EstadoRisco;
  localizacao: EstadoLocalizacao;
  aoUsarDemonstracao: () => void;
  altitude: EstadoAltitude;
  setorAtual: EstadoSetor;
  clima?: ResumoClima;
  ultimaAtualizacao?: Date;
  aoVerDetalhes: () => void;
}

export function TelaInicio({
  estadoRisco,
  localizacao,
  aoUsarDemonstracao,
  altitude,
  setorAtual,
  clima,
  ultimaAtualizacao,
  aoVerDetalhes,
}: Props) {
  return (
    <div className="inicio">
      <PainelClima clima={clima} />
      <MapaBase
        localizacao={localizacao}
        aoUsarDemonstracao={aoUsarDemonstracao}
        altitude={altitude}
        setorAtual={setorAtual}
      />
      <PainelRisco estado={estadoRisco} />
      <div className="inicio__acoes">
        <Instrucoes estado={estadoRisco} />
        <BotaoSocorro />
      </div>
      <BarraMonitoramento ultimaAtualizacao={ultimaAtualizacao} aoVerDetalhes={aoVerDetalhes} />
    </div>
  );
}
