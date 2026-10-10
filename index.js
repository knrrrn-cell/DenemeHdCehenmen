const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'Yerli sitelerden kaynak tarayan özel eklenti',
    types: ['movie', 'series'],
    catalogs: [],
    resources: ['stream']
});

builder.defineStreamHandler(async function(args) {
    const { type, id } = args;
    console.log(`Stremio'dan istek geldi -> Tip: ${type}, ID: ${id}`);

    // Şimdilik sistemin çalıştığını görmek için örnek bir test akışı döndürüyoruz
    return {
        streams: [
            {
                title: '🔥 TEST VİDEOSU | HDFilmCehennemi | 1080p',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            }
        ]
    };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
