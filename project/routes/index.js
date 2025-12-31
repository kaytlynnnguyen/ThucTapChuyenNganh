var express = require('express');
var router = express.Router();
var path = require('path');
const User = require('../models/User');
const Category = require('../models/Catergory');
const bcryptjs=require('bcryptjs')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const movieController = require('../controllers/movieController');

router.all('/*', async (req, res, next) => {
    res.locals.layout = 'home';
    
    // Thêm categories vào tất cả các trang sử dụng home layout
    try {
        const categories = await Category.find({ status: true }).sort({ name: 1 }).lean();
        res.locals.categories = categories;
    } catch (error) {
        console.error('Error loading categories for header:', error);
        res.locals.categories = [];
    }
    
    next();
});

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        const Movie = require('../models/Movie');
        
        const trendingMovies = await Movie.find({ 
            rating: { $gte: 7 } 
        }).sort({ rating: -1 }).limit(6).lean();
        

        const popularMovies = await Movie.find({ 
            poster: { $ne: null, $ne: '' } 
        }).sort({ releaseDate: -1 }).limit(6).lean();
        
        // Lấy phim recent (mới nhất)
        const recentMovies = await Movie.find({})
            .sort({ releaseDate: -1 }).limit(6).lean();
        
        // Lấy phim live (có trailer)
        const liveMovies = await Movie.find({ 
            trailerId: { $ne: null, $ne: '' } 
        }).limit(6).lean();
        
        res.render('partials/home/index', { 
            title: 'Movie Hub',
            trendingMovies: trendingMovies,
            popularMovies: popularMovies,
            recentMovies: recentMovies,
            liveMovies: liveMovies
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('partials/home/index', { 
            title: 'Movie Hub',
            trendingMovies: [],
            popularMovies: [],
            recentMovies: [],
            liveMovies: []
        });
    }
});
router.get('/blog_details', function(req, res, next) {
    res.render('blog/blog_details');
});
router.get('/error', function(req, res, next) {
    res.render('blog/error');
});

router.get('/login', function(req, res, next) {
    res.render('layouts/login');
});
//APP LOGIN
passport.use(new LocalStrategy({usernameField: 'email'}, function (email, password, done) {
    User.findOne({email: email}).then(user => {
        if (!user)
            return done(null, false, {message: 'User not found'});

        bcryptjs.compare(password, user.password, (err, matched) => {
            if (err) return err;
            if (matched) {
                return done(null, user);
            } else {
                return done(null, false, {message: 'Wrong email or password'});
            }
        });

    });
}));
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);

});

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).exec();
        done(null, user);
    } catch (err) {
        done(err); 
    }
});
router.get('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) {
            return res.status(500).send(err); 
        }
        res.redirect('/signup'); 
    });

})
router.get('/signup', function(req, res, next) {
    res.render('layouts/signup');
});
router.post('/signup', function(req, res, next) {
    let errors=[];
    if(!req.body.email){
        errors.push({message: 'Email is required'});
    }
    if(!req.body.name){
        errors.push({message: 'Name is required'});
    }
    if(!req.body.password){
        errors.push({message: 'Password is required'});
    }
    if (errors.length > 0) {
        res.render('layouts/signup', {
            title: 'Sign up',
            errors: errors,
            email: req.body.email,
            name: req.body.name,
            password: req.body.password,
        });
    }else{
        User.findOne({email: req.body.email}).then((user) => {
            if (!user){
                const newUser= new User({
                    email: req.body.email,
                    name: req.body.name,
                    password: req.body.password,
                });
                bcryptjs.genSalt(10, function (err, salt) {
                    bcryptjs.hash(newUser.password, salt, (err, hash) => {
                        newUser.password = hash;
                        newUser.save().then(saveUser => {
                            req.flash('success_message', 'Successfully registered!');
                            res.redirect('/login');
                        });
                    })
                })
            } else {
                req.flash('error_message', 'Email is exist!');
                res.redirect('/signup');
            }
        });
    }
});
module.exports = router;
