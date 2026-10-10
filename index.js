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

async function scrapeHdFilmCehennemi(movieTitle) {
    let streams = [];
    try {
        const searchUrl = `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(movieTitle)}`;
        const searchRes = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' 
            },
            timeout: 5000
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
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' 
            },
            timeout: 5000
        });

        const $detail = cheerio.load(detailRes.data);

        // Sayfa kaynağında bulduğumuz data-src / src iframe adresini yakalıyoruz
        $detail('iframe').each((i, el) => {
            let src = $detail(el).attr('data-src') \vert{}\vert{}$detail(el).attr('src');
            if (src) {
                if (src.startsWith('//')) {
                    src = 'https:' + src;
                } else if (!src.startsWith('http')) {
                    src = 'https://www.hdfilmcehennemi.nl' + src;
                }

                streams.push({
                    title: `🎬 HDFilmCehennemi | Embed Player`,
                    url: src
                });
            }
        });

    } catch (error) {
        console.log("Scrape hatası:", error.message);
    }
    return streams;
}

builder.defineStreamHandler(async function(args) {
    try {
        const { type, id } = args;
        let movieName = "Esaretin Bedeli";

        if (id && id.startsWith('tt')) {
            const resolved = await getMovieTitleFromImdb(id);
            if (resolved) movieName = resolved;
        }

        let streams = await scrapeHdFilmCehennemi(movieName);

        // Bulamazsa varsayılan test bağlantısını koyalım
        if (streams.length === 0) {
            streams.push({
                title: `⚠️ HDFilmCehennemi (${movieName}) - Test Bağlantısı`,
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            });
        }

        return { streams: streams };
    } catch (err) {
        console.log("Stream handler hatası:", err.message);
        return { streams: [] };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
