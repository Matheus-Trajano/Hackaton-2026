import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { BarreiraDeErro } from './components/layout/BarreiraDeErro';
import { registrarServiceWorker } from './pwa/registrar';
import './styles/global.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <BarreiraDeErro>
      <App />
    </BarreiraDeErro>
  </StrictMode>,
);

void registrarServiceWorker(import.meta.env.PROD);
