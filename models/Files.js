const {mongoose} = require('../database/db.js');

const Files = mongoose.model('Files', new mongoose.Schema({
    fileName: String,
    telegramFileId: String
}));

module.exports = Files ;
