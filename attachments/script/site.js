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
  	zoomControl: false,
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
    app.map = mapUtil.createMap(app.config);

    app.map
      .fetchResource('cities')
      .then(function(data) {
        util.render('newCities', 'newCities', {data: data});
        $.each(data.options, function(i, city) {
          app.map.showPoint({type: "Feature", geometry: city.geometry, properties: city});
        })
      })


    $('#learnMore').click(function() {
      util.scrollDown($('#content_wrapper'));
    });
  },
  cities: function(route) {    
    // if (route && route.params.id) {
    //   selectedService = route.params.id;
    //   render( 'cities', 'main_content' );
    //   return;
    // }
    

    $('.fullscreen').click(
      function() {
        $('.directory').toggleClass('fullscreen');
        app.map.instance.invalidateSize();
      }
    )
    
    app.map = mapUtil.createMap($.extend({}, app.config, {zoomControl: true}));

    $("input[placeholder]").enablePlaceholder();

    app.map.instance.on('moveend', function() {
      app.map.showDataset("services");
    })
    
    function changeCity(name) {
      var cities = app.cache.cities;
      $.each(cities, function(i, city) {
        if(city.name === name) {
          util.switchInfo("cities", city._id);
          app.map.instance.setView(new L.LatLng(city.geometry.coordinates[1], city.geometry.coordinates[0]), 15);
        }
      })
    }

    app.map
      .fetchResource('cities')
      .then(function(data) {
        util.render('cityDropdown', 'showbar', {data: data, append: true});
        $("#filter_select_1").sSelect();
        $('.menu li a').click(function() { changeCity($(this).text()) });

        if (selectedService) {
          $.getJSON(config.baseURL + "api/services/" + selectedService, function(doc) {
            $('.menu li a').filter(function() {
              return $(this).text() === doc.city;
            }).click();
          })
        } else {
          $('.menu li a:first').click();
        }
        
        $( "#search" ).autocomplete({
          source: function( request, response ) {
            var cityName = $('.menu li a.hiLite')[0].innerText;
            var postData = {
              "query": {
                "text": { "name" : request.term }
              },
              "fields": ["name", "coordinates", "_id"]
            };
            $.ajax({
              url: "http://smalldata.org:9200/social_services/social_services/_search",
              type: "POST",
              dataType: "json",
              data: JSON.stringify(postData),
              success: function( data ) {
                response( $.map( data.hits.hits, function( item ) {
                  return {
                    coordinates: item.fields.coordinates,
                    label: item.fields.name,
                    id: item.fields._id
                  }
                }));
              }
            });
          },
          minLength: 2,
          position: { my : "right top", at: "right bottom" },
          select: function( event, selected ) {
            var latlng = new L.LatLng(
              selected.item.coordinates[1],
              selected.item.coordinates[0]);
            app.map.instance.setView(latlng, 15);
            app.map.showDataset("services");
            app.emitter.emit("select", selected.item.id);
          },
          open: function() {
            $( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" );
          },
          close: function() {
            $( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" );
          }
        })
    });
  },
  upload: function() {
    app.map = mapUtil.createMap($.extend({}, app.config, {zoomControl: true}));
    
    if (Modernizr.localstorage) {
      util.persist.restore();

      $('.persist').keyup(function(e) {
        var inputId = $(e.target).attr('id');
        util.persist.save(inputId);
      })
    }

    $('#address').keyup(function() {
      $('#address').addClass('loading');
      util.delay(function() {
        app.map.geocoder.geocode({'address':$('#address').val()}, app.map.listAddresses);
      }, 2000)();
    });
    
    util.bindUpload($('#file_upload'));
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