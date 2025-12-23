const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: String,
    overview: String,
    releaseDate: String,
    genres: String,
    rating: Number,
    trailerId: String,
    imgId: String,  // ID hoặc đường dẫn ảnh poster của phim
    poster: String, // URL poster từ TMDB API
    imdbId: String  // IMDB ID để lấy poster từ TMDB API
});

module.exports = mongoose.model('Movie', movieSchema);