var mysql = require('mysql2');
var dbconnect = {
    getConnection: function () {
        var conn = mysql.createConnection({
            host: "localhost",
            user: "it07",
            password: "root1234",
            database: "islandfurniture-it07"
        });
        return conn;
    }
};
module.exports = dbconnect