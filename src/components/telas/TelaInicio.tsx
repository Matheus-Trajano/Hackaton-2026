import { BarraMonitoramento } from '@/components/inicio/BarraMonitoramento';
import { BotaoSocorro } from '@/components/inicio/BotaoSocorro';
import { Instrucoes } from '@/components/inicio/Instrucoes';
import { PainelClima } from '@/components/inicio/PainelClima';
import { MapaBase } from '@/components/mapa/MapaBase';
import { PainelRisco } from '@/components/inicio/PainelRisco';
import type { EstadoRisco, ResumoClima } from '@/types';

interface Props {
  estadoRisco: EstadoRisco;
  clima?: ResumoClima;
  ultimaAtualizacao?: Date;
  aoVerDetalhes: () => void;
}

export function TelaInicio({ estadoRisco, clima, ultimaAtualizacao, aoVerDetalhes }: Props) {
  return (
    <div className="inicio">
      <PainelClima clima={clima} />
      <MapaBase />
      <PainelRisco estado={estadoRisco} />
      <div className="inicio__acoes">
        <Instrucoes estado={estadoRisco} />
        <BotaoSocorro />
      </div>
      <BarraMonitoramento ultimaAtualizacao={ultimaAtualizacao} aoVerDetalhes={aoVerDetalhes} />
    </div>
  );
}
