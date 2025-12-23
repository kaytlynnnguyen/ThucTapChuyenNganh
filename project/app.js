require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
const methodOverride = require('method-override')
const {engine} = require('express-handlebars');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

app.engine('hbs',engine({
    extname: '.hbs',
    defaultLayout: 'layouts',
    partialsDir: path.join(__dirname, 'views', 'partials'),
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
        // Helper để tạo URL ảnh từ poster và imgId
        movieImage: function(poster, imgId, index) {
            // Xử lý index
            var fallbackIndex = 0;
            if (index !== undefined && index !== null) {
                fallbackIndex = parseInt(index) || 0;
            }
            
            // Ưu tiên poster từ TMDB API
            if (poster && poster !== '' && poster !== 'null' && poster !== 'undefined') {
                return poster;
            }
            
            // Fallback sang imgId nếu có
            if (imgId && imgId !== '' && imgId !== 'null' && imgId !== 'undefined') {
                imgId = String(imgId);
                
                // Nếu imgId là URL đầy đủ
                if (imgId.startsWith('http://') || imgId.startsWith('https://')) {
                    return imgId;
                }
                
                // Nếu imgId bắt đầu bằng /, có thể là TMDB path
                if (imgId.startsWith('/')) {
                    return 'https://image.tmdb.org/t/p/w500' + imgId;
                }
                
                // Nếu imgId là đường dẫn local
                return '/img/movies/' + imgId;
            }
            
            // Nếu không có gì, dùng ảnh placeholder
            return '/img/popular/popular-' + ((fallbackIndex % 6) + 1) + '.jpg';
        },
        // Helper so sánh greater than
        gt: function(a, b) {
            return a > b;
        },
        // Helper so sánh less than
        lt: function(a, b) {
            return a < b;
        },
        // Helper so sánh equal
        eq: function(a, b) {
            return a === b;
        },
        // Helper tính toán
        math: function(a, operator, b) {
            a = parseFloat(a);
            b = parseFloat(b);
            switch (operator) {
                case '+': return a + b;
                case '-': return a - b;
                case '*': return a * b;
                case '/': return a / b;
                case '%': return a % b;
                default: return 0;
            }
        },
        // Helper times (lặp)
        times: function(n, block) {
            var accum = '';
            for(var i = 0; i < n; ++i)
                accum += block.fn(i);
            return accum;
        },
        // Helper substring
        substring: function(str, start, length) {
            if (!str) return '';
            return str.substring(start, start + length);
        },
        // Helper format date
        formatDate: function(date) {
            if (!date) return '';
            return new Date(date).toLocaleDateString('vi-VN');
        }
    }
}));

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}));

app.use(methodOverride('_method'));
app.use(flash());

//PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// You might also need custom middleware to make flash messages available in templates
app.use((req, res, next) => {
    res.locals.user = req.user ? req.user.toObject() : null;
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error'); // Passport.js often uses 'error'
    res.locals.errors = req.flash('errors');
    next();
});

//load route
var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');
var userRouter = require('./routes/users');
var categoryRouter = require('./routes/categories');
var moviesRouter = require('./routes/movies');

console.log(path.join(__dirname, 'views', 'layouts'));

//view engine setup
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/users', userRouter);
app.use('/admin/category', categoryRouter);
app.use('/movies', moviesRouter);

//database mongoDB
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const {Strategy: LocalStrategy} =require('passport-local');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1/node') // No callback here
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch(err => {
        console.error("Error connecting to MongoDB:", err);
    });
//end mongoDB

// app.post('/login', (req, res) => {
//     User.findOne({email: req.body.email}).then((user) => {
//         if (user) {
//             bcryptjs.compare(req.body.password,user.password,(err,matched)=>{
//                 if(err) return err;
//                 if(matched){
//                     //res.send("User was logged in");
//                     req.session.user =
//                     {
//                         id:user._id,
//                         email:user.email,
//                     };
//                     res.redirect('/');
//                 }else {
//                     res.send("Email hoac mat khau khong dung");
//                 }
//             });
//         }else{
//             res.send("User khong ton tai");
//         }
//     })
// });

// app.post('/register',  (req,res) => {
//         console.log(req.body);
//         const newUser = new User();
//         newUser.email = req.body.email;
//         newUser.name = req.body.name;
//         newUser.password = req.body.password;
//         bcryptjs.genSalt(10, function (err, salt) {
//             bcryptjs.hash(newUser.password, salt, function (err, hash) {
//                 if (err) {return  err}
//                 newUser.password = hash;
//
//                 newUser.save().then(userSave=>
//                 {
//                     res.send('USER SAVED');
//                 }).catch(err => {
//                     res.send('USER ERROR'+err);
//                 });
//             });
//         });
//     }
// );

// app.get('/logout', (req, res) => {
//     req.session.destroy(err => {
//         if (err) return res.send("Logout error");
//         res.redirect('/login');
//     });
// });

// app.use(function(req, res, next) {
//   next(createError(404));
// });

// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('blog/error');
// });

module.exports = app;