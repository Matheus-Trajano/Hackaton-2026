import { useEffect, useRef, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import { APP } from '@/config/app';
import { formatarCoordenada } from '@/domain/localizacao';
import type { Coordenada } from '@/domain/geografia';
import type { AlertaRecebido } from '@/services/alerta';

type Etapa =
  | { nome: 'confirmar' }
  | { nome: 'enviando' }
  | { nome: 'enviado'; alerta: AlertaRecebido }
  | { nome: 'falhou'; motivo: string };

interface Props {
  /** Posição que irá no alerta; `null` quando não há localização utilizável. */
  posicao: Coordenada | null;
  localizacaoSimulada: boolean;
  /** Envia o alerta; deve rejeitar em caso de falha. */
  aoEnviar: () => Promise<AlertaRecebido>;
  aoFechar: () => void;
}

/** Confirmação e acompanhamento do pedido de socorro. */
export function DialogoSocorro({ posicao, localizacaoSimulada, aoEnviar, aoFechar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>({ nome: 'confirmar' });
  const caixa = useRef<HTMLDivElement>(null);
  const enviando = etapa.nome === 'enviando';

  // Leva o foco para o diálogo ao abrir e fecha com Esc (exceto durante o envio).
  useEffect(() => {
    caixa.current?.focus();
  }, []);
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !enviando) aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [enviando, aoFechar]);

  const enviar = () => {
    setEtapa({ nome: 'enviando' });
    aoEnviar().then(
      (alerta) => setEtapa({ nome: 'enviado', alerta }),
      (erro: unknown) => setEtapa({ nome: 'falhou', motivo: erro instanceof Error ? erro.message : 'Falha desconhecida.' }),
    );
  };

  const ligar = (
    <a className="dialogo__ligar" href={`tel:${APP.telefoneEmergencia}`}>
      <Icone nome="telefone" tamanho={20} />
      Ligar {APP.telefoneEmergencia} (Defesa Civil)
    </a>
  );

  return (
    <div className="dialogo__fundo">
      <div
        ref={caixa}
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-socorro-titulo"
        tabIndex={-1}
      >
        <h2 id="dialogo-socorro-titulo">
          {etapa.nome === 'enviado' ? 'Alerta registrado' : etapa.nome === 'falhou' ? 'Não foi possível enviar' : 'Pedir socorro'}
        </h2>

        {(etapa.nome === 'confirmar' || etapa.nome === 'enviando') && (
          <>
            {posicao ? (
              <p>
                O alerta levará a sua localização{localizacaoSimulada ? ' simulada' : ''} (
                {formatarCoordenada(posicao)}) e a situação de risco mostrada no app.
              </p>
            ) : (
              <p>Sem localização disponível, não é possível enviar o alerta pelo app. Ligue para a Defesa Civil.</p>
            )}
            <p className="dialogo__aviso">
              Protótipo: o alerta fica registrado apenas no sistema de demonstração e <strong>não chega à Defesa
              Civil</strong>. Em emergência real, ligue {APP.telefoneEmergencia}.
            </p>
            {ligar}
            {posicao && (
              <button type="button" className="dialogo__enviar" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar alerta'}
              </button>
            )}
            <button type="button" className="dialogo__secundario" onClick={aoFechar} disabled={enviando}>
              Cancelar
            </button>
          </>
        )}

        {etapa.nome === 'enviado' && (
          <>
            <p role="status">
              Protocolo <strong>{etapa.alerta.protocolo}</strong>
            </p>
            <p className="dialogo__aviso">
              Registro de demonstração: nenhuma equipe foi acionada. Se você está em perigo, ligue agora.
            </p>
            {ligar}
            <button type="button" className="dialogo__secundario" onClick={aoFechar}>
              Fechar
            </button>
          </>
        )}

        {etapa.nome === 'falhou' && (
          <>
            <p role="alert">{etapa.motivo}</p>
            <p className="dialogo__aviso">Não espere pelo app: ligue para a Defesa Civil.</p>
            {ligar}
            <button type="button" className="dialogo__enviar" onClick={enviar}>
              Tentar de novo
            </button>
            <button type="button" className="dialogo__secundario" onClick={aoFechar}>
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
