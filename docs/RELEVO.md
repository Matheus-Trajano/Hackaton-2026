# Relevo natural do solo (trocar a fonte de altitude)

## O problema

A fonte padrão do app, os **AWS Terrain Tiles**, vem em Pernambuco do SRTM: um
levantamento por radar que mede o topo do que está no chão. É um modelo de
**superfície** — prédios e copas de árvores entram na altitude e podem criar
inclinações falsas em áreas construídas.

Não existe, para Pernambuco, uma API pública pronta que entregue só o terreno
no formato que o app lê. A troca é feita assim:

1. baixar um modelo digital do **terreno** (arquivos GeoTIFF);
2. convertê-lo em tiles com `scripts/gerar_tiles_relevo.py`;
3. hospedar os tiles;
4. apontar o app para eles com variáveis de ambiente.

O restante do app não muda: o formato dos tiles é o mesmo, então mapa de calor,
altitude, grade, inclinação e risco continuam funcionando do mesmo jeito.

> **Estado atual:** o código e o script estão prontos e testados com dados
> sintéticos. Os passos 1, 3 e 4 ainda não foram executados; até lá o app segue
> na fonte padrão, e a aba **Sobre** informa qual fonte está em uso.

## 1. Escolher e baixar os dados

| Fonte | Remove prédios? | Resolução | Cobertura de PE | Licença | Download |
|---|---|---|---|---|---|
| **FABDEM v1-2** | Sim (prédios e florestas, por modelo estatístico) | ~30 m | Todo o estado, 2 arquivos | Não comercial | Direto, sem cadastro |
| **PE3D — MDT** | Sim (medição por laser do solo) | 1 m | Todo o estado, em milhares de folhas | Gratuito, com cadastro | Manual, pelo site |
| ANADEM v1 | Só o efeito da vegetação; prédios não são o alvo | ~30 m | Todo o estado | Acesso livre | Direto |

**Recomendação para o estado inteiro: FABDEM.** É o caminho que resolve o
problema dos prédios com dois downloads. Atenção à licença: uso **não
comercial**, suficiente para protótipo e hackathon; um produto comercial
precisaria de outra fonte ou de licença.

O **PE3D** é o dado de melhor qualidade, mas baixar o estado inteiro a 1 m, folha
por folha, não é prático. Uso sugerido: depois, substituir áreas prioritárias
(por exemplo, os morros do Recife) — o script aceita misturar as fontes.

O ANADEM não é recomendado para este problema: ele corrige a vegetação, não as
construções.

### FABDEM: quais arquivos

Pernambuco fica em dois blocos de 10° × 10°:

```
https://data.bris.ac.uk/datasets/s5hqmjcdj8yo2ibzi9b4ew3sn/S10W040-N00W030_FABDEM_V1-2.zip
https://data.bris.ac.uk/datasets/s5hqmjcdj8yo2ibzi9b4ew3sn/S10W050-N00W040_FABDEM_V1-2.zip
```

O padrão do endereço foi conferido para outros blocos; estes dois não foram
baixados daqui. Se algum não abrir, procure pelo nome na página do conjunto
(busque "FABDEM V1-2" em data.bris.ac.uk). Cada bloco pode passar de 1 GB.

Descompacte e mantenha só os arquivos de 1° que cobrem o estado (latitudes S08,
S09 e S10; longitudes W035 a W042), por exemplo `S09W036_FABDEM_V1-2.tif`.
Arquivos a mais não atrapalham: o script ignora o que estiver fora da área.

## 2. Gerar os tiles

```bash
python3 -m venv .venv-relevo && . .venv-relevo/bin/activate
pip install -r scripts/requisitos-relevo.txt

python3 scripts/gerar_tiles_relevo.py PASTA_DOS_TIF --saida relevo
```

- Por padrão recorta a área de Pernambuco e gera os zooms 6 a 13 (zoom 13 ≈ 19 m
  por pixel, adequado a dados de 30 m).
- Estimativa para o estado: cerca de 8 mil tiles no zoom 13 e alguns minutos de
  processamento. O tamanho final depende do relevo; espere algumas centenas de MB.
- Onde a fonte não tem dado (mar), a altitude fica 0 m, que o app mostra como
  transparente. Tiles inteiros sem dado não são gravados.
- Para misturar fontes, passe as pastas na ordem de prioridade: a primeira que
  tiver dado em um ponto vence.
  `python3 scripts/gerar_tiles_relevo.py pe3d/ fabdem/ --saida relevo --zoom-max 14`
- Para testar com uma área pequena: `--area SUL OESTE NORTE LESTE` (em graus).

## 3. Hospedar

Os tiles são arquivos estáticos em `relevo/{z}/{x}/{y}.png`. O servidor precisa
ser HTTPS e, se for outro domínio, liberar leitura entre domínios (CORS), porque
o app lê os pixels das imagens.

| Onde | Como | Observação |
|---|---|---|
| **GitHub Pages** (repositório separado) | Crie um repositório público, envie o conteúdo de `relevo/` e ative o Pages | Já libera CORS; limite recomendado de 1 GB |
| Cloudflare R2, S3 ou similar | Envie a pasta e configure CORS para `GET` | Sem limite prático |
| Junto do app | Copie para `public/relevo/` | Só para áreas pequenas: o repositório e o deploy ficam pesados |

Não coloque o estado inteiro dentro deste repositório.

## 4. Configurar o app

Na Vercel: **Settings → Environment Variables**; depois refaça o deploy (as
variáveis entram no build). Localmente: copie `.env.example` para `.env`.

| Variável | Exemplo | Para quê |
|---|---|---|
| `VITE_RELEVO_URL` | `https://SEU-USUARIO.github.io/encosta-relevo/{z}/{x}/{y}.png` | Endereço dos tiles. Sem ela, vale a fonte padrão |
| `VITE_RELEVO_ZOOM_MAXIMO` | `13` | Maior zoom gerado (padrão 13) |
| `VITE_RELEVO_NOME` | `FABDEM v1-2 (30 m)` | Nome na aba Sobre e no crédito do mapa |

Se a configuração estiver errada (endereço sem `{z}`, `{x}`, `{y}`; zoom fora de
8 a 15), o app **não** usa a configuração pela metade: volta à fonte padrão e
mostra o motivo na aba Sobre.

## 5. Conferir

1. Aba **Sobre** → "Fonte do relevo" mostra o nome configurado e "Modelo do
   terreno".
2. No mapa, aproxime uma área com prédios altos em terreno plano (por exemplo,
   Boa Viagem): os setores devem aparecer com inclinação baixa.
3. Um morro conhecido (por exemplo, Morro da Conceição) continua com inclinação
   alta.
4. Se o mapa de calor sumir, abra o endereço de um tile no navegador, por
   exemplo `.../13/3302/4279.png` (Recife): deve abrir uma imagem.

## Limites

- FABDEM e ANADEM são **estimativas** do terreno feitas por modelo a partir de um
  dado de superfície; reduzem muito o efeito de prédios e árvores, mas não são
  medição do solo. Só o PE3D é.
- Com 30 m de resolução, cortes de terreno e barrancos pequenos não aparecem.
- Fora da área convertida não há tile: o app mostra "Inclinação indisponível".
