# APIs utilizadas

Todas gratuitas e sem chave. A coluna "Estado" indica se já está integrada.

| # | API | Uso | Etapa | Estado |
|---|---|---|---|---|
| 1 | Geolocation API (navegador) | Posição do dispositivo | 4 | Planejada |
| 2 | AWS Terrain Tiles (Terrarium) — `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Altitude para o mapa de calor e a inclinação | 5–6 | Planejada |
| 3 | Open-Meteo Forecast — `https://api.open-meteo.com/v1/forecast` | Chuva e temperatura das próximas horas | 7 | Planejada |
| 4 | Open-Meteo Elevation — `https://api.open-meteo.com/v1/elevation` | Reserva para a altitude | 5–6 | Planejada |
| 5 | Esri World Imagery / OpenStreetMap | Mapa base | 3 | Planejada |
| 6 | Função serverless `/api/alerta` (Vercel) | Recebe o pedido de socorro (simulado) | 9 | Planejada |
| 7 | Link `tel:199` | Ligação para a Defesa Civil | 9 | Planejada |

## Observações

- Altitude Terrarium: `altitude = (R × 256 + G + B / 256) − 32768` (metros).
- Os testes automatizados usam respostas simuladas; as chamadas reais acontecem
  no navegador do usuário.
- Respeitar os termos de uso e a atribuição de cada provedor de mapa.
