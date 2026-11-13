# Histórico de mudanças

Uma entrada por prompt/etapa.

## 1.5.0 — Painéis do mapa recolhíveis e inclinação do setor em graus

- A legenda (inclinação ou altitude) e o painel da localização ganharam um botão
  pequeno para ocultar; no lugar fica um botão pequeno que os mostra de novo.
- A linha "Inclinação do setor" passa a mostrar graus ("9° (normal)") no lugar
  do percentual, no mesmo formato do painel de risco.
- A escolha de ocultar não é guardada: ao recarregar o app os painéis voltam.
- Verificação: lint, tipos, 298 testes e build aprovados. Aparência não
  conferida em navegador.

## 1.4.0 — Quatro faixas de inclinação (volta do "Moderado")

- Faixas: Normal (0° a 11°, verde), Moderado (11° a 20°, amarelo), Alto (20° a
  45°, laranja), Muito alto (45° em diante, vermelho). Legenda do mapa e cores
  dos setores atualizadas.
- Risco: alto e muito alto (a partir de 20°) são risco de deslizamento.
- Moderado: "Atenção" (deslizamento) com chuva moderada ou mais forte, ou quando
  a previsão está indisponível; área segura sem chuva significativa.
- Normal: alerta de alagamento com chuva moderada ou mais forte (agora só abaixo
  de 11°).
- Verificação: lint, tipos, 295 testes e build aprovados. Não conferido com
  relevo real.
- Observação: o risco passa a começar em 20°, mesmo limite da versão 1.1.0, que
  foi revertida após uso real.

## 1.3.1 — Painel de risco mostra a inclinação em graus

- O texto do painel de risco passa a mostrar o ângulo do setor do usuário
  ("Seu setor tem inclinação de 9° (normal)"), no lugar do percentual.
- O ângulo aparece com até uma casa decimal, arredondado para baixo (14,99°
  aparece como "14,9°", nunca como "15°" em um setor normal).
- A linha "Inclinação do setor" na tela do mapa continua em percentual.
- Verificação: lint, tipos, 282 testes e build aprovados.

## 1.3.0 — Alerta de alagamento em setores de inclinação normal

- Setor de inclinação normal (menos de 15°) com chuva moderada, forte ou muito
  forte prevista: painel "Alerta de alagamento" (amarelo), com orientações
  próprias de alagamento.
- Sem chuva significativa, ou sem previsão disponível, o setor normal continua
  como área segura.
- Setores de inclinação alta ou muito alta não mudam: risco de deslizamento.
- Modo demonstração: a opção "Atenção" passou a se chamar "Alagamento".
- Limite: o alerta considera só inclinação e chuva; não há dados de drenagem,
  rios ou pontos baixos, então ele vale para todo setor normal quando chove.
- Verificação: lint, tipos, 271 testes e build aprovados. Não conferido com
  dados reais.

## 1.2.0 — Novas faixas de inclinação, em graus

- Faixas: Normal (0° a 15°, verde), Alto (15° a 45°, laranja), Muito alto (45°
  em diante, vermelho). "Baixo" e "moderado" foram unidos na faixa Normal.
- A classe passa a ser definida pelo ângulo em graus (antes, pelo percentual).
- Motor de risco: inclinação normal é área segura; alta ou muito alta é risco.
  O estado "Atenção" não é mais produzido pelo cálculo (só no modo demonstração).
- A linha "Inclinação do setor" e o texto do painel de risco continuam mostrando
  o valor em percentual.
- Verificação: lint, tipos, 261 testes e build aprovados. Não conferido com
  relevo real.
- Observação: 45° de média em um setor de 100 m é raro; a faixa "Muito alto"
  deve aparecer pouco no mapa.

## 1.0.1 — Legenda de inclinação em graus

- A legenda "Relevo / Inclinação" do mapa mostra as faixas em graus: Baixo
  (< 2,9°), Moderado (2,9° – 8,5°), Alto (8,5° – 16,7°), Muito alto (> 16,7°).
- São os mesmos limites de antes (5%, 15% e 30%), só convertidos; cálculo,
  cores e regras de risco não mudaram.
- A linha "Inclinação do setor" e o texto do painel de risco continuam em
  percentual.

## Retorno à 1.0.0 (versão 1.1.0 desfeita)

- A versão 1.1.0 (inclinação em graus, risco só a partir de 20°) foi publicada e
  desfeita a pedido: o cálculo de risco passou a dar resultados errados em uso
  real.
- O código voltou a ser idêntico ao da 1.0.0: inclinação em percentual, com as
  classes baixo (< 5%), moderado (5% a 15%), alto (15% a 30%) e muito alto (> 30%).
- Continua em aberto o problema original: a fonte de relevo inclui a altura de
  prédios e distorce a inclinação em áreas construídas.

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
