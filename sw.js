// Service worker: guarda los archivos de la app para poder abrirla sin conexión.
// Estrategia: primero la red (para recibir actualizaciones) y, si no hay conexión,
// la copia guardada. Los DATOS de entrenamiento no pasan por aquí: están en localStorage.
const CACHE = 'entreno-v4';
const ARCHIVOS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'rutina-base.js',
  'biblioteca.js',
  'manifest.webmanifest',
  'iconos/icono-180.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== location.origin) return;
  ev.respondWith(
    fetch(ev.request)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(ev.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true })
        .then((r) => r || caches.match('index.html'))),
  );
});
