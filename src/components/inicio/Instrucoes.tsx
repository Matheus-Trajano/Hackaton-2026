import { Icone, type NomeIcone } from '@/components/ui/Icone';
import type { EstadoRisco } from '@/types';

interface Item {
  icone: NomeIcone;
  texto: string;
}

const EM_RISCO: Item[] = [
  { icone: 'abrigo', texto: 'Se possível, procure um local seguro, longe de encostas e áreas de risco.' },
  { icone: 'proibido', texto: 'Evite transitar por áreas de declive e não se aproxime de muros ou encostas.' },
  {
    icone: 'alerta',
    texto: 'Fique atento a sinais de deslizamento, como rachaduras, barulhos estranhos e água barrenta.',
  },
];

const PREVENCAO: Item[] = [
  { icone: 'chuva', texto: 'Acompanhe a previsão de chuva antes de sair de casa.' },
  { icone: 'alerta', texto: 'Conheça os sinais de deslizamento: rachaduras, postes inclinados e água barrenta.' },
  { icone: 'abrigo', texto: 'Saiba onde fica o abrigo ou ponto seguro mais próximo.' },
];

export function Instrucoes({ estado }: { estado: EstadoRisco }) {
  const emRisco = estado === 'risco';
  const itens = emRisco ? EM_RISCO : PREVENCAO;
  return (
    <section className={`painel instrucoes${emRisco ? ' instrucoes--risco' : ''}`}>
      <h2 className="instrucoes__titulo">{emRisco ? 'O que fazer agora:' : 'Para se prevenir:'}</h2>
      <ul className="instrucoes__lista">
        {itens.map((item) => (
          <li key={item.texto}>
            <Icone nome={item.icone} tamanho={22} />
            <span>{item.texto}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
