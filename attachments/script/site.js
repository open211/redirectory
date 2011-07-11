var selectedService, geoJson;

var app = {
  cache: {},
  container: '#container',
  site: {config:{}}, 
  emitter: new util.Emitter(),
  config: {
  	mapCenterLat: 45.5234515,
  	mapCenterLon: -122.6762071,
  	mapStartZoom: 2,
  	baseURL: util.getBaseURL(document.location.pathname)
  }
};

app.emitter.bind('select', function(id) {
  if (!(id in app.cache['social_services'])) {
    var ajaxOpts = {
      url: app.config.baseURL + "api/social_services/" + id,
      dataType: 'json'
    }
    $.when($.ajax(ajaxOpts)).then(function(doc) {
      app.cache['social_services'][id] = doc;
      app.map.showPoint({
        type: "Feature", 
        geometry: {"type": "Point", "coordinates": [doc.longitude, doc.latitude]}, 
        properties: doc
      });
      util.switchInfo("social_services", id);
    });
  } else {
    util.switchInfo("social_services", id);    
  }
});

app.handler = function(route) {
  route = route.path.slice(1, route.path.length);
  if (route.length < 1) route = "home";
  $('li.current').removeClass('current');
  $('a[href="#'+route+'"]').parents('li').addClass('current');
  util.render( route, 'main_content' );
  window.scrollTo(0, 0);
};

app.after = {
  home: function() {
    app.map = mapUtil.createMap({scrollWheelZoom: false, dragging: false, zoomControl: false});

    app.map
      .fetchResource('cities')
      .then(function(data) {
        util.render('newCities', 'newCities', {options: data.docs});
        $.each(data.docs, function(i, city) {
          app.map.showPoint({
            type: "Feature", 
            geometry: city.geometry,
            properties: city
          });
        })
      })

    $('#learnMore').click(function() {
      util.scrollDown($('#content_wrapper'));
    });
  },
  cities: function(route) {
    app.map = mapUtil.createMap({ 
      mapCenterLat: 37.8043637, 
      mapCenterLon: -122.2711137,
    	zoomControl: true,
    	dataset: "social_services"
    });
    
    $("input[placeholder]").enablePlaceholder();

    app.map
      .fetchResource('cities')
      .then(function(data) {
        util.render('cityDropdown', 'showbar', {data: {options: data.docs}, append: true});
        $("#filter_select_1").sSelect();
        var filter = {
          "query_string" : {
            "default_field" : "city"
          }
        };
        $('.menu li a').click(function() { 
          filter.query_string.query = $(this).text();
          util.changeCity($(this).text());
        });
        $('.menu li a:first').click();
        util.bindAutocomplete($('#search'), filter);
      });
  },
  upload: function() {
    app.map = mapUtil.createMap({zoomControl: true});
    util.persist.init();
    util.bindGeocoder($('#address'));
    util.bindFormUpload($('#upload-form'));
  },
  bulkUpload: function() {
    util.persist.init();
    util.bindFormUpload($('#bulk-upload-form'));
    util.bindAttachmentUpload($('#file_upload'));
  },
  searchResults: function() {
    $('.menuOption').hover(
      function(e) { $(e.target).addClass('menuHover')}
     ,function(e) { $(e.target).removeClass('menuHover')}
    );
    $('.menuOption').click(function(e) {
      $('#search-list').empty();
      var opt = $(e.target);
      var latlng = new L.LatLng(
        opt.attr('data-lat'),
        opt.attr('data-lng'));
      app.map.instance.setView(latlng, 15);
      app.map.showDataset("social_services");
      app.emitter.emit("select", opt.attr('data-id'));
    })
  }
}

app.s = $.sammy(function () {
  this.get('', app.handler);
  this.get("#/", app.handler);
  this.get("#:route", app.handler);
});

$(function() {
  app.s.run();  
})