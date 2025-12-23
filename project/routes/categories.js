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
        return res.status(400).send('Tên thể loại không được để trống');
    }

    const newCategory = new Category({
        name: req.body.name.trim(),
    });

    newCategory.save()
        .then(() => res.redirect('/admin/category'))
        .catch(err => {
            console.error('Error creating category:', err);
            res.status(500).send('Lỗi khi tạo thể loại: ' + err.message);
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
        return res.status(400).send('Tên thể loại không được để trống');
    }

    Category.findOne({_id: req.params.id}).then((category) => {
        if (!category) {
            return res.status(404).send('Không tìm thấy thể loại');
        }

        category.name = req.body.name.trim();
        
        category.save().then(() => {
            res.redirect('/admin/category');
        }).catch(err => {
            console.error('Error updating category:', err);
            res.status(500).send('Lỗi khi cập nhật thể loại: ' + err.message);
        });
    }).catch(err => {
        console.error('Error finding category:', err);
        res.status(500).send('Lỗi khi tìm thể loại: ' + err.message);
    });
});
router.delete('/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.redirect('/admin/category');
    } catch (err) {
        console.log(err);
        res.send('Delete failed');
    }
});
module.exports = router;
