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
  const [descricao, setDescricao] = useState('');
  const [gravando, setGravando] = useState(false);
  const [audioGravado, setAudioGravado] = useState(false);
  const gravador = useRef<MediaRecorder | null>(null);
  const fluxoAudio = useRef<MediaStream | null>(null);
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
  useEffect(
    () => () => {
      gravador.current?.stop();
      fluxoAudio.current?.getTracks().forEach((faixa) => faixa.stop());
    },
    [],
  );

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
  const ligarBombeiros = (
    <a className="dialogo__ligar dialogo__ligar--bombeiros" href={`tel:${APP.telefoneBombeiros}`}>
      <Icone nome="telefone" tamanho={20} />
      Ligar {APP.telefoneBombeiros} (Bombeiros)
    </a>
  );

  const alternarGravacao = async () => {
    if (gravando) {
      gravador.current?.stop();
      fluxoAudio.current?.getTracks().forEach((faixa) => faixa.stop());
      setGravando(false);
      setAudioGravado(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAudioGravado(true);
      return;
    }

    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const novoGravador = new MediaRecorder(fluxo);
      novoGravador.onstop = () => setAudioGravado(true);
      fluxoAudio.current = fluxo;
      gravador.current = novoGravador;
      novoGravador.start();
      setGravando(true);
    } catch {
      // O áudio é opcional: se o dispositivo negar acesso, o usuário ainda pode digitar.
      setAudioGravado(false);
    }
  };

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
            {ligarBombeiros}
            <label className="dialogo__campo">
              <span>Descreva a situação (opcional)</span>
              <textarea
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                placeholder="Digite o que está acontecendo..."
                rows={3}
                disabled={enviando}
              />
            </label>
            <button type="button" className="dialogo__audio" onClick={() => void alternarGravacao()} disabled={enviando}>
              <Icone nome={gravando ? 'microfone-gravando' : 'microfone'} tamanho={20} />
              {gravando ? 'Parar gravação' : audioGravado ? 'Áudio gravado' : 'Gravar áudio'}
            </button>
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
            <p className="dialogo__sucesso" aria-live="polite">
              Os órgãos responsáveis receberam o seu pedido de ajuda.
            </p>
            <p role="status">
              Protocolo <strong>{etapa.alerta.protocolo}</strong>
            </p>
            {ligar}
            {ligarBombeiros}
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
