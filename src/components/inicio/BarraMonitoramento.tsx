import { Icone } from '@/components/ui/Icone';

interface Props {
  /** Momento da última atualização dos dados; ausente enquanto não há dados. */
  ultimaAtualizacao?: Date;
  aoVerDetalhes: () => void;
}

export function BarraMonitoramento({ ultimaAtualizacao, aoVerDetalhes }: Props) {
  const ativo = Boolean(ultimaAtualizacao);
  return (
    <section className="painel monitoramento">
      <Icone nome="escudo" tamanho={30} className={ativo ? 'monitoramento__ok' : 'monitoramento__parado'} />
      <div className="monitoramento__texto">
        <p className={ativo ? 'monitoramento__ok' : 'monitoramento__parado'}>
          {ativo ? 'Monitoramento em tempo real' : 'Monitoramento ainda não iniciado'}
        </p>
        <p className="rotulo">
          Última atualização:{' '}
          {ultimaAtualizacao
            ? ultimaAtualizacao.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : '—'}
        </p>
      </div>
      <button type="button" className="botao-detalhes" onClick={aoVerDetalhes}>
        <Icone nome="grafico" tamanho={18} />
        Ver mais detalhes
        <Icone nome="seta" tamanho={16} />
      </button>
    </section>
  );
}
