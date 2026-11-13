# APIs utilizadas

Todas gratuitas e sem chave. A coluna "Estado" indica se já está integrada.

| # | API | Uso | Etapa | Estado |
|---|---|---|---|---|
| 1 | Geolocation API (navegador) — `navigator.geolocation.watchPosition` | Posição do dispositivo, acompanhada continuamente | 4 | **Integrada** |
| 2 | AWS Terrain Tiles (Terrarium) — `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Altitude para o mapa de calor, a altitude do usuário e a inclinação | 5–6 | **Integrada** (mapa de calor, altitude do ponto e inclinação dos setores) |
| 3 | Open-Meteo Forecast — `https://api.open-meteo.com/v1/forecast` | Chuva e temperatura das próximas horas | 7 | Planejada |
| 4 | Open-Meteo Elevation — `https://api.open-meteo.com/v1/elevation` | Reserva para a altitude | 5–6 | Planejada |
| 5 | Esri World Imagery — `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Mapa base de satélite (padrão) | 3 | **Integrada** |
| 5b | OpenStreetMap — `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Mapa base de ruas (alternativa) | 3 | **Integrada** |
| 6 | Função serverless `/api/alerta` (Vercel) | Recebe o pedido de socorro (simulado) | 9 | Planejada |
| 7 | Link `tel:199` | Ligação para a Defesa Civil | 9 | Planejada |

## Observações

- Altitude Terrarium: `altitude = (R × 256 + G + B / 256) − 32768` (metros).
- Tiles de relevo: buscados até o zoom 14 e lidos com `crossOrigin = 'anonymous'`
  (o servidor precisa permitir acesso de outros domínios). Configuração em
  `src/config/relevo.ts`; até 96 tiles ficam em memória.
- A API nº 4 (Open-Meteo Elevation) continua apenas como reserva planejada; ainda
  não há troca automática para ela.
- Os testes automatizados usam respostas simuladas; as chamadas reais acontecem
  no navegador do usuário.
- Geolocalização: alta precisão ativada, espera máxima de 20 s por leitura, aceita
  leitura de até 10 s atrás. Exige HTTPS e permissão do usuário.
- As URLs e a atribuição dos mapas base ficam em `src/config/mapa.ts`.
- Os servidores de tiles do OpenStreetMap têm política de uso justo; servem para
  protótipo, não para tráfego alto.
- Respeitar os termos de uso e a atribuição de cada provedor de mapa.
