var mysql = require('mysql');
var db_info = {
    host: '168.115.119.58',
    port: '11100',
    user: 'snipeit_rental',
    password: 'Gs-9w0Tt92@1',
    database: 'snipeit'
}

module.exports = {
    init: function () {
        return mysql.createConnection(db_info);
    },
    connect: function(conn) {
        conn.connect(function(err) {
            if(err) console.error('mysql connection error : ' + err);
            else console.log('mysql is connected successfully!');
        });
    }
}