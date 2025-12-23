const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const CatergorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: false,
        default: ''
    },
    status:{
        type: Boolean,
        required: false,
        default: true
    }
});
module.exports = mongoose.model('catergories', CatergorySchema);