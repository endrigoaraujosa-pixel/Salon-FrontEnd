import { useEffect, useRef, useState } from 'react';
import './pwa.css';

let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  window.dispatchEvent(new Event('salon-install-ready'));
});
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function registerPwa() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  const register = () => navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(error => console.warn('PWA: registro indisponível', error));
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export default function PwaStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [installable, setInstallable] = useState(!standalone() && (!!installPrompt || ios()));
  const [dismissed, setDismissed] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dialog = useRef(null);
  const checking = useRef(false);
  const retry = async () => {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/pwa-health.txt', { cache: 'no-store', signal: controller.signal });
      if (!response.ok || (await response.text()).trim() !== 'salon-online-v1') throw new Error('Offline');
      setOffline(false);
      setMessage('');
    } catch { setMessage('Ainda não foi possível conectar. Tente novamente em instantes.'); }
    finally { clearTimeout(timeout); checking.current = false; setBusy(false); }
  };
  useEffect(() => {
    const disconnected = () => setOffline(true);
    const ready = () => setInstallable(!standalone());
    const installed = () => { installPrompt = undefined; setInstallable(false); setHelp(false); };
    window.addEventListener('offline', disconnected);
    window.addEventListener('online', retry);
    window.addEventListener('salon-install-ready', ready);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('online', retry);
      window.removeEventListener('salon-install-ready', ready);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  useEffect(() => {
    if (offline && !dialog.current.open) dialog.current.showModal();
    if (!offline && dialog.current.open) dialog.current.close();
  }, [offline]);
  const install = async () => {
    if (!installPrompt) { setHelp(value => !value); return; }
    const prompt = installPrompt;
    installPrompt = undefined;
    setInstallable(false);
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setHelp(true); }
  };
  return <>
    {installable && !dismissed && !offline && <aside className="salon-pwa-install" aria-label="Instalar aplicativo">
      <button type="button" onClick={install}>Instalar aplicativo</button>
      <button type="button" aria-label="Fechar sugestão de instalação" onClick={() => { setDismissed(true); setHelp(false); }}>×</button>
      {help && <p>No Safari, toque em Compartilhar e em “Adicionar à Tela de Início”. O aplicativo precisa de internet para funcionar.</p>}
    </aside>}
    <dialog ref={dialog} className="salon-pwa-offline" aria-labelledby="salon-offline-title" aria-describedby="salon-offline-description" onCancel={event => event.preventDefault()}>
      <span className="salon-pwa-label">SALON STUDIO</span>
      <h2 id="salon-offline-title">Você está sem conexão</h2>
      <p id="salon-offline-description">Conecte-se à internet para continuar. Sua tela será mantida aberta; nenhuma operação será reenviada automaticamente.</p>
      <button type="button" disabled={busy} onClick={retry}>{busy ? 'Verificando conexão…' : 'Tentar novamente'}</button>
      <p role="status">{message}</p>
    </dialog>
  </>;
}
