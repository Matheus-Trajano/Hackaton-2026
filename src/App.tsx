import { useState } from 'react';
import { Cabecalho } from '@/components/layout/Cabecalho';
import { MolduraCelular } from '@/components/layout/MolduraCelular';
import { NavegacaoInferior } from '@/components/layout/NavegacaoInferior';
import { MapaBase } from '@/components/mapa/MapaBase';
import { TelaEmBreve } from '@/components/telas/TelaEmBreve';
import { TelaInicio } from '@/components/telas/TelaInicio';
import { TelaSobre } from '@/components/telas/TelaSobre';
import { PONTO_DEMO_PADRAO } from '@/config/pontosDemo';
import { posicaoUtilizavel } from '@/domain/localizacao';
import { CLIMA } from '@/config/clima';
import { useAltitude } from '@/hooks/useAltitude';
import { useClima } from '@/hooks/useClima';
import { useSetorAtual } from '@/hooks/useSetorAtual';
import { useLocalizacao } from '@/hooks/useLocalizacao';
import type { Aba, EstadoRisco } from '@/types';

export function App() {
  const [aba, setAba] = useState<Aba>('inicio');
  // Até a etapa 8, o estado de risco só muda pelo modo demonstração (aba Sobre).
  const [estadoRisco, setEstadoRisco] = useState<EstadoRisco>('indefinido');

  const localizacao = useLocalizacao();
  const posicao = posicaoUtilizavel(localizacao.estado) ? localizacao.estado.posicao : null;
  const altitude = useAltitude(posicao);
  const setorAtual = useSetorAtual(posicao);
  // Sem localização utilizável, a previsão é a do local padrão (e o painel diz isso).
  const clima = useClima(posicao ?? CLIMA.localPadrao);
  const localDoClima = posicao
    ? localizacao.estado.modo === 'simulado'
      ? (localizacao.estado.nomeLocal ?? 'o local simulado')
      : 'sua localização'
    : `${CLIMA.localPadrao.nome} (sem localização)`;
  const usarDemonstracao = () => localizacao.usarPontoDemo(PONTO_DEMO_PADRAO.id);

  return (
    <MolduraCelular>
      <Cabecalho aoAbrirAjustes={() => setAba('sobre')} />
      <main className="conteudo">
        {aba === 'inicio' && (
          <TelaInicio
            estadoRisco={estadoRisco}
            clima={clima}
            localDoClima={localDoClima}
            localizacao={localizacao.estado}
            aoUsarDemonstracao={usarDemonstracao}
            altitude={altitude}
            setorAtual={setorAtual}
            aoVerDetalhes={() => setAba('mapa')}
          />
        )}
        {aba === 'mapa' && (
          <MapaBase
            className="mapa--cheio"
            localizacao={localizacao.estado}
            aoUsarDemonstracao={usarDemonstracao}
            altitude={altitude}
            setorAtual={setorAtual}
          />
        )}
        {aba === 'alertas' && (
          <TelaEmBreve
            titulo="Alertas"
            icone="sino"
            descricao="O histórico de alertas e pedidos de socorro ficará aqui."
          />
        )}
        {aba === 'sobre' && (
          <TelaSobre
            estadoRisco={estadoRisco}
            aoMudarEstadoRisco={setEstadoRisco}
            localizacao={localizacao}
          />
        )}
      </main>
      <NavegacaoInferior abaAtiva={aba} aoMudar={setAba} />
    </MolduraCelular>
  );
}
