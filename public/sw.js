// Lo registro en lugar de ngsw-worker.js: conserva la caché de Angular y suma Background Sync para las grabaciones offline.
importScripts('./ngsw-worker.js');

// Debe coincidir con PENDING_RECORDINGS_SYNC_TAG en pending-recordings-sync.service.ts.
const PENDING_RECORDINGS_SYNC_TAG = 'alasonora-pending-recordings';

self.addEventListener('sync', (event) => {
  if (event.tag !== PENDING_RECORDINGS_SYNC_TAG) return;
  // El envío necesita la sesión, que vive en el localStorage de la página: le pido a una pestaña que vacíe la cola
  // y, si no hay pestaña o quedó algo, rechazo para que el navegador reintente el sync.
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length === 0) throw new Error('No open AlaSonora tab to sync from');
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = ({ data }) =>
          data.remaining === 0 ? resolve() : reject(new Error(`${data.remaining} recordings still pending`));
        clients[0].postMessage({ type: PENDING_RECORDINGS_SYNC_TAG }, [channel.port2]);
      });
    })
  );
});
