# Histórico de mudanças

Uma entrada por prompt/etapa.

## 1.1.0 — Fonte do relevo configurável (relevo natural do solo)

- Motivo: a fonte padrão (AWS Terrain Tiles / SRTM) é modelo de superfície e
  inclui prédios e árvores na altitude.
- `VITE_RELEVO_URL`, `VITE_RELEVO_ZOOM_MAXIMO` e `VITE_RELEVO_NOME` apontam o app
  para tiles próprios de um modelo do terreno. Sem elas, nada muda.
- `scripts/gerar_tiles_relevo.py`: converte GeoTIFF (FABDEM, PE3D, outros) em
  tiles Terrarium para a área de Pernambuco.
- Aba Sobre: seção "Fonte do relevo", com o tipo (superfície ou terreno) e aviso
  de configuração inválida.
- Service worker não guarda `/relevo/`.
- `docs/RELEVO.md`: passo a passo completo; `.env.example`.
- Verificação: lint, tipos, 267 testes e build aprovados; script conferido com
  GeoTIFFs sintéticos (erro menor que 0,6 m em um plano inclinado, leitura feita
  como o app lê). **Não feito:** download dos dados reais, geração dos tiles do
  estado e hospedagem — o app continua na fonte padrão até isso ser feito.

## 1.0.0 — Etapa 10: app instalável e acabamento

- PWA: manifesto, ícones (192, 512, mascarável, iOS) e service worker próprio.
- Service worker guarda só a interface; mapa, relevo, clima e API passam direto.
- Aba Sobre: seção "Instalar no celular" com botão "Instalar app" quando o
  navegador oferece a instalação.
- Faixa "Sem internet" com o telefone 199 quando o aparelho fica sem rede.
- Tela "Algo deu errado" para erros inesperados, com "Recarregar" e "Ligar 199".
- `vercel.json`: `sw.js` sem cache e `/assets/` com cache longo.
- Favicon; script `scripts/gerar_icones.py`.
- Documentação final: instalação no Android, falhas tratadas, limitações.
- Verificação: lint, tipos, 255 testes e build aprovados; versão de produção
  conferida por HTTP. Service worker em navegador real, instalação no Android e
  deploy na Vercel ainda não testados.

## 0.9.0 — Etapa 9: pedido de socorro

- Botão "Pedir socorro" ativo: abre diálogo com "Ligar 199" e "Enviar alerta".
- Função serverless `/api/alerta` (simulada): valida o pedido, gera protocolo e
  escreve no log; não guarda nem encaminha.
- Plugin do Vite que atende `/api/alerta` em desenvolvimento.
- O alerta leva posição, precisão, estado de risco, inclinação e chuva.
- Aba Alertas: histórico dos pedidos feitos no aparelho (enviados e falhos).
- Avisos de protótipo no diálogo, no resultado e na aba Alertas.
- Sem localização, o diálogo oferece apenas a ligação.
- Removida a tela provisória "em breve".
- Verificação: lint, tipos, 231 testes e build aprovados; chamadas HTTP reais à
  rota local (201, 400 e 405). Função na Vercel e discador ainda não testados.

## 0.8.1 — Correção: inclinação e risco com dados reais

Problema relatado pelo usuário no preview: o mapa de calor, a altitude e o clima
funcionavam, mas a caixa de coordenadas mostrava "Inclinação indisponível" e o
painel ficava em "Risco ainda não avaliado".

- **Causa:** `inclinacaoDoSetor` chamava a consulta de altitude com
  `pontos.map(consultar)`. O `map` passa também o índice e a lista, e a função
  real (`consultarAltitude`) interpretava esses valores como suas opções
  (carregador de tiles e zoom), falhando sempre. Os testes não pegaram porque as
  consultas simuladas ignoravam os argumentos extras.
- **Correção:** a consulta agora recebe só a coordenada. Isso também corrige a
  pintura dos setores no mapa, que usa a mesma função.
- **Testes:** a consulta simulada passou a rejeitar argumentos extras, e há um
  teste novo que usa a consulta real lendo de um tile em memória. Com o código
  antigo, 6 testes falham.
- O mapa passa a abrir no modo **inclinação** (legenda "Relevo / Inclinação",
  como na imagem de referência). Com o mapa afastado, onde os setores de 100 m
  não cabem, esse modo mostra a altitude.
- Botões renomeados para "Mostrar/Ocultar altitude".
- Barra de rolagem da tela mais discreta.
- Verificação: lint, tipos, 199 testes e build aprovados.

## 0.8.0 — Etapa 8: motor de risco

- Motor de risco (`avaliarRisco`): cruza a inclinação do setor do usuário com a
  previsão de chuva.
- Painel inferior com dados reais, citando inclinação e chuva no texto.
- Novo estado "Atenção" (inclinação moderada com chuva significativa).
- Instruções conforme o estado: emergência, atenção ou prevenção.
- Sem localização ou relevo, o painel mostra "Risco ainda não avaliado" e o motivo.
- Modo demonstração: "Automático" (padrão, dados reais) ou estado forçado, com
  aviso de "Estado simulado".
- Verificação: lint, tipos, 195 testes e build aprovados; resultado com dados
  reais a conferir no preview.

