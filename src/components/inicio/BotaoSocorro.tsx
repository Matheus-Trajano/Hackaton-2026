import { Icone } from '@/components/ui/Icone';

interface Props {
  /** Sem ação definida, o botão fica desativado. O envio chega na etapa 9. */
  aoPedir?: () => void;
}

export function BotaoSocorro({ aoPedir }: Props) {
  return (
    <button type="button" className="socorro" onClick={aoPedir} disabled={!aoPedir}>
      <Icone nome="sirene" tamanho={44} />
      <strong>Pedir socorro</strong>
      <small>{aoPedir ? 'Alerta será enviado para a Defesa Civil' : 'Envio de alerta ainda não disponível'}</small>
    </button>
  );
}
