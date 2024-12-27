/* eslint-disable */
const version = 'v0.0.2';
const cacheNumber = 0;
const cacheName = `thingCache-${cacheNumber}`;

const broadcast = new BroadcastChannel('count-channel');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName));
  updateLotteryDetails().then((data) => {
    console.log('data');
  });
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "get-latest-lottery-details") {
    event.waitUntil(updateLotteryDetails());
  }
});

const updateLotteryDetails = () => {
    return new Promise((resolve) => {
        broadcast.postMessage({ payload: "updating" });
        resolve("updating");
    });
}
