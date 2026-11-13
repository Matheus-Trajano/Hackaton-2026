# APIs utilizadas

Todas gratuitas e sem chave. A coluna "Estado" indica se já está integrada.

| # | API | Uso | Etapa | Estado |
|---|---|---|---|---|
| 1 | Geolocation API (navegador) — `navigator.geolocation.watchPosition` | Posição do dispositivo, acompanhada continuamente | 4 | **Integrada** |
| 2 | AWS Terrain Tiles (Terrarium) — `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Altitude para o mapa de calor, a altitude do usuário e a inclinação | 5–6 | **Integrada** (mapa de calor, altitude do ponto e inclinação dos setores) |
| 3 | Open-Meteo Forecast — `https://api.open-meteo.com/v1/forecast` | Temperatura atual e, hora a hora, probabilidade e volume de chuva | 7 | **Integrada** |
| 4 | Open-Meteo Elevation — `https://api.open-meteo.com/v1/elevation` | Reserva para a altitude | 5–6 | Planejada |
| 5 | Esri World Imagery — `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Mapa base de satélite (padrão) | 3 | **Integrada** |
| 5b | OpenStreetMap — `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Mapa base de ruas (alternativa) | 3 | **Integrada** |
| 6 | Função serverless `/api/alerta` (Vercel) — `POST`, corpo JSON | Recebe o pedido de socorro, valida e devolve um protocolo. **Simulada:** não guarda nem encaminha | 9 | **Integrada** (testada localmente; não testada na Vercel) |
| 7 | Link `tel:199` | Abre o discador para ligar à Defesa Civil | 9 | **Integrada** |

## Observações

- Altitude Terrarium: `altitude = (R × 256 + G + B / 256) − 32768` (metros).
- Tiles de relevo: buscados até o zoom 14 e lidos com `crossOrigin = 'anonymous'`
  (o servidor precisa permitir acesso de outros domínios). Configuração em
  `src/config/relevo.ts`; até 96 tiles ficam em memória.
- A API nº 4 (Open-Meteo Elevation) continua apenas como reserva planejada; ainda
  não há troca automática para ela.
- Clima: parâmetros `current=temperature_2m`,
  `hourly=precipitation_probability,precipitation`, `forecast_days=2`,
  `timeformat=unixtime`, `timezone=UTC`. A coordenada vai com 2 casas decimais
  (cerca de 1 km). Espera máxima de 12 s. Configuração em `src/config/clima.ts`.
- A Open-Meteo é gratuita para uso não comercial, com limite diário de chamadas;
  o app faz uma chamada a cada 10 minutos por usuário.
- Os testes automatizados usam respostas simuladas; as chamadas reais acontecem
  no navegador do usuário.
- Geolocalização: alta precisão ativada, espera máxima de 20 s por leitura, aceita
  leitura de até 10 s atrás. Exige HTTPS e permissão do usuário.
- As URLs e a atribuição dos mapas base ficam em `src/config/mapa.ts`.
- Os servidores de tiles do OpenStreetMap têm política de uso justo; servem para
  protótipo, não para tráfego alto.
- Respeitar os termos de uso e a atribuição de cada provedor de mapa.

## `/api/alerta`

Pedido (`POST`, `Content-Type: application/json`):

```json
{
  "lat": -8.0153,
  "lon": -34.9125,
  "precisaoMetros": 12,
  "localizacaoSimulada": false,
  "risco": "risco",
  "inclinacaoPercentual": 40.2,
  "chuva": "forte",
  "momento": "2026-11-13T14:37:00.000Z"
}
```

Só `lat` e `lon` são obrigatórios. Respostas:

| Status | Quando | Corpo |
|---|---|---|
| 201 | Pedido aceito | `{ "protocolo": "ES-20261113-4F9A2C", "recebidoEm": "…", "simulado": true }` |
| 400 | JSON inválido, latitude ou longitude ausente ou fora da faixa | `{ "erro": "…" }` |
| 405 | Método diferente de POST | `{ "erro": "Use o método POST." }` |

A rota não tem autenticação nem limite de chamadas — aceitável só porque é
simulada. Uma versão real precisaria de ambos, além de armazenamento e do
encaminhamento à Defesa Civil.

## Relevo: superfície × terreno

Os AWS Terrain Tiles (item 2) são um modelo de **superfície** em Pernambuco
(SRTM): a altitude inclui prédios e copas de árvores. A Open-Meteo Elevation
(item 4) tem a mesma limitação.

Desde a versão 1.1.0 a fonte é configurável. Com `VITE_RELEVO_URL` definido, o
app lê tiles Terrarium próprios, gerados de um modelo digital do terreno:

| Dado | Uso | Licença | Estado |
|---|---|---|---|
| FABDEM v1-2 (Universidade de Bristol), ~30 m | Recomendado para o estado inteiro | Não comercial | Não baixado nem hospedado ainda |
| PE3D — MDT (Governo de Pernambuco), 1 m | Áreas prioritárias | Gratuito, com cadastro | Não baixado |

Não são APIs: são arquivos convertidos por `scripts/gerar_tiles_relevo.py` e
hospedados como arquivos estáticos. Detalhes em [RELEVO.md](RELEVO.md).
