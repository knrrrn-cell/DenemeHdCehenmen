const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'HDFilmCehennemi ve Yerli Kaynaklar',
    types: ['movie', 'series'],
    catalogs: [],
    resources: ['stream']
});

async function getMovieTitleFromImdb(imdbId) {
    try {
        const response = await axios.get(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`);
        if (response.data && response.data.meta && response.data.meta.name) {
            return response.data.meta.name;
        }
    } catch (e) {
        console.log("IMDb hatası:", e.message);
    }
    return null;
}

builder.defineStreamHandler(async function(args) {
    const { type, id } = args;
    console.log(`İstek geldi -> Tip: ${type}, ID: ${id}`);

    let movieName = "Film";
    if (id.startsWith('tt')) {
        const resolved = await getMovieTitleFromImdb(id);
        if (resolved) movieName = resolved;
    }

    // Stremio'nun dahili oynatıcısının anında açtığı HLS/m3u8 veya stabil mp4 testi
    return {
        streams: [
            {
                title: `⚡ STABLE TEST | ${movieName} (1080p)`,
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            }
        ]
    };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
