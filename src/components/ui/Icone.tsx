import type { ReactNode } from 'react';

export type NomeIcone =
  | 'casa'
  | 'pino'
  | 'sino'
  | 'info'
  | 'engrenagem'
  | 'alerta'
  | 'proibido'
  | 'abrigo'
  | 'escudo'
  | 'sirene'
  | 'chuva'
  | 'termometro'
  | 'grafico'
  | 'seta'
  | 'mira'
  | 'relogio'
  | 'mais'
  | 'menos'
  | 'camadas'
  | 'montanha'
  | 'grade'
  | 'telefone'
  | 'microfone'
  | 'microfone-gravando';

const DESENHOS: Record<NomeIcone, ReactNode> = {
  casa: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h4.5v-6h4v6h4.5V10" />,
  pino: (
    <>
      <path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  sino: (
    <>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
      <path d="M10 21h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  engrenagem: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3.5 22 20.5H2L12 3.5Z" />
      <path d="M12 10v5M12 17.5v.5" />
    </>
  ),
  proibido: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.7 5.7l12.6 12.6" />
    </>
  ),
  abrigo: <path d="M3 11.5 12 4l9 7.5M6 10v9.5h12V10M10 19.5v-5h4v5" />,
  escudo: (
    <>
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3Z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  sirene: (
    <>
      <path d="M7 17v-4a5 5 0 0 1 10 0v4M4.5 20.5h15M6 17h12v3.5H6z" />
      <path d="M12 2.5v2.5M4.5 5.5l1.8 1.8M19.5 5.5l-1.8 1.8M2.5 12H5M19 12h2.5" />
    </>
  ),
  chuva: (
    <>
      <path d="M7 15.5a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.8 9a3.3 3.3 0 0 1-.8 6.5H7Z" />
      <path d="M8.5 18.5l-1 2.5M12.5 18.5l-1 2.5M16.5 18.5l-1 2.5" />
    </>
  ),
  termometro: (
    <>
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z" />
      <path d="M12 9v8" />
    </>
  ),
  grafico: <path d="M5 20V13M10 20V9M15 20V11M20 20V5" />,
  seta: <path d="m9 5 7 7-7 7" />,
  mira: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  camadas: <path d="m12 3.5 9 4.5-9 4.5L3 8l9-4.5ZM3.5 12.5 12 16.8l8.5-4.3M3.5 16.5 12 20.8l8.5-4.3" />,
  montanha: <path d="m2.5 19.5 6.5-11 4 6 2.5-3.5 6 8.5h-19Z" />,
  grade: <path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" />,
  telefone: (
    <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />
  ),
  microfone: (
    <>
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
    </>
  ),
  'microfone-gravando': (
    <>
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
      <circle cx="19.5" cy="5" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

interface Props {
  nome: NomeIcone;
  tamanho?: number;
  className?: string;
}

/** Ícones de traço em SVG, sem dependência externa. Sempre decorativos. */
export function Icone({ nome, tamanho = 24, className }: Props) {
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {DESENHOS[nome]}
    </svg>
  );
}
