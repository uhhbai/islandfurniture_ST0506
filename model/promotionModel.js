var db = require('./databaseConfig.js');
var Promotion = require('./promotion.js');
var promotionDB = {
    getAllPromotions: function () {
        return new Promise( ( resolve, reject ) => {
            var conn = db.getConnection();
            conn.connect(function (err) {
                if (err) {
                    console.log(err);
                    conn.end();
                    return reject(err);
                }
                else {
                    var sql = 'SELECT pe.ID as id, i.SKU as sku, pe.DESCRIPTION as description, pe.DISCOUNTRATE as discountrate, pe.ENDDATE as enddate, pe.IMAGEURL as imageURL, pe.STARTDATE as startdate, pe.COUNTRY_ID as country_id, pe.ITEM_ID as item_id'
                            +' FROM itementity i, promotionentity pe WHERE pe.ENDDATE >= CURDATE() AND i.ID = pe.ITEM_ID';
                    conn.query(sql, function (err, result) {
                        if (err) {
                            conn.end();
                            return reject(err);
                        } else {
                            var promotionList = [];
                            for(var i = 0; i < result.length; i++) {
                                var promotion = new Promotion();
                                promotion.id = result[i].id;
                                promotion.description = result[i].description;
                                promotion.sku = result[i].sku;
                                promotion.discountrate = result[i].discountrate;
                                promotion.enddate = result[i].enddate;
                                promotion.imageURL = result[i].imageURL;
                                promotion.startdate = result[i].startdate;
                                promotion.country_id = result[i].country_id;
                                promotion.item_id = result[i].item_id;
                                promotionList.push(promotion);
                            }
                            conn.end();
                            return resolve(promotionList);
                        }
                    });
                }
            });
        });
    }
};
module.exports = promotionDB