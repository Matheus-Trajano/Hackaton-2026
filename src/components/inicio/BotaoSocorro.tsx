import { Icone } from '@/components/ui/Icone';

export function BotaoSocorro({ aoPedir }: { aoPedir: () => void }) {
  return (
    <button type="button" className="socorro" onClick={aoPedir}>
      <Icone nome="sirene" tamanho={44} />
      <strong>Pedir socorro</strong>
      <small>Registrar alerta ou ligar para a Defesa Civil</small>
    </button>
  );
}
