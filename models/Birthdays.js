const {mongoose} = require('../database/db.js');

const Birthdays = mongoose.model('Birthdays', new mongoose.Schema({
    name: String,
    birthdate: String,
    age: Number
}));

module.exports = Birthdays;
