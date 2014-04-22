var Viz = function (options){

  var socket;

  var init = function (){
    addHandlers();
    initSocket();
    $('.rs-slideshow').rsfSlideshow();
  };

  var addHandlers = function () {

  };

  var initSocket = function (){
      //socket IO:
      if(!socket){
          // socket.io initialiseren
          socket = io.connect(window.location.hostname);
          // some debugging statements concerning socket.io
          socket.on('reconnecting', function(seconds){
              console.log('reconnecting in ' + seconds + ' seconds');
          });
          socket.on('reconnect', function(){
              console.log('reconnected');
          });
          socket.on('reconnect_failed', function(){
              console.log('failed to reconnect');
          });
          socket.on('new', function(data){
            console.log(data);
            var newImageURL = "images/results/"+data;
            $('#slideshow').rsfSlideshow('addSlides', [{url:newImageURL}]);
            var l = parseInt($('#slideshow').rsfSlideshow('totalSlides'))-1;
            $('#slideshow').rsfSlideshow('goToSlide', l);
          });
      }
  }

  return {
    init: init
  };
};



$(function(){
  var viz = new Viz();
  viz.init();
});
