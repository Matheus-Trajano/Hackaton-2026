import type { Coordenada } from '@/domain/geografia';

export interface PontoDemo extends Coordenada {
  id: string;
  nome: string;
  /** O que se espera encontrar no local, para orientar a demonstração. */
  descricao: string;
}

/**
 * Locais de demonstração na Região Metropolitana do Recife.
 * As coordenadas são aproximadas (centro do bairro), não endereços exatos.
 */
export const PONTOS_DEMO: readonly PontoDemo[] = [
  { id: 'morro-conceicao', nome: 'Morro da Conceição (Recife)', descricao: 'Área de morro', lat: -8.0153, lon: -34.9125 },
  { id: 'alto-jose-pinho', nome: 'Alto José do Pinho (Recife)', descricao: 'Área de morro', lat: -8.0186, lon: -34.906 },
  { id: 'nova-descoberta', nome: 'Nova Descoberta (Recife)', descricao: 'Área de morro', lat: -8.0, lon: -34.925 },
  { id: 'ibura', nome: 'Ibura (Recife)', descricao: 'Área de morro', lat: -8.122, lon: -34.944 },
  { id: 'alto-da-se', nome: 'Alto da Sé (Olinda)', descricao: 'Colina histórica', lat: -8.0128, lon: -34.8497 },
  { id: 'boa-viagem', nome: 'Boa Viagem (Recife)', descricao: 'Área plana, à beira-mar', lat: -8.1193, lon: -34.895 },
  { id: 'marco-zero', nome: 'Marco Zero (Recife)', descricao: 'Área plana, no centro', lat: -8.0631, lon: -34.8711 },
];

export const PONTO_DEMO_PADRAO: PontoDemo = PONTOS_DEMO[0]!;
