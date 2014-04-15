var Client = function (options){

  var resizeInt = 0;

  var init = function (){
    addHandlers();
    initCarousel();
    resize();

  };

  var addHandlers = function () {
    $( window ).resize(function() {
      clearTimeout(resizeInt);
      resizeInt = setTimeout(resize, 150);
    });
  };


  var initCarousel = function () {
    $("#owl-results").owlCarousel({

        navigation : true, // Show next and prev buttons
        pagination : false,
        slideSpeed : 300,
        paginationSpeed : 400,
        items: 3,
        itemsDesktop: [1199,2],
        itemsDesktopSmall: [979,2],
        itemsTablet: [768,1],
        itemsTabletSmall: [768,1],
        itemsMobile: [479,1],
        navigationText : ["vorige","volgende"],
        autoplay: 1500,
        stopOnHover: true

    });
  };

  var resize = function(){
    resizeCarousel();
    if(isMobileLandscape()){
      $("#owl-results-container").toggleClass("splitMobile");
      $(".wemeButton").toggleClass("splitMobile");
      log("splitMobile");
    }

  }

  var resizeCarousel = function(){
    var max = Math.max($(window).height(),$(window).width());
    $("#owl-results img").css("width", max);
    $("#owl-results img").css("height", max);
    log("resize to "+max+"x"+max);
    log("Mob Lndsc: "+isMobileLandscape());
    // console.log("resize to "+max+"x"+max);
    // $(".console").html("resize to "+max+"x"+max+" - Mobile Landscape: "+isMobileLandscape());
  };

  var isMobileLandscape = function(){
    var max = Math.max($(window).height(),$(window).width());
    return max < 640 && ($(window).width() > $(window).height());
  };

  var log = function(text){
    $(".console").append(text+"<br />");
    console.log(text);
  };

  return {
    init: init,
    landscape: isMobileLandscape
  };
};


var client;
$(function(){
  client = new Client();
  client.init();
});
