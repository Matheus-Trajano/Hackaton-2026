import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { APP, LIMITES_PE } from '@/config/app';

afterEach(cleanup);

describe('configuração', () => {
  it('usa setores de 100 m', () => {
    expect(APP.tamanhoSetorMetros).toBe(100);
  });

  it('tem limites de Pernambuco coerentes (Recife dentro)', () => {
    const recife = { lat: -8.0476, lon: -34.877 };
    expect(recife.lat).toBeGreaterThan(LIMITES_PE.sul);
    expect(recife.lat).toBeLessThan(LIMITES_PE.norte);
    expect(recife.lon).toBeGreaterThan(LIMITES_PE.oeste);
    expect(recife.lon).toBeLessThan(LIMITES_PE.leste);
  });
});

describe('layout (etapa 2)', () => {
  it('mostra cabeçalho, painéis da tela inicial e as quatro abas', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: APP.nome })).toBeTruthy();
    expect(screen.getByLabelText('Previsão do tempo')).toBeTruthy();
    expect(screen.getByLabelText('Mapa')).toBeTruthy();
    for (const aba of ['Início', 'Mapa', 'Alertas', 'Sobre']) {
      expect(screen.getByRole('button', { name: aba })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Início' }).getAttribute('aria-current')).toBe('page');
  });

  it('não inventa dados: clima sem valores, risco não avaliado', async () => {
    render(<App />);
    // A rede é bloqueada nos testes: o clima começa carregando e termina sem dados.
    expect(screen.getByText('Carregando…')).toBeTruthy();
    expect(await screen.findByText('Sem dados')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Risco ainda não avaliado' })).toBeTruthy();
  });

  it('troca de aba pela navegação inferior', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Alertas' }));
    expect(screen.getByRole('heading', { name: 'Alertas' })).toBeTruthy();
    expect(screen.queryByLabelText('Previsão do tempo')).toBeNull();
  });

  it('a aba Mapa mostra o mapa em tela cheia', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }));
    expect(screen.getByLabelText('Mapa').classList.contains('mapa--cheio')).toBe(true);
    expect(screen.queryByLabelText('Previsão do tempo')).toBeNull();
  });

  it('o cabeçalho não tem botão de ajustes; a aba Sobre abre pela navegação inferior', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Ajustes' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    expect(screen.getByRole('heading', { name: 'Modo demonstração' })).toBeTruthy();
  });

  it('modo demonstração: "Em risco" mostra o alerta e as instruções', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Em risco' }));
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(screen.getByRole('alert').textContent).toContain('Você está em risco!');
    expect(screen.getByRole('heading', { name: 'O que fazer agora:' })).toBeTruthy();
  });

  it('modo demonstração: "Área segura" mostra o estado seguro sem alerta', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Área segura' }));
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(screen.getByRole('heading', { name: 'Você está em área segura' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Para se prevenir:' })).toBeTruthy();
  });
});
