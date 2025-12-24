var express = require('express');
var router = express.Router();
const Movie = require('../models/Movie');
const User = require('../models/User');
const bcrypt = require('bcrypt');

function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // Proceed if authenticated
    } else {
        res.redirect('/login'); // Redirect to login if authentication fails
    }
}

router.all('/*', useAuthenticated,(req, res, next) => {
    res.locals.layout = 'admin';
    next();
});

// Trang chính admin
router.get('/', async (req, res) => {
    try {
        const totalMovies = await Movie.countDocuments();
        const moviesWithPosters = await Movie.countDocuments({ poster: { $exists: true, $ne: null } });
        const moviesWithTrailers = await Movie.countDocuments({ trailerId: { $exists: true, $ne: null } });
        const recentMovies = await Movie.find().sort({ _id: -1 }).limit(5);
        
        res.render('admin/index', { 
            title: 'Bảng điều khiển Admin',
            totalMovies,
            moviesWithPosters,
            moviesWithTrailers,
            recentMovies
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.render('admin/index', { title: 'Bảng điều khiển Admin' });
    }
});

// Quản lý phim
router.get('/movies', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        const search = req.query.search || '';
        const searchQuery = search ? {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { genres: { $regex: search, $options: 'i' } }
            ]
        } : {};
        
        const totalMovies = await Movie.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalMovies / limit);
        
        const movies = await Movie.find(searchQuery)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(); // Convert to plain JavaScript objects
        
        // Add STT (số thứ tự)
        const moviesWithSTT = movies.map((movie, index) => ({
            ...movie,
            stt: skip + index + 1
        }));
        
        res.render('admin/movies/movie_list_full', {
            title: 'Quản lý phim',
            movies: moviesWithSTT,
            currentPage: page,
            totalPages: totalPages,
            totalMovies: totalMovies,
            search: search
        });
    } catch (error) {
        console.error('Error loading movies:', error);
        res.render('admin/movies/movie_list_full', {
            title: 'Quản lý phim',
            movies: [],
            error: 'Không thể tải danh sách phim',
            currentPage: 1,
            totalPages: 1,
            totalMovies: 0,
            search: ''
        });
    }
});

// Trang thêm phim mới
router.get('/movies/create', (req, res) => {
    res.render('admin/movies/create', {
        title: 'Thêm phim mới'
    });
});

// Xử lý thêm phim mới
router.post('/movies/create', async (req, res) => {
    try {
        const newMovie = new Movie({
            title: req.body.title.trim(),
            overview: req.body.overview ? req.body.overview.trim() : '',
            releaseDate: req.body.releaseDate ? req.body.releaseDate.trim() : '',
            genres: req.body.genres ? req.body.genres.trim() : '',
            rating: req.body.rating ? parseFloat(req.body.rating) : null,
            poster: req.body.poster ? req.body.poster.trim() : '',
            trailerId: req.body.trailerId ? req.body.trailerId.trim() : '',
            imdbId: req.body.imdbId ? req.body.imdbId.trim() : ''
        });

        await newMovie.save();
        req.flash('success_message', `Đã thêm phim "${newMovie.title}" thành công`);
        res.redirect('/admin/movies');
    } catch (error) {
        console.error('Error creating movie:', error);
        res.render('admin/movies/create', {
            title: 'Thêm phim mới',
            error: 'Lỗi khi thêm phim: ' + error.message
        });
    }
});

// Trang sửa phim
router.get('/movies/edit/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id).lean();
        if (!movie) {
            return res.status(404).render('admin/error', { message: 'Không tìm thấy phim' });
        }
        
        res.render('admin/movies/edit', {
            title: `Sửa phim: ${movie.title}`,
            movie: movie
        });
    } catch (error) {
        console.error('Error loading movie for edit:', error);
        res.status(500).render('admin/error', { message: 'Lỗi khi tải thông tin phim' });
    }
});

