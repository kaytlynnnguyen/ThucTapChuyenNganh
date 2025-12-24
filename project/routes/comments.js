var express = require('express');
const Comment = require('../models/Comment');
var router = express.Router();

// Middleware kiểm tra admin
function requireAdmin(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next(); // Proceed if authenticated
    } else {
        res.redirect('/login'); // Redirect to login if authentication fails
    }
}

router.all('/*', function(req, res, next) {
    res.app.locals.layout = "admin";
    next();
});

// GET /admin/comments - Danh sách comments
router.get('/', requireAdmin, async function(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        // Filter theo status
        const status = req.query.status || '';
        const statusQuery = status ? { status: status } : {};

        const comments = await Comment.find(statusQuery)
            .populate('user', 'name email')
            .populate('movie', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalComments = await Comment.countDocuments(statusQuery);
        const totalPages = Math.ceil(totalComments / limit);

        // Thống kê
        const stats = {
            total: await Comment.countDocuments(),
            pending: await Comment.countDocuments({ status: 'pending' }),
            approved: await Comment.countDocuments({ status: 'approved' }),
            rejected: await Comment.countDocuments({ status: 'rejected' })
        };

        res.render('admin/comments/comment_list', {
            title: 'Quản lý đánh giá',
            comments: comments,
            currentPage: page,
            totalPages: totalPages,
            totalComments: totalComments,
            status: status,
            stats: stats
        });
    } catch (error) {
        console.error('Error loading comments:', error);
        res.render('admin/error', { 
            title: 'Lỗi',
            message: 'Có lỗi xảy ra khi tải danh sách đánh giá'
        });
    }
});

// POST /admin/comments/:id/approve - Duyệt comment
router.post('/:id/approve', requireAdmin, async function(req, res) {
    try {
        await Comment.findByIdAndUpdate(req.params.id, { status: 'approved' });
        req.flash('success_message', 'Đã duyệt đánh giá');
        res.redirect('/admin/comments');
    } catch (error) {
        console.error('Error approving comment:', error);
        req.flash('error_message', 'Có lỗi xảy ra khi duyệt đánh giá');
        res.redirect('/admin/comments');
    }
});

// POST /admin/comments/:id/reject - Từ chối comment
router.post('/:id/reject', requireAdmin, async function(req, res) {
    try {
        await Comment.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        req.flash('success_message', 'Đã từ chối đánh giá');
        res.redirect('/admin/comments');
    } catch (error) {
        console.error('Error rejecting comment:', error);
        req.flash('error_message', 'Có lỗi xảy ra khi từ chối đánh giá');
        res.redirect('/admin/comments');
    }
});

// DELETE /admin/comments/:id - Xóa comment
router.delete('/:id', requireAdmin, async function(req, res) {
    try {
        await Comment.findByIdAndDelete(req.params.id);
        req.flash('success_message', 'Đã xóa đánh giá');
        res.redirect('/admin/comments');
    } catch (error) {
        console.error('Error deleting comment:', error);
        req.flash('error_message', 'Có lỗi xảy ra khi xóa đánh giá');
        res.redirect('/admin/comments');
    }
});

module.exports = router;