import { useState } from 'react';
import { Cabecalho } from '@/components/layout/Cabecalho';
import { MolduraCelular } from '@/components/layout/MolduraCelular';
import { NavegacaoInferior } from '@/components/layout/NavegacaoInferior';
import { MapaBase } from '@/components/mapa/MapaBase';
import { DialogoSocorro } from '@/components/socorro/DialogoSocorro';
import { TelaAlertas } from '@/components/telas/TelaAlertas';
import { TelaInicio } from '@/components/telas/TelaInicio';
import { TelaSobre, type ModoRisco } from '@/components/telas/TelaSobre';
import { PONTO_DEMO_PADRAO } from '@/config/pontosDemo';
import { mensagemLocalizacao, posicaoUtilizavel } from '@/domain/localizacao';
import { avaliacaoDeDemonstracao, avaliarRisco } from '@/domain/risco';
import { CLIMA } from '@/config/clima';
import { useAlertas } from '@/hooks/useAlertas';
import { useAltitude } from '@/hooks/useAltitude';
import { useClima } from '@/hooks/useClima';
import { useSetorAtual } from '@/hooks/useSetorAtual';
import { useLocalizacao } from '@/hooks/useLocalizacao';
import { enviarAlerta } from '@/services/alerta';
import type { Aba } from '@/types';

export function App() {
  const [aba, setAba] = useState<Aba>('inicio');
  // 'automatico' usa os dados reais; os demais valores forçam um estado (modo demonstração).
  const [modoRisco, setModoRisco] = useState<ModoRisco>('automatico');

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
  // Motor de risco: inclinação do setor do usuário × previsão de chuva do mesmo local.
  const riscoReal = avaliarRisco(
    setorAtual.status === 'sem-posicao'
      ? { status: 'sem-posicao', aviso: mensagemLocalizacao(localizacao.estado) }
      : setorAtual,
    clima,
  );
  const risco = modoRisco === 'automatico' ? riscoReal : avaliacaoDeDemonstracao(modoRisco);
  // Pedido de socorro: envia o alerta e guarda o resultado (sucesso ou falha) no histórico.
  const [socorroAberto, setSocorroAberto] = useState(false);
  const alertas = useAlertas();
  const localizacaoSimulada = localizacao.estado.modo === 'simulado';
  const enviarSocorro = async () => {
    if (!posicao) throw new Error('Sem localização disponível.');
    const momento = new Date().toISOString();
    const registro = { momento, posicao, localizacaoSimulada, situacao: risco.titulo };
    try {
      const recebido = await enviarAlerta({
        lat: posicao.lat,
        lon: posicao.lon,
        precisaoMetros: localizacao.estado.precisaoMetros,
        localizacaoSimulada,
        risco: risco.estado,
        inclinacaoPercentual: setorAtual.status === 'ok' ? setorAtual.inclinacao.percentual : undefined,
        chuva: clima.status === 'ok' ? clima.clima.intensidade : undefined,
        momento,
      });
      alertas.registrar({ ...registro, status: 'enviado', protocolo: recebido.protocolo });
      return recebido;
    } catch (erro) {
      alertas.registrar({ ...registro, status: 'falhou' });
      throw erro;
    }
  };
  const usarDemonstracao = () => localizacao.usarPontoDemo(PONTO_DEMO_PADRAO.id);

  return (
    <MolduraCelular>
      <Cabecalho aoAbrirAjustes={() => setAba('sobre')} />
      <main className="conteudo">
        {aba === 'inicio' && (
          <TelaInicio
            risco={risco}
            riscoSimulado={modoRisco !== 'automatico'}
            clima={clima}
            localDoClima={localDoClima}
            localizacao={localizacao.estado}
            aoUsarDemonstracao={usarDemonstracao}
            altitude={altitude}
            setorAtual={setorAtual}
            aoVerDetalhes={() => setAba('mapa')}
            aoPedirSocorro={() => setSocorroAberto(true)}
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
        {aba === 'alertas' && <TelaAlertas registros={alertas.registros} aoLimpar={alertas.limpar} />}
        {aba === 'sobre' && (
          <TelaSobre
            modoRisco={modoRisco}
            aoMudarModoRisco={setModoRisco}
            localizacao={localizacao}
          />
        )}
      </main>
      <NavegacaoInferior abaAtiva={aba} aoMudar={setAba} />
      {socorroAberto && (
        <DialogoSocorro
          posicao={posicao}
          localizacaoSimulada={localizacaoSimulada}
          aoEnviar={enviarSocorro}
          aoFechar={() => setSocorroAberto(false)}
        />
      )}
    </MolduraCelular>
  );
}
