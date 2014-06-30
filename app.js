#!/usr/bin/env node

var fs  =require('fs');
var express = require('express');
var http = require('http')
var path = require('path');
var passport = require('passport');
var DropboxStrategy = require('passport-dropbox').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var Dropbox = require('./dropbox');
var config = require('./config');
var utils = require('./utils');
var socketio = require('socket.io');
var httpreq = require('httpreq');

var dropbox = new Dropbox({app_key:config.dropbox.app_key, app_secret: config.dropbox.app_secret});
var serverAddress = 'http://localhost:3000';
var passportInitialized = false;

var settings = {
	dropboxuser: {
		token: null,
		secret: null
	},
	selectedfolder: null,
	images: {},
}

var results = [];
var sourcePhotos = [];

function getSelectedFolder () {
	return (settings.selectedfolder)?settings.selectedfolder + " ("+settings.dropboxuser.displayName+"'s Dropbox)": 'none';
}

function updateSourcePhotos(){
	var files = fs.readdirSync(config.photosfolder);
	var trimmed = [];
	for(var i in files) {
		if(files[i] != ".gitignore" && files[i] != ".DS_Store"){
			console.log(files[i]);
			trimmed.push(files[i]);
		}
	}
	sourcePhotos = trimmed;
	return trimmed;
}

function updateResults(){
	var files = fs.readdirSync(config.resultsfolder);
	var trimmed = [];
	for(var i in files) {
		if(files[i] != ".gitignore" && files[i] != ".DS_Store"){
			console.log(files[i]);
			trimmed.push(files[i]);
		}
	}
	results = trimmed;
	return trimmed;
}

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('tiny'));
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

// use ejs for files with html extension
app.engine('html', require('ejs').renderFile);

app.configure('development', function(){
	app.use(express.errorHandler());
});

var webserver = http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

// Socket IO
var io = socketio.listen(webserver);
io.set('log level', 0);

io.sockets.on('connection', function (socket) {
	console.log("connection with VIZ");
});

updateResults();
updateSourcePhotos();

// Passport (Dropbox):

// eventueel sessies persisteren in database en users ook
// voorlopig: {id1: user1, id2: user2, ...}
var users = {};

function initPassport () {
	if(passportInitialized) return;


	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		done(null, (users[id] ? users[id] : null));
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
				// username is undefined in dropbox
				// username    : profile.username,
				displayName : profile.displayName
			};

			settings.dropboxuser = user;
			users[user.id] = user;
			return done(null, user);
		}
	));
	passport.use(new GoogleStrategy({
		clientID: config.google.clientId,
		clientSecret: config.google.clientSecret
	}, function (accessToken, refreshToken, profile, done){
			var user = profile._json;
			// check of er nog geen andere user (buiten google) is met dit emailadres
			user.token = accessToken;
			users[user.id] = user;
			return done(null, user);
		}
	));
	passportInitialized = true;
}


app.get('/auth/dropbox', passport.authenticate('dropbox'));

app.get('/auth/google',
	passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/userinfo.profile',
											'https://www.googleapis.com/auth/userinfo.email',
											'https://www.googleapis.com/auth/glass.timeline'],
									callbackURL: '/auth/google/callback', prompt: 'select_account'}));
// 'prompt' parameter: to force account selection on mobile: see http://stackoverflow.com/questions/14384354/force-google-account-chooser/14393492#14393492

app.get('/auth/google/callback',
	passport.authenticate('google', {failureRedirect: '/login/error', callbackURL: '/auth/google/callback'}),
	function (req, res) {
		// Successful authentication, redirect to root.
		res.redirect('/');
	}
);

app.get('/auth/dropbox/callback', passport.authenticate('dropbox', { failureRedirect: '/admin' }), function (req, res) {
	// Successful authentication:
	res.redirect('/admin');
});


app.post('/subscriptions', function(req, res){
	console.log('incoming data');
	console.log(req.body);
	if(req.body && req.body.itemId){
		console.log('getting '+req.body.itemId);
		httpreq.get('https://www.googleapis.com/mirror/v1/timeline/' + req.body.itemId, {
			headers: {
				Authorization: 'Bearer '+req.body.userToken
			}
		}, function(error, resu){
			console.log(error);
			resu = JSON.parse(resu.body);
			console.log(resu);
			if(resu.text) console.log(resu.text);
			if(resu.attachments && resu.attachments.length > 0 ){
				console.log('fetching attachments');
				for(var i=0; i<resu.attachments.length; i++){
					httpreq.get(resu.attachments[i].contentUrl, {
						headers: {
							Authorization: 'Bearer '+req.body.userToken
						},
						binary: true
					}, function(er, data){
						console.log(er);
						fs.writeFile(path.join(config.resultsfolder, 'fromglass'), data.body);
						httpreq.post('https://www.googleapis.com/upload/mirror/v1/timeline?uploadType=resumable',{
							headers: {
								Authorization: 'Bearer '+req.body.userToken,
								'X-Upload-Content-Type': 'image/jpeg'
							},
							json: { text: "Right on!"}
						}, function(error, response){
							console.log(response);
							httpreq.put(response.headers.location, {binary: true,
								headers: {'Content-Type': 'image/jpeg'},
								body: fs.readFileSync(path.join(config.resultsfolder, 'fox.jpg') )}, function(eri, resi){
									console.log(eri);
									console.log(resi);
								});
						});

					});
				}
			}
		} );
	}
	res.send(200);
});


