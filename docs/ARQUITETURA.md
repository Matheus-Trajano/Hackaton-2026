# Arquitetura

Aplicação web de página única (SPA), mobile-first, sem backend próprio além de
uma função serverless para o alerta de socorro (simulado).

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

## Fluxo de dados

1. `useLocalizacao`: o navegador informa a posição (ou um ponto simulado).
2. `useSetorAtual`: a posição é convertida no setor de 100 m da grade e as
   altitudes de 9 pontos do setor dão a inclinação (%).
3. `useClima`: a previsão de chuva é buscada para a mesma posição.
4. `avaliarRisco`: combina inclinação e chuva.
5. `PainelRisco` e `Instrucoes` mostram o resultado.

Tudo isso é ligado em `App.tsx`.

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
│   │   ├── PainelRisco          não avaliado / seguro / atenção / em risco
│   │   ├── Instrucoes + BotaoSocorro
│   │   └── BarraMonitoramento
│   ├── MapaBase          aba Mapa (mesmo componente, em tela cheia)
│   ├── TelaAlertas       histórico dos pedidos de socorro
│   └── TelaSobre         informações, localização e modo demonstração
├── NavegacaoInferior     Início · Mapa · Alertas · Sobre
└── DialogoSocorro        confirmação, envio e resultado do pedido de socorro
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
- **Uma camada de cada vez:** `MapaBase` tem o modo `inclinacao` (padrão),
  `altitude` ou `nenhum`. No modo inclinação, abaixo do zoom 15 é exibida a
  altitude.
- Funções de consulta passadas como parâmetro são sempre chamadas com um único
  argumento (nunca `lista.map(consultar)`), porque a consulta real tem
  parâmetros opcionais.
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

## Motor de risco

- `domain/risco.ts` → `avaliarRisco(inclinacao, chuva)`: função pura que devolve
  estado (`indefinido`, `seguro`, `atencao`, `risco`), título, texto e se a chuva
  agrava. As regras estão em `config/risco.ts`.
- Entradas com estado próprio: a inclinação pode estar sem posição, carregando,
  com erro ou disponível; a chuva pode estar carregando, com erro ou disponível.
- **Princípios:** sem inclinação conhecida, o resultado é `indefinido` (nunca
  "seguro" por falta de dados); setor de inclinação alta ou muito alta é risco
  mesmo sem previsão; inclinação moderada (11° a 20°) fica em `atencao` (`perigo: 'deslizamento'`)
  com chuva significativa ou sem previsão; inclinação normal (menos de 11°) com chuva moderada ou
  mais forte gera alerta de alagamento (estado `atencao`, `perigo: 'alagamento'`);
  sem chuva significativa ou sem previsão, é `seguro`.
- `AvaliacaoRisco.perigo` (`deslizamento`, `alagamento` ou `null`) define quais
  orientações o componente `Instrucoes` mostra.
- Classes de inclinação em graus (`config/inclinacao.ts`, `LIMITES_INCLINACAO`):
  normal < 11°, moderado 11° a < 20°, alto 20° a < 45°, muito alto ≥ 45°.
- O texto do painel sempre cita os dados usados (percentual, classe e chuva).
- **Modo demonstração:** `App.tsx` guarda `modoRisco`. Em `automatico` vale a
  avaliação real; nos demais, `avaliacaoDeDemonstracao`, e o painel exibe
  "Estado simulado".
- Limitação: só avalia deslizamento em encosta; chuva forte em área plana
  resulta em "seguro".

## Pedido de socorro

```
api/alerta.ts                  rota: valida, gera protocolo, escreve no log
vite.config.ts (apiLocal)      atende a mesma rota no servidor de desenvolvimento
services/alerta.ts             envia o pedido (POST /api/alerta)
hooks/useAlertas.ts            histórico no armazenamento local do aparelho
components/socorro/DialogoSocorro.tsx
components/telas/TelaAlertas.tsx
```

- `api/alerta.ts` não importa nada de `src/`, para a Vercel empacotá-lo sozinho.
  A lógica fica em `processarAlerta` (função pura), usada pelo handler da Vercel,
  pelo plugin do Vite e pelos testes.
- `App.tsx` monta o pedido com o que o app está mostrando (posição, risco,
  inclinação, chuva) e registra toda tentativa no histórico, com sucesso ou falha.
- O envio só é oferecido quando há posição utilizável; a ligação para o 199 está
  sempre disponível.
- **Transparência:** o diálogo, a tela de resultado e a aba Alertas informam que
  o alerta é de demonstração e não aciona ninguém.
- O diálogo é posicionado dentro da tela do app (e, no desktop, dentro da
  moldura do celular); recebe o foco ao abrir e fecha com Esc, exceto durante o
  envio.

## App instalável (PWA) e falhas

```
public/manifest.webmanifest   nome, cores, modo tela cheia e ícones
public/icones/                192 e 512 px, versão mascarável e ícone para iOS
public/sw.js                  service worker (JavaScript puro, sem build)
src/pwa/registrar.ts          registra o service worker, só em produção
src/hooks/useInstalacao.ts    oferta de instalação do navegador
src/hooks/useConexao.ts       aparelho com ou sem rede
src/components/layout/BarreiraDeErro.tsx
```

Service worker — guarda só a interface, nunca dados:

| Pedido | Estratégia |
|---|---|
| Página | Rede primeiro; sem rede, a última versão guardada |
| `/assets/*` (nomes com hash) | Guardado primeiro |
| Outros arquivos do app (manifesto, ícones) | Rede primeiro; guardado como reserva |
| `/api/*`, outros servidores (mapa, relevo, clima), pedidos que não são GET | Não interfere |

- Na instalação, o service worker baixa a página e os arquivos que ela cita;
  assim o app abre offline já depois da primeira visita.
- Como a página vem sempre da rede quando há conexão, um novo deploy chega ao
  usuário sem precisar trocar a versão do cache. Arquivos antigos de `/assets/`
  não são apagados (ocupam pouco; limpeza fica como melhoria).
- Não foi usada biblioteca de PWA: o comportamento cabe em um arquivo pequeno e
  testável (os testes carregam `sw.js` com rede e cache simulados).
- A decisão de não guardar tiles e previsão é deliberada: mostrar relevo ou
  chuva desatualizados como se fossem atuais seria pior do que mostrar "Sem dados".

## Estado atual (versão 1.0.0)

Todas as etapas do plano estão implementadas. Pendências fora do código:
deploy na Vercel e conferência em aparelho real (ver `docs/PLANO.md`).
