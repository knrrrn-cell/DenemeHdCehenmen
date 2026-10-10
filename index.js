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

// 1. Adım: IMDb ID'sinden film adını öğrenen yardımcı fonksiyon (Cinemeta API)
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

// 2. Adım: HDFilmCehennemi Tarayıcısı
async function scrapeHdFilmCehennemi(movieTitle) {
    let streams = [];
    try {
        const searchUrl = `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(movieTitle)}`;
        const response = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.hdfilmcehennemi.nl/'
            }
        });
        
        const $ = cheerio.load(response.data);

        // HDFilmCehennemi üzerindeki film kartlarını yakalıyoruz
        $('.film-box, .poster, .card').each((i, el) => {
            const title = $(el).find('.title, h3, .name').text().trim();
            const link = $(el).find('a').attr('href');
            const quality = $(el).find('.quality, .etiket, span').text().trim() || '1080p';

            if (link) {
                // Eğer link göreli (relative) ise site kök adresini ekleyelim
                const fullLink = link.startsWith('http') ? link : `https://www.hdfilmcehennemi.nl${link}`;

                streams.push({
                    title: `🎬 HDFilmCehennemi | ${quality} | ${title || movieTitle}`,
                    url: fullLink // Tıklandığında direkt bu sayfaya yönlendirir veya video çözücüye gider
                });
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

    let searchName = "Interstellar"; // Varsayılan yedek isim

    // Eğer gelen ID bir IMDb ID'si ise gerçek ismini alalım
    if (id.startsWith('tt')) {
        const resolvedName = await getMovieTitleFromImdb(id);
        if (resolvedName) {
            searchName = resolvedName;
            console.log(`Bulunan Film Adı: ${searchName}`);
        }
    }

    // HDFilmCehennemi'nde arat
    let results = await scrapeHdFilmCehennemi(searchName);

    // Eğer site koruması veya etiket farkından dolayı boş dönerse test amaçlı fallback ekleyelim ki boş kalmasın
    if (results.length === 0) {
        results.push({
            title: `⚠️ HDFilmCehennemi Arandı (${searchName}) - Sonuç Bulunamadı`,
            url: `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(searchName)}`
        });
    }

    return { streams: results };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
