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
│   │   ├── PainelClima          chuva nas próximas 3 h, hora a hora, e temperatura
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
- `posicaoNoTile` (Web Mercator) localiza qualquer ponto nos tiles; é o que a
  grade de setores usa para ler altitudes.
- Se nenhum tile de relevo carregar, o mapa mostra um aviso.

## Grade de setores e inclinação

```
domain/grade.ts          setor de um ponto, limites, centro, setores de uma área
domain/inclinacao.ts     método de Horn, classificação, inclinação de um setor
hooks/useSetorAtual.ts   cruza a posição do usuário com a grade
components/mapa/
  CamadaSetores.ts       desenha a grade e pinta os setores no Leaflet
  LegendaInclinacao.tsx  legenda das quatro faixas
config/inclinacao.ts     faixas, cores e limites de desenho
```

- **Grade:** quadrados de 100 m alinhados ao norte, contados a partir do canto
  sudoeste da cobertura. Graus de longitude são convertidos em metros pela
  latitude média do estado (variação de largura inferior a 0,5%).
- **Inclinação de um setor:** altitudes de 9 pontos (cantos, meios das bordas e
  centro, espaçados 50 m) → gradiente pelo método de Horn → percentual, graus e
  classe.
- **Cruzamento com o usuário:** `useSetorAtual` recebe a posição utilizável,
  acha o setor e calcula a inclinação. Só recalcula quando o setor muda.
- **No mapa:** a grade só é desenhada a partir do zoom 15 e até 1.500 setores por
  vez; é redesenhada ao fim de cada movimento. Respostas de um desenho antigo são
  descartadas. Os resultados ficam em memória enquanto o mapa existir.
- **Uma camada de cada vez:** `MapaBase` tem o modo `altitude`, `inclinacao` ou
  `nenhum`.
- Os hooks de consulta guardam a função de consulta em um `ref`, para não
  refazer o trabalho se ela for recriada a cada renderização.

## Clima

```
services/clima.ts        monta a consulta, chama a Open-Meteo e valida a resposta
domain/clima.ts          janela das próximas horas, resumo e classificação da chuva
hooks/useClima.ts        estado (carregando / ok / erro) e atualização periódica
components/inicio/
  PainelClima.tsx        painel superior
config/clima.ts          URL, janela, intervalos, faixas de intensidade, local padrão
```

- **Resumo:** maior probabilidade, soma dos volumes e intensidade pelo maior
  volume em uma hora, na janela de 3 horas.
- **Validação:** `interpretarClima` lança erro se faltar temperatura, listas ou
  horas futuras. O app mostra "Sem dados" em vez de um número duvidoso.
- **Atualização:** a cada 10 minutos; após falha, nova tentativa em 1 minuto. Uma
  falha ao atualizar mantém a última previsão do mesmo local.
- **Local da consulta:** posição utilizável do usuário, arredondada a 2 casas;
  sem ela, o local padrão (Recife), com aviso no painel.
- O horário da última previsão alimenta a barra "Monitoramento em tempo real".
- Os horários vêm em segundos (UTC), o que evita erros de fuso; a exibição usa o
  fuso do aparelho.

## Estado atual (etapa 7)

Layout, navegação, mapa base, localização, mapa de calor, grade, inclinação e
previsão do tempo funcionando. Falta a análise de risco real: o painel de risco
**não** usa a inclinação nem a chuva e só muda pelo modo demonstração (etapa 8).