app.get('/', function (req, res){
	serverAddress = req.protocol + "://" + req.get('host');
	initPassport();
	if(req.isAuthenticated()){
		if(isAuthorized(req.user)){
			results = updateResults();
			results.reverse();
			sourcePhotos = updateSourcePhotos();
			sourcePhotos.reverse();
			// httpreq.delete('https://www.googleapis.com/mirror/v1/contacts/timeline', {
			// 	headers: {
			// 		Authorization: 'Bearer '+req.user.token
			// 	}
			// }, function(ers, ress){console.log(ress);});
			httpreq.post('https://www.googleapis.com/mirror/v1/contacts', {
				headers: {
					Authorization: 'Bearer '+req.user.token
				},
				json: { id: 'Weme', displayName: 'Create a Weme', imageUrls: ['http://weme.mixlab.be/images/front_logo.png'] , priority: 10, sharingFeatures: ['ADD_CAPTION']}
			}, function(erro, reso){
				console.log(erro);
				console.log(reso);
				httpreq.post('https://www.googleapis.com/mirror/v1/subscriptions', {
					headers: {
						Authorization: 'Bearer '+req.user.token
					},
					// ngrok is used since we need https. Alternative is googles https proxy, but then you need a public server
					// DIRTY: don't do this for real (=setting the oauth token as the user token)
					json: {callbackUrl: 'https://2dc4970d.ngrok.com/subscriptions', collection: 'timeline', userToken: req.user.token}
				}, function(erno, resno){
					console.log(erno);
					console.log(resno);
					httpreq.get('https://www.googleapis.com/mirror/v1/subscriptions', {
						headers: {
							Authorization: 'Bearer '+req.user.token
						}

					}, function(ers, ress){
						console.log(ers);
						console.log(ress);
					});
				});

			});
			res.render('client.html', {iMindsConnected: true, resultaten: results, fotos:sourcePhotos});
		}else {
			req.logOut();
			res.redirect('/');
		}
	} else{
		res.render('client.html', {iMindsConnected: false});
	}

	//res.sendfile(__dirname + '/index.html');
	// res.sendfile(__dirname+'/public/client.html');
});

app.get('/admin', function (req, res){
	serverAddress = req.protocol + "://" + req.get('host');
	initPassport();

	var selectedfolder = getSelectedFolder();

	if(req.isAuthenticated()){
		if(!isAuthorized(req.user)) //aka user is not logged in with his iMinds google but with dropbox
			dropbox.getDropboxFolders(settings.dropboxuser, function (err, folders) {
				res.render('admin.html', {
					title: 'Mix Memer | Select Dropbox folder',
					isDropboxConnected: true,
					folders: folders,
					selectedfolder: selectedfolder
				});
			});
		else{
			req.logOut();
			res.redirect('/admin');
		}
	}else{
		res.render('admin.html', {
			title: 'Mix Memer | Select Dropbox folder',
			isDropboxConnected: false,
			folders: [],
			selectedfolder: selectedfolder
		});
	}

});

app.get('/viz', function(req, res){
	results = updateResults();
	results.reverse();
	res.render('viz.html', {results: results});
});

app.get('/logout', function(req, res){
	req.logOut();
	res.redirect('/');
});

app.post('/upload', function (req, res){
	var data = req.body.image;
	var name = req.body.name;

	console.log("RECEIVED Meme "+ name);
	var buf = new Buffer(data, 'base64');
	name = (Date.now()) + '_' + name + '.png';
	var uploadedFile = path.join(config.resultsfolder, name);
	fs.writeFile(uploadedFile, buf);

	// notify Viz page
	io.sockets.emit( 'new', name );

	res.send(200);
});

function isAuthorized(user){
	// enkel iminds.be toelaten
	if(user.email) {
		if(user.email == 'matthias.degeyter@gmail.com') return true;
		var domain = user.email.split('@')[1];
		if(domain == 'iminds.be' || domain == 'viaa.be')
			return true;
		else return false;
	}
	else return false;
}

