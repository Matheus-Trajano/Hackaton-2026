import { useState } from 'react';
import { Cabecalho } from '@/components/layout/Cabecalho';
import { MolduraCelular } from '@/components/layout/MolduraCelular';
import { NavegacaoInferior } from '@/components/layout/NavegacaoInferior';
import { TelaEmBreve } from '@/components/telas/TelaEmBreve';
import { TelaInicio } from '@/components/telas/TelaInicio';
import { TelaSobre } from '@/components/telas/TelaSobre';
import type { Aba, EstadoRisco } from '@/types';

export function App() {
  const [aba, setAba] = useState<Aba>('inicio');
  // Até a etapa 8, o estado de risco só muda pelo modo demonstração (aba Sobre).
  const [estadoRisco, setEstadoRisco] = useState<EstadoRisco>('indefinido');

  return (
    <MolduraCelular>
      <Cabecalho aoAbrirAjustes={() => setAba('sobre')} />
      <main className="conteudo">
        {aba === 'inicio' && <TelaInicio estadoRisco={estadoRisco} aoVerDetalhes={() => setAba('mapa')} />}
        {aba === 'mapa' && (
          <TelaEmBreve
            titulo="Mapa"
            icone="pino"
            descricao="O mapa de relevo em tela cheia, com a grade de setores, ficará aqui."
          />
        )}
        {aba === 'alertas' && (
          <TelaEmBreve
            titulo="Alertas"
            icone="sino"
            descricao="O histórico de alertas e pedidos de socorro ficará aqui."
          />
        )}
        {aba === 'sobre' && <TelaSobre estadoRisco={estadoRisco} aoMudarEstadoRisco={setEstadoRisco} />}
      </main>
      <NavegacaoInferior abaAtiva={aba} aoMudar={setAba} />
    </MolduraCelular>
  );
}
