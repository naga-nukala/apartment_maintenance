if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(error => console.error('Service worker registration failed:', error));
  });
}

let installPrompt;
const installButton = document.createElement('button');
installButton.type = 'button';
installButton.textContent = 'Install app';
installButton.setAttribute('aria-label', 'Install Apartment Maintenance app');
installButton.hidden = true;
installButton.style.cssText = [
  'position:fixed',
  'right:16px',
  'bottom:16px',
  'z-index:70',
  'padding:10px 14px',
  'border:0',
  'border-radius:999px',
  'background:#a7e8c5',
  'color:#0f1210',
  'font:600 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  'box-shadow:0 2px 12px #0008',
  'cursor:pointer'
].join(';');
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(installButton));

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  installButton.hidden = true;
  await prompt.prompt();
  await prompt.userChoice;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
});
