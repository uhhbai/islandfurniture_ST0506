var db = require('./databaseConfig.js');

var ShowroomDB = {
    // This function now gets the image_url from the Showroom table
    getShowroomData: function (id) {
        return new Promise((resolve, reject) => {
            var conn = db.getConnection();
            conn.connect((err) => {
                if (err) return reject(err);
                var sql = `
                    SELECT s.image_url, h.x_pos, h.y_pos, i.NAME, i.DESCRIPTION, i.HEIGHT, i.WIDTH, i._LENGTH, ic.RETAILPRICE, i.SKU 
                    FROM Showroom s
                    JOIN Hotspot h ON s.id = h.showroom_id
                    JOIN itementity i ON h.item_id = i.ID 
                    JOIN item_countryentity ic ON h.item_id = ic.item_id
                    WHERE s.id = ?`;
                conn.query(sql, [id], (err, result) => {
                    conn.end();
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        });
    },

    getAllShowrooms: function () {
        return new Promise((resolve, reject) => {
            var conn = db.getConnection();
            conn.connect((err) => {
                if (err) return reject(err);
                var sql = 'SELECT * FROM Showroom';
                conn.query(sql, (err, result) => {
                    conn.end();
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        });
    }
};

module.exports = ShowroomDB;