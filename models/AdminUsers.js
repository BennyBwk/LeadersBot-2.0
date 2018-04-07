const {mongoose} = require('../database/db.js');

const AdminUsers = mongoose.model('AdminUser', new mongoose.Schema({
    telegram_id: String,
    first_name: String,
    last_name: String,
    username: String,
    numberPassword: String,
    isLoggedIn: Boolean,
    cg: String
}));

module.exports = AdminUsers ;
