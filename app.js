var fs  =require('fs');
var mongo = require('mongodb');
var express = require('express');
var http = require('http')
var path = require('path');

var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('wemecached1234567wemecached9987654321'));
    app.use(express.session());
    app.use(app.router);
    app.use(require('stylus').middleware(__dirname + '/public'));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

var webserver = http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

app.get('/', function (req, res){
    res.sendfile(__dirname + '/index.html');
});


var db = new mongo.Db('memedb', new mongo.Server("127.0.0.1", 27017));
db.open(function(err) {
    if(err) {
        console.log(err);
        db.close();
        process.exit(1);
    }
});

// now.js code
var everyone = require("now").initialize(webserver, {socketio: {'transports': ['xhr-polling']}});

// publish meme
everyone.now.publish = function(meme) {
    if(meme.name && meme.text.line1 && meme.text.line2) {
        db.collection('memes', function(err, collection) {
            // add a date field and save
            meme.date = Date.now();
            collection.insert(meme, function(err) {
                if(!err)
                    everyone.now.receiveMeme(meme);
            });
        });
    }
};

// retrieve the latest few memes of a name. If there is no name, retrieve a mixture
everyone.now.getRecent = function(memeName) {
    var client = this;
    console.log("retrieving");
    db.collection('memes', function(err, collection) {
        if(memeName == undefined) {
            collection.find( {}, { sort: [[ "date", "desc" ]], limit: 25 }).toArray( function(err, docs) {
                client.now.getContent(docs);
            });
        }
        else {
            collection.find( {"name": memeName}, { sort: [[ "date", "desc" ]], limit: 25 }).toArray( function(err, docs) {
                client.now.getContent(docs);
            });
        }
    });
};
