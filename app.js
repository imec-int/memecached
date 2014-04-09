#!/usr/bin/env node

var fs  =require('fs');
var mongo = require('mongodb');
var express = require('express');
var http = require('http')
var path = require('path');
var passport = require('passport');
var DropboxStrategy = require('passport-dropbox').Strategy;
var Dropbox = require('./dropbox');
var config = require('./config');

var dropbox = new Dropbox({app_key:config.dropbox.app_key, app_secret: config.dropbox.app_secret});
var serverAddress = 'http://localhost:3000';

var settings = {
	dropboxuser: {
		token: null,
		secret: null
	},
	selectedfolder: null,
	images: {}
}

function getSelectedFolder () {
	return (settings.selectedfolder)?settings.selectedfolder + " ("+settings.dropboxuser.displayName+"'s Dropbox)": 'none';
}

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
	app.use(passport.initialize());
	app.use(passport.session());
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


// Passport (Dropbox):

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (user, done) {
	done(null, user);
});

passport.use(new DropboxStrategy({
		consumerKey: config.dropbox.app_key,
		consumerSecret: config.dropbox.app_secret,
		callbackURL: serverAddress + "/auth/dropbox/callback"
	},
	function (token, tokenSecret, profile, done) {
		var user = {
			token       : token,
			secret      : tokenSecret,
			id          : profile.id,
			username    : profile.username,
			displayName : profile.displayName
		};

		settings.dropboxuser = user;
		console.log(settings.dropboxuser);

		return done(null, user);
	}
));


app.get('/auth/dropbox', passport.authenticate('dropbox'));

app.get('/auth/dropbox/callback', passport.authenticate('dropbox', { failureRedirect: '/admin' }), function (req, res) {
	// Successful authentication:
	res.redirect('/admin');
});


app.get('/', function (req, res){
	serverAddress = req.protocol + "://" + req.get('host');

	res.sendfile(__dirname + '/index.html');
});

app.get('/admin', function (req, res){
	serverAddress = req.protocol + "://" + req.get('host');

	var selectedfolder = getSelectedFolder();

	if(req.isAuthenticated()){
		dropbox.getDropboxFolders(settings.dropboxuser, function (err, folders) {
			res.render('admin', {
				title: 'Mix Memer | Select Dropbox folder',
				isDropboxConnected: true,
				folders: folders,
				selectedfolder: selectedfolder
			});
		})
	}else{
		res.render('admin', {
			title: 'Mix Memer | Select Dropbox folder',
			isDropboxConnected: false,
			folders: [],
			selectedfolder: selectedfolder
		});
	}

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
var everyone = require("now").initialize(webserver);

// send by the client on init:
everyone.now.init = function(callback) {
	everyone.now.populateMemePicker(settings.images);
};

// publish meme
everyone.now.publish = function(meme) {
	if(meme.name && (meme.text.line1 || meme.text.line2) ) {
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

everyone.now.setSelectedFolder = function(folder, callback) {
	console.log(folder);

	settings.selectedfolder = folder;

	callback(null, getSelectedFolder());


	// also get the images from that folder:
	// it's slow, so do it here

	dropbox.getAbsoluteImages(settings.dropboxuser, folder, function (err, images) {
		settings.images = {};

		for (var i = 0; i < images.length; i++) {
			var file = images[i];
			var name = path.basename( file );
			settings.images[file] = name;
		};

		everyone.now.populateMemePicker(settings.images);
	});
};


