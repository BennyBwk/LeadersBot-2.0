const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const {mongoose} = require('../database/db.js');

const Users = mongoose.model('Users', new mongoose.Schema({
    telegram_id: String,
    username: String,
    status: String,
    tosend: String
}));

module.exports = Users;
