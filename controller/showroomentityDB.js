var express = require('express');
var router = express.Router();
var showroomModel = require('../model/showroomModel.js');

router.get('/api/showrooms', function (req, res) {
    showroomModel.getAllShowrooms()
        .then((result) => res.json(result)) // Sends the image_url to the frontend
        .catch((err) => res.status(500).send(err));
});

router.get('/api/showroom/:id', function (req, res) {
    showroomModel.getShowroomData(req.params.id)
        .then((result) => res.json(result))
        .catch((err) => res.status(500).send(err));
});

module.exports = router;