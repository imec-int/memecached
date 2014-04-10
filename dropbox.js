var OAuth = require('oauth').OAuth;
var async = require('async');
var fs = require('fs');
var path = require('path');

var dropboxOAuth

function Dropbox(options){
	dropboxOAuth = new OAuth(
		'https://api.dropbox.com/1/oauth/request_token',
		'https://api.dropbox.com/1/oauth/access_token',
		options.app_key,
		options.app_secret,
		'1.0',
		null,
		'HMAC-SHA1'
	);
}


Dropbox.prototype.getDropboxFolders = function (dropboxuser, callback) {
	dropboxOAuth.get('https://api.dropbox.com/1/metadata/dropbox/', dropboxuser.token, dropboxuser.secret, function (err, data, res){
		if(err) return callback(err);

		data = JSON.parse(data);

		var folders = [];

		for (var i = 0; i < data.contents.length; i++) {
			if(data.contents[i].is_dir){
				folders.push(data.contents[i].path);
			}
		};

		callback(null, folders);
	});
};


Dropbox.prototype.getImages = function (dropboxuser, dropboxFolder, callback) {
	dropboxOAuth.get('https://api.dropbox.com/1/metadata/dropbox' + dropboxFolder, dropboxuser.token, dropboxuser.secret, function (err, data, res){
		if(err) return callback(err);

		data = JSON.parse(data);

		var images = [];

		for (var i = 0; i < data.contents.length; i++) {
			if(data.contents[i].mime_type == 'image/jpeg' || data.contents[i].mime_type == 'image/png' ){
				images.push(data.contents[i].path);
			}
		};

		callback(null, images);
	});
};


Dropbox.prototype.getDirectLink = function (dropboxuser, dropboxPath, callback){
	dropboxOAuth.get('https://api.dropbox.com/1/media/dropbox' + dropboxPath, dropboxuser.token, dropboxuser.secret, function (err, data, res){
		if(err) return callback(err);

		data = JSON.parse(data);

		callback(null, data.url);
	});
}

Dropbox.prototype.downwloadFile = function (dropboxuser, dropboxPath, localFolder, callback) {
	dropboxOAuth.get({url: 'https://api-content.dropbox.com/1/files/dropbox' + dropboxPath, binary: true}, dropboxuser.token, dropboxuser.secret, function (err, data, res){
		if(err) return callback(err);

		var filename = path.join(localFolder, path.basename(dropboxPath));

		fs.writeFile(filename, data, function (err) {
			if(err) return callback(err);

			callback(null, filename);
		});
	});
}

Dropbox.prototype.getAbsoluteImages = function  (dropboxuser, dropboxPath, callback) {
	var self = this;

	this.getImages(dropboxuser, dropboxPath, function (err, images) {
		if(err) return callback(err, []);

		var absoluteImages = [];

		async.eachLimit(images, 50, function (image, $) {
			self.getDirectLink(dropboxuser, image, function (err, absoluteImage) {
				if(err) return $(null); //dont stop if errors occur

				absoluteImages.push(absoluteImage);

				$();
			});
		}, function (err) {
			callback(err, absoluteImages);
		});
	});
}

Dropbox.prototype.downloadImages = function  (dropboxuser, dropboxPath, localFolder, callback) {
	var self = this;

	this.getImages(dropboxuser, dropboxPath, function (err, images) {
		if(err) return callback(err, []);

		var localImages = [];

		async.eachLimit(images, 50, function (image, $) {
			self.downwloadFile(dropboxuser, image, localFolder, function (err, localImage) {
				if(err) return $(null); //dont stop if errors occur

				localImages.push(localImage);

				$();
			});
		}, function (err) {
			callback(err, localImages);
		});
	});
}


module.exports = Dropbox;
