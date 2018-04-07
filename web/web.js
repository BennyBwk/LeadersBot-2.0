// var express = require('express');
// var packageInfo = require('../package.json');
// var bodyParser = require('body-parser');
//
// var app = express();
// app.use(bodyParser.json());
//
// app.get('/', function (req, res) {
//   res.json({ version: packageInfo.version });
// });
//
//
// app.get('/test', function (req, res) {
//   res.json({ hello:"IT WORKS" });
// });
//
// app.get('/info', function (req, res) {
//   res.send("<h1>Hello There!!</h1>");
// });
//
// // var server = app.listen(process.env.PORT, "0.0.0.0", function () {
// var server = app.listen("3007", "127.0.0.1", function () {
//   var host = server.address().address;
//   var port = server.address().port;
//   console.log('Web server started at http://%s:%s', host, port);
// });
//
// module.exports = function (bot) {
//   app.post('/' + bot.token, function (req, res) {
//     bot.processUpdate(req.body);
//     res.sendStatus(200);
//   });
// };
