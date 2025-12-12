var express = require('express');
var router = express.Router();
const User = require('../models/User');
const bcryptjs=require('bcryptjs')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

router.all('/*', (req, res, next) => {
    res.locals.layout = 'home'; // layout mặc định cho admin
    next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('partials/home/index', { title: 'Express' });
});
router.get('/blog_details', function(req, res, next) {
    res.render('blog/blog_details');
});
router.get('/blog', function(req, res, next) {
    res.render('blog/blog');
});
router.get('/anime_details', function(req, res, next) {
    res.render('blog/anime_details');
});
router.get('/anime_watching', function(req, res, next) {
    res.render('blog/anime_watching');
});
router.get('/error', function(req, res, next) {
    res.render('blog/error');
});
router.get('/categories', function(req, res, next) {
    res.render('partials/home/categories');
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
        done(null, user); // Pass the user to the done callback
    } catch (err) {
        done(err); // Pass the error to the done callback if an error occurred
    }
});
router.get('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) {
            return res.status(500).send(err); // Handle the error appropriately
        }
        res.redirect('/signup'); // Redirect after logout
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
                            res.redirect('/login');//or /login
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
router.get('/customer', function(req, res, next) {
    res.render('blog/customer');
});
router.get('/test', function(req, res, next) {
    res.render('blog/test');
});

module.exports = router;
