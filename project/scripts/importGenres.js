require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Category = require('../models/Catergory');

// Kết nối MongoDB
mongoose.connect('mongodb://127.0.0.1/node')
    .then(() => {
        console.log("✅ MongoDB connected successfully!");
        importGenres();
    })
    .catch(err => {
        console.error("❌ Error connecting to MongoDB:", err);
        process.exit(1);
    });

async function importGenres() {
    try {
        console.log("🎬 Bắt đầu extract genres từ movies.csv...");
        
        const genresSet = new Set(); // Sử dụng Set để tránh trùng lặp
        let processedMovies = 0;
        
        // Đọc file CSV và extract genres
        const stream = fs.createReadStream('./data/movies.csv')
            .pipe(csv())
            .on('data', (row) => {
                processedMovies++;
                
                // Lấy cột genres (thường là cột thứ 4 hoặc có tên 'genres')
                const genresString = row.genres || row.Genres || row.GENRES || '';
                
                if (genresString && genresString.trim() !== '') {
                    // Split theo dấu | và thêm vào Set
                    const movieGenres = genresString.split('|');
                    movieGenres.forEach(genre => {
                        const cleanGenre = genre.trim();
                        if (cleanGenre && cleanGenre !== '') {
                            genresSet.add(cleanGenre);
                        }
                    });
                }
                
                if (processedMovies % 1000 === 0) {
                    console.log(`📊 Đã xử lý ${processedMovies} phim, tìm thấy ${genresSet.size} thể loại`);
                }
            })
            .on('end', async () => {
                console.log(`\n✅ Hoàn thành đọc CSV: ${processedMovies} phim`);
                console.log(`🎭 Tổng cộng tìm thấy ${genresSet.size} thể loại khác nhau`);
                
                // Chuyển Set thành Array và sắp xếp
                const genresArray = Array.from(genresSet).sort();
                
                console.log("\n📝 Danh sách thể loại:");
                genresArray.forEach((genre, index) => {
                    console.log(`${index + 1}. ${genre}`);
                });
                
                // Import vào MongoDB
                await importToMongoDB(genresArray);
            })
            .on('error', (error) => {
                console.error("❌ Lỗi khi đọc CSV:", error);
                process.exit(1);
            });
            
    } catch (error) {
        console.error("❌ Lỗi:", error);
        process.exit(1);
    }
}

async function importToMongoDB(genresArray) {
    try {
        console.log("\n💾 Bắt đầu import vào MongoDB...");
        
        // Xóa tất cả categories cũ (tùy chọn)
        const deleteResult = await Category.deleteMany({});
        console.log(`🗑️  Đã xóa ${deleteResult.deletedCount} categories cũ`);
        
        let imported = 0;
        let skipped = 0;
        
        for (const genreName of genresArray) {
            try {
                // Kiểm tra xem genre đã tồn tại chưa
                const existingGenre = await Category.findOne({ name: genreName });
                
                if (!existingGenre) {
                    // Tạo category mới
                    const newCategory = new Category({
                        name: genreName,
                        image: getDefaultGenreImage(genreName), // Tạo ảnh mặc định
                        status: true // Active by default
                    });
                    
                    await newCategory.save();
                    imported++;
                    
                    if (imported % 5 === 0) {
                        console.log(`📥 Đã import ${imported}/${genresArray.length} thể loại...`);
                    }
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`❌ Lỗi khi import "${genreName}":`, error.message);
            }
        }
        
        console.log(`\n🎉 Hoàn thành import!`);
        console.log(`✅ Đã import: ${imported} thể loại`);
        console.log(`⏭️  Đã bỏ qua: ${skipped} thể loại (đã tồn tại)`);
        console.log(`📊 Tổng cộng: ${imported + skipped} thể loại`);
        
        // Hiển thị một số thể loại đã import
        const sampleCategories = await Category.find().limit(10);
        console.log("\n📋 Một số thể loại đã import:");
        sampleCategories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name} (${cat.status ? 'Active' : 'Inactive'})`);
        });
        
        console.log("\n🌐 Bây giờ bạn có thể truy cập: http://localhost:3000/admin/category");
        
        mongoose.connection.close();
        process.exit(0);
        
    } catch (error) {
        console.error("❌ Lỗi khi import vào MongoDB:", error);
        process.exit(1);
    }
}

// Tạo ảnh mặc định cho từng thể loại
function getDefaultGenreImage(genreName) {
    const genreImages = {
        'Action': 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Action',
        'Adventure': 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Adventure',
        'Animation': 'https://via.placeholder.com/300x200/45B7D1/FFFFFF?text=Animation',
        'Comedy': 'https://via.placeholder.com/300x200/F9CA24/FFFFFF?text=Comedy',
        'Crime': 'https://via.placeholder.com/300x200/6C5CE7/FFFFFF?text=Crime',
        'Documentary': 'https://via.placeholder.com/300x200/A29BFE/FFFFFF?text=Documentary',
        'Drama': 'https://via.placeholder.com/300x200/FD79A8/FFFFFF?text=Drama',
        'Family': 'https://via.placeholder.com/300x200/FDCB6E/FFFFFF?text=Family',
        'Fantasy': 'https://via.placeholder.com/300x200/E17055/FFFFFF?text=Fantasy',
        'History': 'https://via.placeholder.com/300x200/81ECEC/FFFFFF?text=History',
        'Horror': 'https://via.placeholder.com/300x200/2D3436/FFFFFF?text=Horror',
        'Music': 'https://via.placeholder.com/300x200/00B894/FFFFFF?text=Music',
        'Mystery': 'https://via.placeholder.com/300x200/636E72/FFFFFF?text=Mystery',
        'Romance': 'https://via.placeholder.com/300x200/E84393/FFFFFF?text=Romance',
        'Science Fiction': 'https://via.placeholder.com/300x200/0984E3/FFFFFF?text=Sci-Fi',
        'Thriller': 'https://via.placeholder.com/300x200/D63031/FFFFFF?text=Thriller',
        'War': 'https://via.placeholder.com/300x200/74B9FF/FFFFFF?text=War',
        'Western': 'https://via.placeholder.com/300x200/BROWN/FFFFFF?text=Western'
    };
    
    return genreImages[genreName] || `https://via.placeholder.com/300x200/DDD/666?text=${encodeURIComponent(genreName)}`;
}