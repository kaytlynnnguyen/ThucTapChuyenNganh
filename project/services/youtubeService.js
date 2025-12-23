const axios = require('axios');

// YouTube Data API v3
// Lấy API key từ: https://console.cloud.google.com/apis/credentials
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyAAx8KX7L5AgYhci-BocdPnhZ78MF1lY3M';//youtube api key
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

/**
 * Tìm trailer YouTube cho một bộ phim
 * @param {string} movieTitle - Tên phim
 * @param {string} releaseDate - Ngày phát hành (optional)
 * @returns {Promise<Object>} - Thông tin trailer (videoId, url)
 */
async function searchTrailer(movieTitle, releaseDate = null) {
    try {
        // Tạo query search: "Movie Title year trailer"
        let query = `${movieTitle} trailer`;
        if (releaseDate) {
            // Lấy năm từ releaseDate (có thể là "2020" hoặc "2020-01-01")
            const year = releaseDate.substring(0, 4);
            if (year && year.length === 4) {
                query = `${movieTitle} ${year} trailer`;
            }
        }

        const response = await axios.get(YOUTUBE_API_URL, {
            params: {
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: 1,
                key: YOUTUBE_API_KEY,
                videoEmbeddable: true,
                videoCategoryId: '24' // Category: Entertainment (trailers thường ở đây)
            }
        });

        if (response.data.items && response.data.items.length > 0) {
            const video = response.data.items[0];
            const videoId = video.id.videoId;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;

            return {
                success: true,
                videoId: videoId,
                url: videoUrl,
                embedUrl: embedUrl,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.high.url
            };
        } else {
            return {
                success: false,
                message: 'Không tìm thấy trailer'
            };
        }
    } catch (error) {
        console.error('Lỗi khi tìm trailer YouTube:', error.message);
        
        // Nếu lỗi do API key
        if (error.response && error.response.status === 403) {
            return {
                success: false,
                message: 'YouTube API key không hợp lệ hoặc đã hết quota. Vui lòng kiểm tra lại API key.'
            };
        }

        return {
            success: false,
            message: 'Lỗi khi tìm kiếm trailer: ' + error.message
        };
    }
}

module.exports = {
    searchTrailer
};

