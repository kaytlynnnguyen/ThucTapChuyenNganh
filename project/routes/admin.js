var express = require('express');
var router = express.Router();

function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // Proceed if authenticated
    } else {
        res.redirect('/login'); // Redirect to login if authentication fails
    }
}

router.all('/*', useAuthenticated, (req, res, next) => {
    res.locals.layout = 'admin';
    next();
});

// Trang chính admin
router.get('/', (req, res) => {
    res.render('admin/index', { title: 'Bảng điều khiển Admin' });
});

// Quản lý Anime
router.get('/product', (req, res) => {
    res.render('admin/product/product_list', { title: 'Quản lý Anime' });
});

// Quản lý thể loại
router.get('/category', (req, res) => {
    res.render('admin/category/category-list', { title: 'Quản lý thể loại' });
});

// Quản lý người dùng
router.get('/users', (req, res) => {
    res.render('admin/users/user_list', { title: 'Quản lý người dùng' });
});

// Bài viết Blog
router.get('/blogwrite', (req, res) => {
    res.render('admin/blogwrite/blogwrite_list', { title: 'Bài viết Blog' });
});
router.get('/test', (req, res) => {
    res.render('admin/test/test', { title: 'Test' });
});

module.exports = router;
