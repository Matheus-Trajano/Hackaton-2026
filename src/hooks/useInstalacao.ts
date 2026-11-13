import { useCallback, useEffect, useState } from 'react';

/** Evento do Chrome/Android que permite oferecer a instalação por um botão próprio. */
interface EventoDeInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface Instalacao {
  /**
   * `instalado`: aberto como app. `disponivel`: o navegador ofereceu a instalação.
   * `indisponivel`: o navegador não ofereceu (ainda, ou não tem esse recurso).
   */
  estado: 'instalado' | 'disponivel' | 'indisponivel';
  instalar: () => Promise<void>;
}

const abertoComoApp = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;

export function useInstalacao(): Instalacao {
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(abertoComoApp);

  useEffect(() => {
    const aoOferecer = (e: Event) => {
      e.preventDefault(); // evita o aviso automático; a instalação fica no botão da aba Sobre
      setEvento(e as EventoDeInstalacao);
    };
    const aoInstalar = () => {
      setInstalado(true);
      setEvento(null);
    };
    window.addEventListener('beforeinstallprompt', aoOferecer);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null); // o navegador só aceita um uso por evento
  }, [evento]);

  return { estado: instalado ? 'instalado' : evento ? 'disponivel' : 'indisponivel', instalar };
}
