# Arquitetura

Aplicação web de página única (SPA), mobile-first, sem backend próprio além de
uma função serverless para o alerta de socorro.

## Camadas

```
components  →  hooks  →  services (APIs externas)
                 ↓
              domain (lógica pura: grade, inclinação, risco)
```

- **components/**: só interface; não fazem chamadas de rede diretamente.
- **hooks/**: ligam interface, serviços e domínio (estado, carregamento, erro).
- **services/**: um arquivo por API externa; devolvem dados já tipados.
- **domain/**: funções puras, sem rede nem DOM — é onde ficam os cálculos e a
  maior parte dos testes.
- **config/**: constantes (`src/config/app.ts`).

## Fluxo de dados previsto

1. O navegador informa a posição do dispositivo (ou um ponto simulado).
2. A posição é convertida no setor de 100 m da grade.
3. As altitudes do setor e dos vizinhos dão a inclinação (%).
4. A previsão de chuva é buscada para a mesma posição.
5. O motor de risco combina inclinação e chuva e alimenta o painel inferior.

## Decisões

| Decisão | Motivo |
|---|---|
| Vite + React + TypeScript | Build rápido, deploy direto na Vercel, tipagem estrita |
| Web app em vez de app nativo | Roda na Vercel e simula o celular no navegador |
| Chamadas às APIs direto do navegador | APIs públicas, sem chave; dispensa backend |
| Lógica de cálculo isolada em `domain/` | Testável sem rede e sem mapa |
| Alias `@/` → `src/` | Imports curtos e estáveis |

## Interface

```
MolduraCelular            moldura do aparelho (só em telas largas) + barra de status
├── Cabecalho             logo, nome, botão de ajustes (abre a aba Sobre)
├── <main>                uma tela por aba
│   ├── TelaInicio
│   │   ├── PainelClima          chuva nas próximas 3 h e temperatura
│   │   ├── MapaBase             mapa Leaflet + controles
│   │   ├── PainelRisco          não avaliado / seguro / em risco
│   │   ├── Instrucoes + BotaoSocorro
│   │   └── BarraMonitoramento
│   ├── MapaBase          aba Mapa (mesmo componente, em tela cheia)
│   ├── TelaEmBreve       aba Alertas (provisória)
│   └── TelaSobre         informações e modo demonstração
└── NavegacaoInferior     Início · Mapa · Alertas · Sobre
```

- A aba ativa, o estado de risco e a localização (`useLocalizacao`) ficam em
  `App.tsx` e descem por propriedades; não há
  roteador nem biblioteca de estado.
- Os painéis recebem os dados por propriedades opcionais. **Sem dados, mostram
  "—" / "Sem dados"** em vez de valores fictícios; o botão de socorro fica
  desativado enquanto não houver ação ligada a ele.
- Ícones: SVG embutido em `components/ui/Icone.tsx`, sem biblioteca externa.
- Estilos: CSS puro em `src/styles/global.css`, com variáveis de cor do tema.
- A moldura de celular é ativada por media query (`min-width: 600px`).

## Mapa

- `components/mapa/MapaBase.tsx` usa o Leaflet diretamente (sem `react-leaflet`):
  o mapa é criado uma vez em um `useEffect` e guardado em um `ref`.
- Configuração em `config/mapa.ts`: provedores, centro, zoom inicial/mínimo/máximo
  e folga dos limites.
- O mapa é travado em Pernambuco com `maxBounds` (limites de PE + folga) e
  `minZoom`.
- Os controles (aproximar, afastar, centralizar, trocar camada) são botões React
  sobre o mapa; a escala é o controle nativo do Leaflet, só em metros/km.
- Se nenhuma imagem do mapa base carregar, aparece um aviso sobre o mapa.
- Um `ResizeObserver` recalcula o tamanho do mapa quando o painel muda.
- `domain/geografia.ts` tem as funções puras de limites (`dentroDePernambuco`,
  `expandirLimites`). A cobertura usa o **retângulo** que envolve o estado, não o
  contorno exato — aceita trechos de estados vizinhos dentro do retângulo.
- Limitação conhecida: a tela inicial e a aba Mapa criam instâncias separadas do
  mapa, então posição e zoom não são preservados ao trocar de aba (com
  localização disponível, cada uma volta a focar no usuário).

## Localização

- `hooks/useLocalizacao.ts` é a única fonte da posição do usuário. Tem dois
  modos: **GPS** (padrão; `watchPosition`) e **simulado** (um ponto de
  `config/pontosDemo.ts`). Ao sair do modo GPS, o acompanhamento é encerrado.
- `domain/localizacao.ts` guarda as regras puras: tipos de estado, tradução dos
  erros do navegador, texto dos avisos e `posicaoUtilizavel`.
- Estados possíveis: `buscando`, `ok`, `negada`, `indisponivel`, `nao-suportada`.
  Com `ok`, o campo `naCobertura` diz se a posição está em Pernambuco.
- **Só posição `ok` e dentro da cobertura é usada** (marcador, foco e, nas
  próximas etapas, setor e risco). Nos demais casos o mapa mostra um aviso.
- Uma falha passageira do GPS não descarta a última posição válida; a negação de
  permissão descarta.
- No mapa: marcador (pino + ponto azul), círculo de precisão e caixa de
  coordenadas. O mapa foca no usuário na primeira posição e quando a origem muda;
  depois só move o marcador, para não brigar com quem está navegando no mapa.

## Relevo

```
services/terreno.ts      baixa o tile PNG, lê os pixels (canvas) e guarda em cache
domain/altitude.ts       decodifica Terrarium, escolhe a cor, localiza ponto no tile
components/mapa/
  CamadaRelevo.ts        camada do Leaflet que pinta cada tile em um canvas
  LegendaAltitude.tsx    legenda da escala
hooks/useAltitude.ts     altitude da posição do usuário
config/relevo.ts         URL, zooms, opacidade e escala de cores
```

- Um único cache de tiles (`tilesDeAltitude`) serve o mapa de calor e as
  consultas de altitude; falhas não ficam guardadas.
- A escala de cores (`ESCALA_ALTITUDE`) é fixa, igual em todo o estado, e não
  linear. Altitude ≤ 0 fica transparente.
- Os tiles são buscados até o zoom 14; em zooms maiores a imagem é ampliada.
- `posicaoNoTile` (Web Mercator) é a base para a grade de setores da etapa 6.
- Se nenhum tile de relevo carregar, o mapa mostra um aviso.

## Estado atual (etapa 5)

Layout, navegação, mapa base, localização (real ou simulada) e mapa de calor de
altitude funcionando. Ainda sem grade de setores, inclinação, clima e análise de
risco reais; o estado de risco só muda pelo modo demonstração.
