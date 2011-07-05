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
  util.switchInfo("services", id);
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
          app.map.geojson.addGeoJSON({type: "Feature", geometry: city.geometry, properties: city});
        })
      })

    $('#learnMore').click(function() {
      util.scrollDown($('#content_wrapper'));
    });
  },
  cities: function(route) {
    app.map = mapUtil.createMap({zoomControl: true, dataset: "services"});

    $("input[placeholder]").enablePlaceholder();

    app.map
      .fetchResource('cities')
      .then(function(data) {
        util.render('cityDropdown', 'showbar', {data: {options: data.docs}, append: true});
        $("#filter_select_1").sSelect();
        $('.menu li a').click(function() { util.changeCity($(this).text()) });
        $('.menu li a:first').click();
        util.bindAutocomplete($('#search'));
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