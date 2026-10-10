const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'HDFilmCehennemi Kaynak Çözücü',
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
    try {
        const { type, id } = args;
        let movieName = "Esaretin Bedeli";

        if (id && id.startsWith('tt')) {
            const resolved = await getMovieTitleFromImdb(id);
            if (resolved) movieName = resolved;
        }

        // Şimdilik sistemin hatasız kalktığını görmek için kararlı test akışı dönüyoruz
        return {
            streams: [
                {
                    title: `🎬 HDFilmCehennemi Çalışıyor | ${movieName} (1080p)`,
                    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                }
            ]
        };
    } catch (err) {
        console.log("Handler hatası:", err.message);
        return { streams: [] };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
