const {mongoose} = require('../database/db.js');

const Weeks = mongoose.model('Weeks', new mongoose.Schema({
    week: Number,
    weekid: Number,
    last_updatee: String,
    last_updated: String
}));

module.exports = Weeks ;