// Xử lý sửa phim
router.put('/movies/edit/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).render('admin/error', { message: 'Không tìm thấy phim' });
        }

        movie.title = req.body.title.trim();
        movie.overview = req.body.overview ? req.body.overview.trim() : '';
        movie.releaseDate = req.body.releaseDate ? req.body.releaseDate.trim() : '';
        movie.genres = req.body.genres ? req.body.genres.trim() : '';
        movie.rating = req.body.rating ? parseFloat(req.body.rating) : null;
        movie.poster = req.body.poster ? req.body.poster.trim() : '';
        movie.trailerId = req.body.trailerId ? req.body.trailerId.trim() : '';
        movie.imdbId = req.body.imdbId ? req.body.imdbId.trim() : '';

        await movie.save();
        req.flash('success_message', `Cập nhật phim "${movie.title}" thành công`);
        res.redirect('/admin/movies');
    } catch (error) {
        console.error('Error updating movie:', error);
        res.render('admin/movies/edit', {
            title: 'Sửa phim',
            movie: req.body,
            error: 'Lỗi khi cập nhật phim: ' + error.message
        });
    }
});

// Xóa phim
router.delete('/movies/:id', async (req, res) => {
    try {
        await Movie.findByIdAndDelete(req.params.id);
        req.flash('success_message', 'Xóa phim thành công');
        res.redirect('/admin/movies');
    } catch (error) {
        console.error('Error deleting movie:', error);
        req.flash('error_message', 'Xóa phim thất bại: ' + error.message);
        res.redirect('/admin/movies');
    }
});

// Chi tiết phim trong admin
router.get('/movies/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).render('admin/error', { message: 'Không tìm thấy phim' });
        }
        
        res.render('admin/movies/movie_detail', {
            title: `Chi tiết phim: ${movie.title}`,
            movie
        });
    } catch (error) {
        console.error('Error loading movie detail:', error);
        res.status(500).render('admin/error', { message: 'Lỗi khi tải chi tiết phim' });
    }
});

// Cập nhật trailer cho phim
router.post('/movies/:id/trailer', async (req, res) => {
    try {
        const { trailerId } = req.body;
        await Movie.findByIdAndUpdate(req.params.id, { trailerId });
        res.json({ success: true, message: 'Cập nhật trailer thành công' });
    } catch (error) {
        console.error('Error updating trailer:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trailer' });
    }
});

// Quản lý Anime
// router.get('/product', (req, res) => {
//     res.render('admin/product/product_list', { title: 'Quản lý Anime' });
// });
//
// // Quản lý thể loại
// router.get('/category', (req, res) => {
//     res.render('admin/category/category-list', { title: 'Quản lý thể loại' });
// });

// Quản lý người dùng
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        const search = req.query.search || '';
        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};
        
        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit);
        
        const users = await User.find(searchQuery)
            .select('-password') // Không lấy password
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Add STT
        const usersWithSTT = users.map((user, index) => ({
            ...user,
            stt: skip + index + 1
        }));
        
        res.render('admin/users/user_list', {
            title: 'Quản lý người dùng',
            users: usersWithSTT,
            currentPage: page,
            totalPages: totalPages,
            totalUsers: totalUsers,
            search: search
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.render('admin/users/user_list', {
            title: 'Quản lý người dùng',
            users: [],
            error: 'Không thể tải danh sách người dùng',
            currentPage: 1,
            totalPages: 1,
            totalUsers: 0,
            search: ''
        });
    }
});

// Trang thêm user mới
router.get('/users/create', (req, res) => {
    res.render('admin/users/create', {
        title: 'Thêm người dùng mới'
    });
});

// Xử lý thêm user mới
router.post('/users/create', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        // Validate
        if (password !== confirmPassword) {
            return res.render('admin/users/create', {
                title: 'Thêm người dùng mới',
                error: 'Mật khẩu xác nhận không khớp'
            });
        }
        
        // Check email exists
        const existingUser = await User.findOne({ email: email.trim() });
        if (existingUser) {
            return res.render('admin/users/create', {
                title: 'Thêm người dùng mới',
                error: 'Email đã tồn tại trong hệ thống'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            name: name.trim(),
            email: email.trim(),
            password: hashedPassword
        });

        await newUser.save();
        const successMessage = encodeURIComponent(`Đã thêm người dùng "${newUser.name}" thành công!`);
        res.redirect(`/admin/users?success=${successMessage}`);
    } catch (error) {
        console.error('Error creating user:', error);
        res.render('admin/users/create', {
            title: 'Thêm người dùng mới',
            error: 'Lỗi khi thêm người dùng: ' + error.message
        });
    }
});

