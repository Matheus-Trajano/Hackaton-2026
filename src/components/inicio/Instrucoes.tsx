import { Icone, type NomeIcone } from '@/components/ui/Icone';
import type { Perigo } from '@/domain/risco';
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

const EM_ATENCAO: Item[] = [
  { icone: 'chuva', texto: 'Acompanhe a chuva: se ela aumentar, afaste-se de barrancos e encostas.' },
  { icone: 'alerta', texto: 'Observe sinais de deslizamento: rachaduras, postes inclinados e água barrenta.' },
  { icone: 'abrigo', texto: 'Tenha em mente um local seguro para ir, caso a situação piore.' },
];

const ALAGAMENTO: Item[] = [
  { icone: 'proibido', texto: 'Não atravesse ruas alagadas, a pé ou de carro: a água esconde buracos e bueiros abertos.' },
  { icone: 'abrigo', texto: 'Se a água começar a subir, vá para um ponto mais alto.' },
  { icone: 'chuva', texto: 'Acompanhe a chuva e os avisos da Defesa Civil antes de sair.' },
];

const PREVENCAO: Item[] = [
  { icone: 'chuva', texto: 'Acompanhe a previsão de chuva antes de sair de casa.' },
  { icone: 'alerta', texto: 'Conheça os sinais de deslizamento: rachaduras, postes inclinados e água barrenta.' },
  { icone: 'abrigo', texto: 'Saiba onde fica o abrigo ou ponto seguro mais próximo.' },
];

interface Props {
  estado: EstadoRisco;
  /** Tipo de perigo; no alerta de alagamento, as orientações são outras. */
  perigo?: Perigo | null;
}

export function Instrucoes({ estado, perigo = null }: Props) {
  const emRisco = estado === 'risco';
  const itens = emRisco
    ? EM_RISCO
    : estado === 'atencao'
      ? perigo === 'alagamento'
        ? ALAGAMENTO
        : EM_ATENCAO
      : PREVENCAO;
  const titulo = emRisco ? 'O que fazer agora:' : estado === 'atencao' ? 'Fique atento:' : 'Para se prevenir:';
  return (
    <section className={`painel instrucoes instrucoes--${estado}`}>
      <h2 className="instrucoes__titulo">{titulo}</h2>
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
