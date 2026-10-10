const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'HDFilmCehennemi API Tabanlı Eklenti',
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

// Doğrudan API üzerinden arama yapma fonksiyonu
async function searchHdFilmApi(movieTitle) {
    let streams = [];
    try {
        // HDFilmCehennemi gibi sitelerin arama isteklerinde kullandığı header kalıpları
        const searchApiUrl = `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(movieTitle)}`;
        
        // Burada sitenin ajax/json isteği kabul edip etmediğini test ediyoruz
        const response = await axios.get(searchApiUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest', // AJAX isteği olduğunu belirtir
                'Accept': 'application/json, text/javascript, */*; q=0.01'
            }
        });

        // Eğer site doğrudan JSON dönüyorsa veriyi işleriz, 
        // dönmüyorsa alternatif API uç noktalarını ararız.
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(item => {
                streams.push({
                    title: `🎬 HDFilmCehennemi | ${item.title || movieTitle}`,
                    url: `https://www.hdfilmcehennemi.nl/film/${item.slug}`
                });
            });
        }
    } catch (error) {
        console.log("API Arama hatası:", error.message);
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

    let results = await searchHdFilmApi(searchName);

    if (results.length === 0) {
        // Şimdilik API JSON dönmezse bile en azından arama linkini direkt oynatılabilir test formatında sunalım
        results.push({
            title: `🔗 HDFilmCehennemi'nde Ara: ${searchName}`,
            url: `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(searchName)}`
        });
    }

    return { streams: results };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
