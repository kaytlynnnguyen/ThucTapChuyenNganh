const Movie = require('../models/Movie');
const { getPosterByImdbId } = require('../services/tmdbService');

exports.getMovies = async (req, res) => {
    try {
        // Lấy phim có poster trước, sau đó lấy phim không có poster
        let moviesWithPoster = await Movie.find({ 
            poster: { $ne: null, $ne: '' } 
        }).limit(30);
        
        console.log('Movies with poster:', moviesWithPoster.length);
        console.log('First movie with poster:', moviesWithPoster[0] ? {
            title: moviesWithPoster[0].title,
            poster: moviesWithPoster[0].poster,
            imgId: moviesWithPoster[0].imgId
        } : 'None');
        
        let moviesWithoutPoster = await Movie.find({ 
            $or: [
                { poster: { $exists: false } },
                { poster: null },
                { poster: '' }
            ]
        }).limit(20);
        
        console.log('Movies without poster:', moviesWithoutPoster.length);
        
        // Kết hợp 2 danh sách
        let movies = [...moviesWithPoster, ...moviesWithoutPoster];
        
        console.log('Total movies:', movies.length);

        res.render('blog/movies', { movies });
    } catch (error) {
        console.error('Error getting movies:', error);
        res.status(500).render('blog/error', { message: 'Không thể tải danh sách phim' });
    }
};
