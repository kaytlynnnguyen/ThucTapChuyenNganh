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
    const newCategory = new Category({
        name: req.body.name,
        image: req.body.image.trim(),
        status: req.body.status === 'true'
    });

    newCategory.save()
        .then(() => res.redirect('/admin/category'))
        .catch(err => res.send(err));
});


// GET /admin/category/edit
router.get('/edit/:id', function(req, res) {
    Category.findOne({_id: req.params.id}).then((category) => {
        res.render('admin/category/edit',
            {title: 'Edit Category', category: category.toObject()});
    })
});
router.put('/edit/:id', function(req, res) {
    Category.findOne({_id: req.params.id}).then((category) => {
        category.name = req.body.name;
        category.image = req.body.image.trim();
        category.status = req.body.status === 'true';
        category.save().then ( savecategory => {
            res.redirect('/admin/category');
        })
    })
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
