import { BarraMonitoramento } from '@/components/inicio/BarraMonitoramento';
import { BotaoSocorro } from '@/components/inicio/BotaoSocorro';
import { Instrucoes } from '@/components/inicio/Instrucoes';
import { PainelClima } from '@/components/inicio/PainelClima';
import { MapaBase } from '@/components/mapa/MapaBase';
import { PainelRisco } from '@/components/inicio/PainelRisco';
import type { EstadoLocalizacao } from '@/domain/localizacao';
import type { EstadoRisco, ResumoClima } from '@/types';

interface Props {
  estadoRisco: EstadoRisco;
  localizacao: EstadoLocalizacao;
  aoUsarDemonstracao: () => void;
  clima?: ResumoClima;
  ultimaAtualizacao?: Date;
  aoVerDetalhes: () => void;
}

export function TelaInicio({
  estadoRisco,
  localizacao,
  aoUsarDemonstracao,
  clima,
  ultimaAtualizacao,
  aoVerDetalhes,
}: Props) {
  return (
    <div className="inicio">
      <PainelClima clima={clima} />
      <MapaBase localizacao={localizacao} aoUsarDemonstracao={aoUsarDemonstracao} />
      <PainelRisco estado={estadoRisco} />
      <div className="inicio__acoes">
        <Instrucoes estado={estadoRisco} />
        <BotaoSocorro />
      </div>
      <BarraMonitoramento ultimaAtualizacao={ultimaAtualizacao} aoVerDetalhes={aoVerDetalhes} />
    </div>
  );
}
