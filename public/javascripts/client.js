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
    $("#wemeButton").click(function(){
      $("#p1").css("display","none");
      $("#p2").css("display","block");
    });
    $("#selectButton").click(function(){
      initCanvas();
      $("#p1").css("display","none");
      $("#p2").css("display","none");
      $("#p3").css("display","block");
    });
  };


  var initCarousel = function() {
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

    $("#owl-choose").owlCarousel({

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
        autoplay: false

    });
  };

  var initCanvas = function(){
    ctx = document.getElementById("memeCanvas").getContext("2d");
    // get appropriate size
    var i_w = $("#img0").width();
    var i_h = $("#img0").height();

    $("#memeCanvas").attr("width",i_w);
    $("#memeCanvas").attr("height",i_h);
    log(i_w+" - "+i_h)
    // get chosen image (from <img>)
    var img = document.getElementById("img0");
    //draw image
    ctx.drawImage(img,0,0,i_w,i_h,0,0,i_w,i_h);

    setTimeout(function(){
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 6;
      //prepare textfield
      $(".memeText").css("left", $("#memeCanvas").css("margin-left"));
      $(".memeText").css("width", i_w+"px");
      $(".memeText").change(function(){

        drawText("top", $(".memeText").val(),471,50);
        // ctx.strokeText($(this).val(), 0, 50);
        // ctx.fillText($(this).val(), 0, 50);
      });
    },100);


  };

  var drawText = function(pos, text, width, height) {
    ctx.drawImage(document.getElementById("img0"),0,0);
    log("type: "+text);
      var fontSize = 100;
      ctx.font = "bold " + fontSize + "px Arial";
      // while(1) {
      //     ctx.font = "bold " + fontSize + "px Arial";
      //     if( (ctx.measureText(text).width < (width-15)) && (fontSize < height/10) ) {
      //         break;
      //     }
      //     fontSize-=2;
      // }

      var y;
      if(pos == "top")
          y = fontSize + 15;
      else if(pos == "bottom") {
          y = height - 15;
      }
      ctx.strokeText(text, width/2, y);
      ctx.fillText(text, width/2, y);
  }

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
var ctx;

$(function(){
  client = new Client();
  client.init();
});
