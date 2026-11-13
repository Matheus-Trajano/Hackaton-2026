import { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP } from '@/config/app';

/**
 * Última proteção: se um erro inesperado derrubar a tela, mostra uma mensagem
 * com a opção de recarregar e o telefone da Defesa Civil, em vez de tela em branco.
 */
export class BarreiraDeErro extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro inesperado na interface:', erro, info.componentStack);
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <div className="falha" role="alert">
        <h1>Algo deu errado</h1>
        <p>O aplicativo encontrou um erro inesperado. Recarregue para tentar de novo.</p>
        <button type="button" className="dialogo__secundario" onClick={() => window.location.reload()}>
          Recarregar
        </button>
        <a className="dialogo__ligar" href={`tel:${APP.telefoneEmergencia}`}>
          Ligar {APP.telefoneEmergencia} (Defesa Civil)
        </a>
      </div>
    );
  }
}
