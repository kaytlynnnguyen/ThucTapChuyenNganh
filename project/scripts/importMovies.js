const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Movie = require('../models/Movie');

// Kết nối MongoDB
mongoose.connect('mongodb://127.0.0.1/node')
    .then(() => {
        console.log("MongoDB connected successfully!");
        importMovies();
    })
    .catch(err => {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    });

function importMovies() {
    // Tìm file CSV trong thư mục gốc hoặc thư mục data
    const csvFiles = [
        path.join(__dirname, '..', 'tmdb_movies.csv'),
        path.join(__dirname, '..', 'movies.csv'),
        path.join(__dirname, '..', 'data', 'tmdb_movies.csv'),
        path.join(__dirname, '..', 'data', 'movies.csv'),
        path.join(__dirname, '..', 'imdb_movies.csv')
    ];

    let csvFile = null;
    for (const file of csvFiles) {
        if (fs.existsSync(file)) {
            csvFile = file;
            break;
        }
    }

    if (!csvFile) {
        console.error('Không tìm thấy file CSV!');
        console.log('\nVui lòng đặt file CSV vào một trong các vị trí sau:');
        csvFiles.forEach(file => console.log(`  - ${file}`));
        process.exit(1);
    }

    console.log(`Đã tìm thấy file: ${csvFile}`);
    console.log('Đang đọc file CSV...\n');

    const movies = [];
    let rowCount = 0;

    fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
            rowCount++;
            
            const movie = {
                title: row.title || row.Title || row.name || row.Name || row.original_title || '',
                overview: row.overview || row.Overview || row.plot || row.Plot || row.description || '',
                releaseDate: row.release_date || row.releaseDate || row.ReleaseDate || row.year || row.Year || '',
                genres: row.genres || row.Genres || row.genre || row.Genre || '',
                rating: parseFloat(row.rating || row.Rating || row.vote_average || row.voteAverage || row.imdbRating || '') || null,
                imgId: row.imgId || row.img_id || row.poster_path || row.posterPath || row.image || row.Image || null,
                imdbId: row.imdb_id || row.imdbId || row.imdbID || row.IMDB_ID || null
            };

            // Chỉ thêm nếu có title
            if (movie.title && movie.title.trim() !== '') {
                movies.push(movie);
            }
        })
        .on('end', async () => {
            console.log(`Đã đọc ${rowCount} dòng`);
            console.log(`Có ${movies.length} phim hợp lệ để import\n`);
            
            if (movies.length === 0) {
                console.log('Không có dữ liệu phim nào để import!');
                mongoose.connection.close();
                process.exit(0);
            }

            try {
                let imported = 0;
                let skipped = 0;
                let errors = 0;

                console.log('Đang import vào database...\n');

                for (let i = 0; i < movies.length; i++) {
                    const movieData = movies[i];
                    
                    try {
                        // Kiểm tra xem phim đã tồn tại chưa (theo title và releaseDate)
                        const existingMovie = await Movie.findOne({ 
                            title: movieData.title,
                            releaseDate: movieData.releaseDate 
                        });
                        
                        if (!existingMovie) {
                            await Movie.create(movieData);
                            imported++;
                            
                            // Hiển thị tiến trình mỗi 100 phim
                            if ((i + 1) % 100 === 0) {
                                process.stdout.write(`\rĐã xử lý: ${i + 1}/${movies.length} phim...`);
                            }
                        } else {
                            skipped++;
                        }
                    } catch (error) {
                        errors++;
                        console.error(`\nLỗi khi import phim "${movieData.title}":`, error.message);
                    }
                }

                console.log('\n');
                console.log('═══════════════════════════════════════');
                console.log('✅ HOÀN THÀNH IMPORT!');
                console.log('═══════════════════════════════════════');
                console.log(`Đã import: ${imported} phim mới`);
                console.log(`⏭ Đã bỏ qua (trùng lặp): ${skipped} phim`);
                if (errors > 0) {
                    console.log(`Lỗi: ${errors} phim`);
                }
                
                const totalMovies = await Movie.countDocuments();
                console.log(`Tổng số phim trong database: ${totalMovies}`);
                console.log('═══════════════════════════════════════\n');
                
                mongoose.connection.close();
                process.exit(0);
            } catch (error) {
                console.error('\nLỗi khi import:', error);
                mongoose.connection.close();
                process.exit(1);
            }
        })
        .on('error', (error) => {
            console.error('Lỗi khi đọc file CSV:', error);
            mongoose.connection.close();
            process.exit(1);
        });
}
