const axios = require('axios');

// Bạn cần thay thế bằng API key thật từ https://www.themoviedb.org/settings/api
const TMDB_KEY = process.env.TMDB_API_KEY || 'YOUR_REAL_TMDB_API_KEY_HERE';

async function getPosterByImdbId(imdbId) {
    try {
        if (!TMDB_KEY || TMDB_KEY === 'YOUR_REAL_TMDB_API_KEY_HERE') {
            console.warn('⚠️  TMDB API key chưa được cấu hình!');
            return null;
        }

        // 1️⃣ imdbId → tmdbId
        const findRes = await axios.get(
            `https://api.themoviedb.org/3/find/${imdbId}`,
            {
                params: {
                    api_key: TMDB_KEY,
                    external_source: 'imdb_id'
                },
                timeout: 5000 // 5 giây timeout
            }
        );

        const movie = findRes.data.movie_results[0];
        if (!movie) {
            console.log(`Không tìm thấy phim với IMDB ID: ${imdbId}`);
            return null;
        }

        // 2️⃣ tmdbId → poster
        if (movie.poster_path) {
            const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
            console.log(`✅ Tìm thấy poster cho ${imdbId}: ${posterUrl}`);
            return posterUrl;
        } else {
            console.log(`Phim ${imdbId} không có poster`);
            return null;
        }
    } catch (err) {
        console.error(`❌ TMDB API error cho ${imdbId}:`, err.message);
        return null;
    }
}

module.exports = { getPosterByImdbId };
