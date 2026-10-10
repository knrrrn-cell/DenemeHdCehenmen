const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'HDFilmCehennemi Embed Çözücü',
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

async function scrapeHdFilmCehennemi(movieTitle) {
    let streams = [];
    try {
        const searchUrl = `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(movieTitle)}`;
        const searchRes = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
        });
        
        const $ = cheerio.load(searchRes.data);
        let filmLink = '';

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/film/')) {
                filmLink = href.startsWith('http') ? href : `https://www.hdfilmcehennemi.nl${href}`;
                return false;
            }
        });

        if (!filmLink) return streams;

        const detailRes = await axios.get(filmLink, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
        });

        const $detail = cheerio.load(detailRes.data);

        // Kaynak kodunda gördüğümüz iframe (data-src veya src) etiketini yakalıyoruz
        $detail('iframe').each((i, el) => {
            const src = $detail(el).attr('data-src') \vert{}\vert{}$detail(el).attr('src');
            if (src && (src.includes('embed') || src.includes('video'))) {
                const embedUrl = src.startsWith('http') ? src : `https:${src}`;
                streams.push({
                    title: `🎬 HDFilmCehennemi | Türkçe Kaynak`,
                    url: embedUrl
                });
            }
        });

    } catch (error) {
        console.log("Hata:", error.message);
    }
    return streams;
}

builder.defineStreamHandler(async function(args) {
    const { type, id } = args;
    let movieName = "Esaretin Bedeli";

    if (id.startsWith('tt')) {
        const resolved = await getMovieTitleFromImdb(id);
        if (resolved) movieName = resolved;
    }

    let streams = await scrapeHdFilmCehennemi(movieName);

    if (streams.length === 0) {
        streams.push({
            title: `⚠️ Kaynak Bulunamadı (${movieName})`,
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        });
    }

    return { streams: streams };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
