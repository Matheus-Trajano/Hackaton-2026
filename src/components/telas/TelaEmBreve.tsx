import { Icone, type NomeIcone } from '@/components/ui/Icone';

interface Props {
  titulo: string;
  icone: NomeIcone;
  descricao: string;
}

/** Tela provisória para abas ainda não desenvolvidas. */
export function TelaEmBreve({ titulo, icone, descricao }: Props) {
  return (
    <div className="em-breve">
      <Icone nome={icone} tamanho={48} />
      <h2>{titulo}</h2>
      <p>{descricao}</p>
    </div>
  );
}