// Trang sửa user
router.get('/users/edit/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password').lean();
        if (!user) {
            return res.status(404).render('admin/error', { message: 'Không tìm thấy người dùng' });
        }
        
        res.render('admin/users/edit', {
            title: `Sửa người dùng: ${user.name}`,
            user: user
        });
    } catch (error) {
        console.error('Error loading user for edit:', error);
        res.status(500).render('admin/error', { message: 'Lỗi khi tải thông tin người dùng' });
    }
});

// Xử lý sửa user
router.put('/users/edit/:id', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).render('admin/error', { message: 'Không tìm thấy người dùng' });
        }
        
        // Validate password if provided
        if (password && password !== confirmPassword) {
            return res.render('admin/users/edit', {
                title: 'Sửa người dùng',
                user: req.body,
                error: 'Mật khẩu xác nhận không khớp'
            });
        }
        
        // Check email exists (except current user)
        const existingUser = await User.findOne({ 
            email: email.trim(),
            _id: { $ne: req.params.id }
        });
        if (existingUser) {
            return res.render('admin/users/edit', {
                title: 'Sửa người dùng',
                user: req.body,
                error: 'Email đã tồn tại trong hệ thống'
            });
        }

        user.name = name.trim();
        user.email = email.trim();
        
        // Update password if provided
        if (password && password.trim() !== '') {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        const successMessage = encodeURIComponent(`Đã cập nhật người dùng "${user.name}" thành công!`);
        res.redirect(`/admin/users?success=${successMessage}`);
    } catch (error) {
        console.error('Error updating user:', error);
        res.render('admin/users/edit', {
            title: 'Sửa người dùng',
            user: req.body,
            error: 'Lỗi khi cập nhật người dùng: ' + error.message
        });
    }
});

// Xóa user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            const errorMessage = encodeURIComponent('Không tìm thấy người dùng cần xóa');
            return res.redirect(`/admin/users?error=${errorMessage}`);
        }
        
        const userName = user.name;
        await User.findByIdAndDelete(req.params.id);
        const successMessage = encodeURIComponent(`Đã xóa người dùng "${userName}" thành công!`);
        res.redirect(`/admin/users?success=${successMessage}`);
    } catch (error) {
        console.error('Error deleting user:', error);
        const errorMessage = encodeURIComponent('Lỗi khi xóa người dùng: ' + error.message);
        res.redirect(`/admin/users?error=${errorMessage}`);
    }
});

// Bài viết Blog
router.get('/blogwrite', (req, res) => {
    res.render('admin/blogwrite/blogwrite_list', { title: 'Bài viết Blog' });
});
router.get('/test', (req, res) => {
    res.render('admin/test/test', { title: 'Test' });
});

// Test route để kiểm tra dữ liệu phim
router.get('/test-movies', async (req, res) => {
    try {
        const movies = await Movie.find().limit(5);
        res.json({
            success: true,
            count: movies.length,
            movies: movies.map(m => ({
                id: m._id,
                title: m.title,
                poster: m.poster,
                genres: m.genres,
                rating: m.rating
            }))
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Route debug để render template với dữ liệu cứng
router.get('/debug-movies', async (req, res) => {
    try {
        const movies = await Movie.find().limit(3).lean();
        console.log('Debug movies data:', movies);
        
        res.render('admin/movies/movie_list_full', {
            title: 'Debug - Quản lý phim',
            movies: movies,
            totalMovies: movies.length,
            currentPage: 1,
            totalPages: 1,
            search: ''
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.json({ error: error.message });
    }
});

// Route mới để test hiển thị phim
router.get('/movies-new', async (req, res) => {
    try {
        const movies = await Movie.find().limit(5).lean();
        res.render('admin/movies/movie_list_full', {
            title: 'Quản lý phim - Mới',
            movies: movies,
            totalMovies: movies.length,
            currentPage: 1,
            totalPages: 1,
            search: ''
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

module.exports = router;
