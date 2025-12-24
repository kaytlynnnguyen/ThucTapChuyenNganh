const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = 'c05481df7e07f877fc270caf7e48f9c0'; // ← thay bằng key của Hân

var express = require('express');
var router = express.Router();
const Movie = require('../models/Movie');
const Comment = require('../models/Comment');
const youtubeService = require('../services/youtubeService');

// Middleware kiểm tra đăng nhập
function requireLogin(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next(); // User đã đăng nhập, cho phép tiếp tục
    } else {
        // User chưa đăng nhập, chuyển hướng đến trang login
        req.flash('error_message', 'Bạn cần đăng nhập để xem phim.');
        res.redirect('/login');
    }
}

router.all('/*', (req, res, next) => {
    res.locals.layout = 'home';
    next();
});
//thêm này vào
async function getPosterFromTMDB(imdbId) {
    if (!imdbId) return null;

    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const res = await axios.get(url);

    if (
        res.data &&
        res.data.movie_results &&
        res.data.movie_results.length > 0
    ) {
        return res.data.movie_results[0].poster_path;
    }
    return null;
}
//ham thu 2
async function cachePoster(posterPath) {
    if (!posterPath) return null;

    const filename = posterPath.replace('/', '');
    const localPath = path.join(__dirname, '../public/img/posters/', filename);

    // Nếu ảnh đã tồn tại → dùng luôn
    if (fs.existsSync(localPath)) {
        return `/img/posters/${filename}`;
    }

    // Download ảnh từ TMDB
    const imageUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
    const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    fs.writeFileSync(localPath, res.data);
    return `/img/posters/${filename}`;
}

// Xử lý route /watch không có ID (redirect về danh sách)
router.get('/watch', function(req, res, next) {
    req.flash('error_message', 'Vui lòng chọn phim từ danh sách để xem trailer.');
    res.redirect('/movies');
});