## 0.7.0 — Etapa 7: previsão do tempo

- Integração com a Open-Meteo: temperatura atual e chuva hora a hora.
- Painel superior com probabilidade de chuva nas próximas 3 h, intensidade,
  temperatura, detalhe hora a hora e volume total.
- Classificação da chuva em cinco intensidades.
- Atualização automática a cada 10 minutos; a última previsão é mantida se uma
  atualização falhar.
- Previsão para a posição do usuário ou, sem localização, para Recife (com aviso).
- A barra de monitoramento passa a mostrar o horário da última atualização.
- Testes: acesso à rede bloqueado por padrão.
- Verificação: lint, tipos, 153 testes e build aprovados; chamada real à API a
  conferir no preview.

## 0.6.0 — Etapa 6: grade de 100 m e inclinação

- Grade de setores de 100 m × 100 m sobre o mapa (a partir do zoom 15).
- Cálculo de inclinação por setor (método de Horn) e classificação em quatro
  faixas: baixo, moderado, alto e muito alto.
- Botão para pintar os setores pela inclinação, com a legenda "Relevo / Inclinação".
- Cruzamento da posição do usuário com a grade: setor destacado no mapa e
  inclinação do setor na caixa de coordenadas.
- Altitude e inclinação passam a ser camadas alternativas.
- Correção: os hooks de consulta não recalculam mais quando recebem uma função
  recriada a cada renderização.
- Verificação: lint, tipos, 118 testes e build aprovados; inclinação com dados
  reais e desempenho a conferir no preview.

## 0.5.0 — Etapa 5: mapa de calor de altitude

- Leitura dos AWS Terrain Tiles (formato Terrarium) com cache em memória.
- Camada de mapa de calor: claro = baixo, vermelho = alto; mar transparente.
- Escala não linear (0 a 1.000 m+) e legenda no mapa.
- Botão para ocultar/mostrar o relevo.
- Altitude da posição do usuário na caixa de coordenadas.
- Aviso quando os dados de relevo não carregam.
- Cálculo da posição na grade de tiles (`posicaoNoTile`), validado contra o Leaflet.
- Verificação: lint, tipos, 77 testes e build aprovados; download real dos tiles
  e aparência a conferir no preview.

## 0.4.0 — Etapa 4: geolocalização

- Localização pelo GPS do aparelho, acompanhada continuamente.
- Modo simulado com sete locais de demonstração na Região Metropolitana do Recife.
- Marcador do usuário, círculo de precisão e caixa de coordenadas no mapa.
- O mapa foca no usuário; o botão de centralizar passa a apontar para ele.
- Avisos para permissão negada, falha, navegador sem suporte e posição fora de
  Pernambuco, com botão "Usar local de demonstração".
- Aba Sobre: seção "Localização" para escolher GPS ou local de demonstração.
- Regras em `src/domain/localizacao.ts`; hook `useLocalizacao`.
- Verificação: lint, tipos, 42 testes e build aprovados; GPS real a conferir no
  preview.

## 0.3.0 — Etapa 3: mapa base de Pernambuco

- Mapa Leaflet centrado em Pernambuco, travado na região do estado.
- Controles de aproximar, afastar e centralizar; escala métrica.
- Troca de camada: satélite (Esri World Imagery, padrão) ou ruas (OpenStreetMap).
- Aviso quando as imagens do mapa base não carregam.
- Aba Mapa passa a mostrar o mapa em tela cheia.
- Funções de limites geográficos em `src/domain/geografia.ts`.
- Dependências novas: `leaflet` e `@types/leaflet`.
- Verificação: lint, tipos, 24 testes e build aprovados; carregamento real dos
  tiles a conferir no preview.

## 0.2.0 — Etapa 2: layout mobile

- Moldura de celular para simular o dispositivo em telas largas, com barra de
  status e relógio real.
- Cabeçalho com logo, nome e botão de ajustes.
- Tela inicial conforme a imagem de referência: painel de clima, área do mapa,
  painel de risco, instruções, botão "Pedir socorro" e barra de monitoramento.
- Navegação inferior com quatro abas (Início, Mapa, Alertas, Sobre).
- Aba Sobre com modo demonstração do estado de risco.
- Painéis sem dados mostram "—"; botão de socorro desativado até a etapa 9.
- Conjunto de ícones SVG próprio; tema escuro em CSS puro.
- Tipos compartilhados em `src/types`.
- Verificação: lint, tipos, 8 testes e build aprovados; conferência visual
  pendente do usuário.

## 0.1.0 — Etapa 1: estrutura do projeto

- Projeto Vite + React + TypeScript criado (tipagem estrita, alias `@/`).
- ESLint, Vitest e Testing Library configurados.
- Script `npm run verificar` (lint + tipos + testes + build).
- Estrutura de pastas (`api`, `docs`, `public`, `src/*`, `tests`).
- Configuração central em `src/config/app.ts` (nome, setor de 100 m, limites de PE).
- Tela provisória e tema base de cores.
- `vercel.json` para deploy.
- Documentação inicial: README, PLANO, ARQUITETURA, APIS, DEPLOY, CHANGELOG.
- Verificação: lint, tipos, 3 testes e build aprovados.
