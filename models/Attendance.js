const {mongoose} = require('../database/db.js');

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
    name: String,
    svcattending: String,
    status: String,
    updatedby: String,
    tbc: Boolean,
    week: Number
}));

module.exports = Attendance;
