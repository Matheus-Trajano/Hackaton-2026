import { Icone, type NomeIcone } from '@/components/ui/Icone';
import type { EstadoRisco } from '@/types';

const CONTEUDO: Record<EstadoRisco, { icone: NomeIcone; titulo: string; texto: string }> = {
  risco: {
    icone: 'alerta',
    titulo: 'Você está em risco!',
    texto:
      'Sua localização está em uma área de encosta com inclinação acentuada e previsão de chuva forte.',
  },
  seguro: {
    icone: 'escudo',
    titulo: 'Você está em área segura',
    texto: 'Sua localização não está em área de encosta com risco no momento.',
  },
  indefinido: {
    icone: 'mira',
    titulo: 'Risco ainda não avaliado',
    texto: 'Aguardando sua localização e os dados de relevo e chuva.',
  },
};

export function PainelRisco({ estado }: { estado: EstadoRisco }) {
  const { icone, titulo, texto } = CONTEUDO[estado];
  return (
    <section
      className={`risco risco--${estado}`}
      role={estado === 'risco' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <Icone nome={icone} tamanho={52} className="risco__icone" />
      <div>
        <h2 className="risco__titulo">{titulo}</h2>
        <p className="risco__texto">{texto}</p>
      </div>
    </section>
  );
}
