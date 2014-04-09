var Admin = function (options){

	var init = function (){
		addHandlers();
	};

	var addHandlers = function () {
		$('#selectfolder').click(onSelectFolder);
	};

	var onSelectFolder = function (event) {
		var selectedFolder = $("#folders option:selected").text();
		console.log(selectedFolder);

		now.setSelectedFolder(selectedFolder, function (err, selectfolderText) {
			if(err) return console.log(err);

			$('#selectedfolder').text( selectfolderText );
		});
	};

	return {
		init: init
	};
};



$(function(){
	var admin = new Admin();
	admin.init();
});


