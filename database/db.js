//----DB MODULE IMPORTS------
const mongoose = require('mongoose');

//Lets connect to our database using the DB server URL.
mongoose.connect("mongodb://leadersbotdb:tB0w0oc8CUwTDHi4YgDIpZh0FjRchWZY3fThQwOvP7e04samXJKx8VzWhmOWYVfWv5AH7aG4pJVQicQq8Bpt4Q==@leadersbotdb.documents.azure.com:10255/?ssl=true");
// mongoose.connect("mongodb://localhost:27018/leadbotdb");

module.exports = {
    mongoose:mongoose
}
