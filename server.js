var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');

app.use(express.static(__dirname + '/public')); // exposes index.html, per below

// viewed at http://localhost:8080
app.get('/floorMap', function (req, res) {
    res.sendFile(path.join(__dirname + '/event-image-map.html'));
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});