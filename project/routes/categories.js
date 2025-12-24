var express = require('express');
const Category = require('../models/Catergory.js');
var router = express.Router();
router.all('/*', function(req, res, next) {
    res.app.locals.layout="admin";
    next();
})
// GET /admin/category
router.get('/', function(req, res) {
    Category.find({})
        .then(categories => {
            const data = categories.map((cat, index) => ({
                ...cat.toObject(),
                stt: index + 1, //tao stt
            }));

            res.render('admin/category/category-list', { categories: data });
        })
        .catch(err => {
            console.log(err);
            res.send('Error loading category');
        });
});

// GET /admin/category/create
router.get('/create', function (req, res) {
    res.render('admin/category/create');
});
router.post('/create', function(req, res) {
    console.log('Request body:', req.body); // Debug log
    
    // Validation - kiểm tra an toàn hơn
    if (!req.body || !req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
        req.flash('error_message', 'Tên thể loại không được để trống');
        return res.render('admin/category/create', {
            title: 'Thêm thể loại mới'
        });
    }

    const newCategory = new Category({
        name: req.body.name.trim(),
    });

    newCategory.save()
        .then(() => {
            const successMessage = encodeURIComponent(`Đã thêm thể loại "${newCategory.name}" thành công!`);
            res.redirect(`/admin/category?success=${successMessage}`);
        })
        .catch(err => {
            console.error('Error creating category:', err);
            const errorMessage = encodeURIComponent('Lỗi khi tạo thể loại: ' + err.message);
            res.redirect(`/admin/category/create?error=${errorMessage}`);
        });
});


// GET /admin/category/edit
router.get('/edit/:id', function(req, res) {
    Category.findOne({_id: req.params.id}).then((category) => {
        res.render('admin/category/edit',
            {title: 'Edit Category', category: category.toObject()});
    })
});
router.put('/edit/:id', function(req, res) {
    console.log('Request body:', req.body); // Debug log
    
    // Validation - kiểm tra an toàn hơn
    if (!req.body || !req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
        req.flash('error_message', 'Tên thể loại không được để trống');
        return res.redirect('/admin/category/edit/' + req.params.id);
    }

    Category.findOne({_id: req.params.id}).then((category) => {
        if (!category) {
            req.flash('error_message', 'Không tìm thấy thể loại cần sửa');
            return res.redirect('/admin/category');
        }

        const oldName = category.name;
        category.name = req.body.name.trim();
        
        category.save().then(() => {
            const successMessage = encodeURIComponent(`Đã cập nhật thể loại "${category.name}" thành công!`);
            res.redirect(`/admin/category?success=${successMessage}`);
        }).catch(err => {
            console.error('Error updating category:', err);
            const errorMessage = encodeURIComponent('Lỗi khi cập nhật thể loại: ' + err.message);
            res.redirect(`/admin/category/edit/${req.params.id}?error=${errorMessage}`);
        });
    }).catch(err => {
        console.error('Error finding category:', err);
        req.flash('error_message', 'Lỗi khi tìm thể loại: ' + err.message);
        res.redirect('/admin/category');
    });
});
router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            req.flash('error_message', 'Không tìm thấy thể loại cần xóa');
            return res.redirect('/admin/category');
        }
        
        const categoryName = category.name;
        await Category.findByIdAndDelete(req.params.id);
        const successMessage = encodeURIComponent(`Đã xóa thể loại "${categoryName}" thành công!`);
        res.redirect(`/admin/category?success=${successMessage}`);
    } catch (err) {
        console.log(err);
        req.flash('error_message', 'Lỗi khi xóa thể loại: ' + err.message);
        res.redirect('/admin/category');
    }
});
module.exports = router;
