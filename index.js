const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const builder = new addonBuilder({
    id: 'org.turkcescraper.addon',
    version: '1.0.0',
    name: 'Türkçe Dizi/Film Scraper',
    description: 'Yerli sitelerden kaynak tarayan özel eklenti',
    types: ['movie', 'series'],
    catalogs: [],
    resources: ['stream']
});

// HDFilmCehennemi Tarayıcısı Testi
async function scrapeHdFilmCehennemi(queryName) {
    let streams = [];
    try {
        const searchUrl = `https://www.hdfilmcehennemi.nl/arama?s=${encodeURIComponent(queryName)}`;
        const response = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.hdfilmcehennemi.nl/'
            }
        });
        
        const $ = cheerio.load(response.data);

        $('.film-box, .poster').each((i, el) => {
            const title = $(el).find('.title, h3').text().trim();
            const link = $(el).find('a').attr('href');
            const quality = $(el).find('.quality, .etiket').text().trim() || '1080p';

            if (link) {
                streams.push({
                    title: `🎬 HDFilmCehennemi | ${quality} | ${title}`,
                    url: link 
                });
            }
        });
    } catch (error) {
        console.log("HDFilmCehennemi hata:", error.message);
    }
    return streams;
}

builder.defineStreamHandler(async function(args) {
    const { type, id } = args;
    console.log(`İstek alındı -> Tip: ${type}, ID: ${id}`);

    const aramaIsmi = "Interstellar"; 
    let allStreams = [];
    
    const hdFilmSonuclari = await scrapeHdFilmCehennemi(aramaIsmi);
    allStreams = allStreams.concat(hdFilmSonuclari);

    return { streams: allStreams };
});

// Render'ın vereceği PORT değerini otomatik yakalaması için process.env.PORT şarttır
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
