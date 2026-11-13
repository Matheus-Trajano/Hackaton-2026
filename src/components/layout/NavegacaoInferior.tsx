import { Icone, type NomeIcone } from '@/components/ui/Icone';
import type { Aba } from '@/types';

const ABAS: { id: Aba; rotulo: string; icone: NomeIcone }[] = [
  { id: 'inicio', rotulo: 'Início', icone: 'casa' },
  { id: 'mapa', rotulo: 'Mapa', icone: 'pino' },
  { id: 'alertas', rotulo: 'Alertas', icone: 'sino' },
  { id: 'sobre', rotulo: 'Sobre', icone: 'info' },
];

interface Props {
  abaAtiva: Aba;
  aoMudar: (aba: Aba) => void;
}

export function NavegacaoInferior({ abaAtiva, aoMudar }: Props) {
  return (
    <nav className="navegacao" aria-label="Navegação principal">
      {ABAS.map((aba) => {
        const ativa = aba.id === abaAtiva;
        return (
          <button
            key={aba.id}
            type="button"
            className={`navegacao__aba${ativa ? ' navegacao__aba--ativa' : ''}`}
            aria-current={ativa ? 'page' : undefined}
            onClick={() => aoMudar(aba.id)}
          >
            <Icone nome={aba.icone} tamanho={26} />
            <span>{aba.rotulo}</span>
          </button>
        );
      })}
    </nav>
  );
}