// Danh sách phim
router.get('/', async function(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        // Tìm kiếm
        const search = req.query.search || '';
        const searchQuery = search ? { 
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { overview: { $regex: search, $options: 'i' } },
                { genres: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Lọc theo genre
        const genre = req.query.genre || '';
        const genreQuery = genre ? { genres: { $regex: genre, $options: 'i' } } : {};

        // Kết hợp các query
        const query = { ...searchQuery, ...genreQuery };

        const movies = await Movie.find(query)
            .sort({ releaseDate: -1, title: 1 })
            .skip(skip)
            .limit(limit)
            .lean(); 

        // Convert _id thành string cho mỗi phim
        const moviesWithStringId = movies.map(movie => ({
            ...movie,
            _id: movie._id ? movie._id.toString() : 'no-id'
        }));

        console.log('Sample movie data:', moviesWithStringId[0] ? {
            _id: moviesWithStringId[0]._id,
            title: moviesWithStringId[0].title,
            poster: moviesWithStringId[0].poster,
            imgId: moviesWithStringId[0].imgId
        } : 'No movies');

        const totalMovies = await Movie.countDocuments(query);
        const totalPages = Math.ceil(totalMovies / limit);

        // Lấy danh sách genres để hiển thị filter
        const allGenres = await Movie.distinct('genres');
        const genres = allGenres
            .filter(g => g && g.trim() !== '')
            .map(g => {
                // Nếu genres có dạng "Action, Drama, Comedy", tách ra
                if (g.includes(',')) {
                    return g.split(',').map(gg => gg.trim());
                }
                return g.trim();
            })
            .flat()
            .filter((g, index, self) => self.indexOf(g) === index) // Loại bỏ trùng lặp
            .sort();

        res.render('blog/movies', {
            layout: 'movies', // Sử dụng layout riêng
            title: 'Danh sách phim',
            movies: moviesWithStringId,
            currentPage: page,
            totalPages: totalPages,
            totalMovies: totalMovies,
            search: search,
            genre: genre,
            genres: genres
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phim:', error);
        res.render('blog/error', { 
            title: 'Lỗi',
            message: 'Có lỗi xảy ra khi tải danh sách phim'
        });
    }
});

// Thêm comment - Yêu cầu đăng nhập (PHẢI ĐẶT TRƯỚC /:id)
router.post('/:id/comment', requireLogin, async function(req, res, next) {
    try {
        const mongoose = require('mongoose');
        if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            req.flash('error_message', 'ID phim không hợp lệ');
            return res.redirect('/movies');
        }

        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            req.flash('error_message', 'Phim không tồn tại');
            return res.redirect('/movies');
        }

        // Kiểm tra user đã comment cho phim này chưa
        const existingComment = await Comment.findOne({
            user: req.user._id,
            movie: req.params.id
        });

        if (existingComment) {
            req.flash('error_message', 'Bạn đã đánh giá phim này rồi');
            return res.redirect(`/movies/${req.params.id}`);
        }

        // Tạo comment mới
        const newComment = new Comment({
            content: req.body.content.trim(),
            rating: parseInt(req.body.rating),
            user: req.user._id,
            movie: req.params.id,
            status: 'pending' // Chờ duyệt
        });

        await newComment.save();
        req.flash('success_message', 'Đánh giá của bạn đã được gửi và đang chờ duyệt');
        res.redirect(`/movies/${req.params.id}`);

    } catch (error) {
        console.error('Lỗi khi thêm comment:', error);
        req.flash('error_message', 'Có lỗi xảy ra khi gửi đánh giá');
        res.redirect(`/movies/${req.params.id}`);
    }
});

// Chi tiết phim - Yêu cầu đăng nhập - comment
router.get('/:id', requireLogin, async function(req, res, next) {
    try {
        // Kiểm tra ID có hợp lệ không (dùng mongoose validation)
        const mongoose = require('mongoose');
        if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.render('blog/error', {
                title: 'Lỗi',
                message: 'ID phim không hợp lệ. Vui lòng chọn phim từ danh sách.'
            });
        }

        const movie = await Movie.findById(req.params.id);
        
        if (!movie) {
            return res.render('blog/error', {
                title: 'Không tìm thấy',
                message: 'Phim không tồn tại'
            });
        }

        // Lấy comments đã được duyệt
        const comments = await Comment.find({ 
            movie: req.params.id, 
            status: 'approved' 
        })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .lean();

        // Lấy phim liên quan (nếu có genres)
        let relatedMovies = [];
        if (movie.genres && movie.genres.trim() !== '') {
            relatedMovies = await Movie.find({
                _id: { $ne: movie._id },
                genres: { $regex: movie.genres, $options: 'i' }
            })
            .limit(6)
            .sort({ releaseDate: -1 })
            .lean();
            
            // Convert _id thành string
            relatedMovies = relatedMovies.map(rm => ({
                ...rm,
                _id: rm._id.toString()
            }));
        }

        // Convert movie _id thành string
        const movieObj = movie.toObject ? movie.toObject() : movie;
        movieObj._id = movieObj._id.toString();

        res.render('blog/movie_details', {
            title: movie.title || 'Chi tiết phim',
            movie: movieObj,
            comments: comments,
            relatedMovies: relatedMovies
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết phim:', error);
        res.render('blog/error', {
            title: 'Lỗi',
            message: 'Có lỗi xảy ra khi tải thông tin phim: ' + error.message
        });
    }
});

// API: Lấy trailer YouTube - Yêu cầu đăng nhập
router.get('/:id/trailer', requireLogin, async function(req, res, next) {
    try {
        const mongoose = require('mongoose');
        if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.json({
                success: false,
                message: 'ID phim không hợp lệ'
            });
        }

        const movie = await Movie.findById(req.params.id);
        if (!movie.poster && movie.imdb_id) {
            try {
                const posterPath = await getPosterFromTMDB(movie.imdb_id);
                if (posterPath) {
                    const localPoster = await cachePoster(posterPath);
                    movie.poster = localPoster;
                    await movie.save();
                }
            } catch (err) {
                console.error('Lỗi lấy poster chi tiết:', err.message);
            }
        }        
        
        if (!movie) {
            return res.json({
                success: false,
                message: 'Phim không tồn tại'
            });
        }

        // Nếu đã có trailer ID trong database, sử dụng luôn
        if (movie.trailerId) {
            return res.json({
                success: true,
                videoId: movie.trailerId,
                url: `https://www.youtube.com/watch?v=${movie.trailerId}`,
                embedUrl: `https://www.youtube.com/embed/${movie.trailerId}`
            });
        }

        // Nếu chưa có, tìm kiếm trên YouTube
        const trailerResult = await youtubeService.searchTrailer(movie.title, movie.releaseDate);

        if (trailerResult.success) {
            // Lưu trailer ID vào database
            movie.trailerId = trailerResult.videoId;
            await movie.save();
        }

        res.json(trailerResult);
    } catch (error) {
        console.error('Lỗi khi lấy trailer:', error);
        res.json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy trailer: ' + error.message
        });
    }
});

// Trang xem trailer - Yêu cầu đăng nhập
router.get('/:id/watch', requireLogin, async function(req, res, next) {
    try {
        const mongoose = require('mongoose');
        
        // Kiểm tra ID có tồn tại và hợp lệ không
        if (!req.params.id || req.params.id.trim() === '' || req.params.id === 'watch') {
            req.flash('error_message', 'ID phim không hợp lệ. Vui lòng chọn phim từ danh sách.');
            return res.redirect('/movies');
        }
        
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.render('blog/error', {
                title: 'Lỗi',
                message: 'ID phim không hợp lệ. Vui lòng chọn phim từ danh sách.'
            });
        }

        const movie = await Movie.findById(req.params.id);
        
        if (!movie) {
            return res.render('blog/error', {
                title: 'Không tìm thấy',
                message: 'Phim không tồn tại'
            });
        }

        // Lấy trailer ID
        let trailerId = movie.trailerId;
        
        // Nếu chưa có, tìm kiếm
        if (!trailerId) {
            const trailerResult = await youtubeService.searchTrailer(movie.title, movie.releaseDate);
            if (trailerResult.success) {
                trailerId = trailerResult.videoId;
                movie.trailerId = trailerId;
                await movie.save();
            }
        }

        // Convert movie _id thành string
        const movieObj = movie.toObject ? movie.toObject() : movie;
        movieObj._id = movieObj._id.toString();

        res.render('blog/movie_watch', {
            title: `Xem trailer: ${movie.title}`,
            movie: movieObj,
            trailerId: trailerId
        });
    } catch (error) {
        console.error('Lỗi khi xem trailer:', error);
        res.render('blog/error', {
            title: 'Lỗi',
            message: 'Có lỗi xảy ra khi tải trailer'
        });
    }
});

module.exports = router;

