// ============================================
// HOSTIZZY GUEST PORTAL - SERVICE WORKER
// Version: 1.0.0
// ============================================

const CACHE_VERSION = 'hostizzy-guest-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}`;

// Files to cache for offline support
const STATIC_ASSETS = [
    '/guest-portal.html',
    '/guest-manifest.json',
    '/assets/logo-192.png',
    '/assets/logo-512-maskable.png',
    '/assets/logo.png',
    // Supabase client will be cached automatically
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Installation complete');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...', CACHE_VERSION);

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Delete old caches
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activation complete');
                return self.clients.claim(); // Take control of all pages
            })
    );
});

// ============================================
// FETCH EVENT - Network First Strategy
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Supabase API calls (always use network)
    if (url.hostname.includes('supabase.co')) {
        return event.respondWith(fetch(request));
    }

    // Skip Chrome extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Network First, fallback to Cache strategy
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone the response before caching
                const responseToCache = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('[Service Worker] Serving from cache:', request.url);
                            return cachedResponse;
                        }

                        // If not in cache and offline, show offline page
                        if (request.destination === 'document') {
                            return caches.match('/guest-portal.html');
                        }

                        // For other resources, return a basic response
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// ============================================
// MESSAGE EVENT - Handle messages from app
// ============================================
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[Service Worker] Cache cleared');
            event.ports[0].postMessage({ success: true });
        });
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        caches.open(CACHE_NAME).then((cache) => {
            cache.addAll(event.data.urls).then(() => {
                console.log('[Service Worker] URLs cached:', event.data.urls);
                event.ports[0].postMessage({ success: true });
            });
        });
    }
});

// ============================================
// BACKGROUND SYNC (Optional - for offline submissions)
// ============================================
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);

    if (event.tag === 'sync-documents') {
        event.waitUntil(syncPendingDocuments());
    }
});

async function syncPendingDocuments() {
    // This would sync any pending document submissions
    // that were queued while offline
    console.log('[Service Worker] Syncing pending documents...');

    // Implementation would retrieve from IndexedDB and sync to Supabase
    // For now, this is a placeholder

    return Promise.resolve();
}

// ============================================
// PUSH NOTIFICATIONS (Optional - for verification updates)
// ============================================
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');

    let notificationData = {
        title: 'Hostizzy Guest Portal',
        body: 'You have a new update',
        icon: '/assets/logo-192.png',
        badge: '/assets/logo-192.png',
        vibrate: [200, 100, 200]
    };

    if (event.data) {
        try {
            notificationData = event.data.json();
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            vibrate: notificationData.vibrate,
            data: notificationData.data,
            actions: notificationData.actions || []
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/guest-portal.html')
    );
});

// ============================================
// PERIODIC BACKGROUND SYNC (Optional)
// ============================================
self.addEventListener('periodicsync', (event) => {
    console.log('[Service Worker] Periodic sync:', event.tag);

    if (event.tag === 'check-document-status') {
        event.waitUntil(checkDocumentStatus());
    }
});

async function checkDocumentStatus() {
    // Check if documents have been verified
    console.log('[Service Worker] Checking document status...');
    return Promise.resolve();
}

console.log('[Service Worker] Loaded successfully');
