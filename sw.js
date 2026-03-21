/* eslint-disable */
const cacheName = `thingCache-v1`;
const broadcast = new BroadcastChannel('count-channel');

const EURO_MILLIONS_THRESHOLD = 99.9;
const EURO_MILLIONS_THRESHOLD_POUNDS = 100000000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// The core logic function

const updateLotteryDetails = async () => {
    try {
        const response = await fetch('./lottoData.json');
        const data = await response.json();
        
        let notificationCount = 0;

        if (data.euromillions) {
            // Check against the raw pounds value we saved in the scraper
            if (data.euromillions['raw-jackpot-pounds'] >= EURO_MILLIONS_THRESHOLD_POUNDS) {
                notificationCount++;
            }
        }

        if (data.lotto) {
            // Placeholder: Add your Lotto logic here later
            if (data.lotto['must-be-won'] === true) {
                notificationCount++;
            }
        }

        if (navigator.setAppBadge) {
            notificationCount > 0 
                ? await navigator.setAppBadge(notificationCount) 
                : await navigator.clearAppBadge();
        }

        broadcast.postMessage({ type: "DATA_UPDATED", payload: data, count: notificationCount });
    } catch (e) { console.error(e); }
};

// Listen for Periodic Sync (Background)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "get-latest-lottery-details") {
    event.waitUntil(updateLotteryDetails());
  }
});

// Listen for manual requests from the UI
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REQUEST_UPDATE') {
        updateLotteryDetails();
    }
});