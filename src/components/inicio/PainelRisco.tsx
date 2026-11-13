import { Icone, type NomeIcone } from '@/components/ui/Icone';
import type { AvaliacaoRisco } from '@/domain/risco';
import type { EstadoRisco } from '@/types';

const ICONES: Record<EstadoRisco, NomeIcone> = {
  risco: 'alerta',
  atencao: 'alerta',
  seguro: 'escudo',
  indefinido: 'mira',
};

interface Props {
  avaliacao: AvaliacaoRisco;
  /** Indica que o estado foi forçado pelo modo demonstração. */
  simulado?: boolean;
}

export function PainelRisco({ avaliacao, simulado = false }: Props) {
  const { estado, titulo, texto } = avaliacao;
  return (
    <section
      className={`risco risco--${estado}`}
      role={estado === 'risco' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <Icone nome={ICONES[estado]} tamanho={52} className="risco__icone" />
      <div>
        <h2 className="risco__titulo">{titulo}</h2>
        <p className="risco__texto">{texto}</p>
        {simulado && <p className="risco__simulado">Estado simulado (modo demonstração)</p>}
      </div>
    </section>
  );
}
