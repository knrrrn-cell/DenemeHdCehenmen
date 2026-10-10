const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'HDFilmCehennemi ve yerli sitelerden kaynak tarayan eklenti',
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
        console.log("IMDb isim çözme hatası:", e.message);
    }
    return null;
}

async function scrapeHdFilmCehennemi(movieTitle) {
    let streams = [];
    try {
        const searchUrl = `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(movieTitle)}`;
        const response = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://www.hdfilmcehennemi.nl/'
            }
        });
        
        const $ = cheerio.load(response.data);

        // Sitedeki tüm film bağlantılarını ve kartlarını tarayalım
        // Genellikle arama sonuçları liste veya grid elemanları içindedir
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            
            // Eğer link film detay sayfasına gidiyorsa ve içinde aradığımız kelimeye benzerlik varsa
            if (href && href.includes('/film/') && text.length > 3) {
                const fullLink = href.startsWith('http') ? href : `https://www.hdfilmcehennemi.nl${href}`;
                
                // Aynı linki tekrar eklememek için kontrol edelim
                if (!streams.some(s => s.url === fullLink)) {
                    streams.push({
                        title: `🎬 HDFilmCehennemi | ${text}`,
                        url: fullLink
                    });
                }
            }
        });
    } catch (error) {
        console.log("HDFilmCehennemi arama hatası:", error.message);
    }
    return streams;
}

builder.defineStreamHandler(async function(args) {
    const { type, id } = args;
    console.log(`Stremio İstek -> Tip: ${type}, ID: ${id}`);

    let searchName = "The Godfather"; 

    if (id.startsWith('tt')) {
        const resolvedName = await getMovieTitleFromImdb(id);
        if (resolvedName) {
            searchName = resolvedName;
        }
    }

    let results = await scrapeHdFilmCehennemi(searchName);

    if (results.length === 0) {
        results.push({
            title: `⚠️ Sonuç Bulunamadı: ${searchName}`,
            url: `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(searchName)}`
        });
    }

    return { streams: results };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
