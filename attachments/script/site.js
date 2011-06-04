var selectedService, geoJson, db, features, citiesCache;

var app = {
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
    
    app.map = mapUtil.createMap(app.config);

    $("input[placeholder]").enablePlaceholder();

    app.map.instance.on('moveend', function() {
      app.map.showDataset("services");
    })
    
    function changeCity(name) {
      $.each(citiesCache, function(i, city) {
        if(city.name === name) {
          util.switchInfo(city);
          app.map.instance.setView(new L.LatLng(city.geometry.coordinates[1], city.geometry.coordinates[0]), 15);
        }
      })
    }

    app.map
      .fetchResource('cities')
      .then(function(data) {
        util.render('cityDropdown', 'showbar', {data: data, append: true});
        citiesCache = data.options;
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
            var wildcard = { "name": "*"+request.term+"*" };
            var postData = {
              "query": { "wildcard": wildcard },
              "fields": ["name", "_id"]
            };
            $.ajax({
              url: "http://smalldata.org:9200/social_services/social_services/_search",
              type: "POST",
              dataType: "json",
              data: JSON.stringify(postData),
              success: function( data ) {
                response( $.map( data.hits.hits, function( item ) {
                  return {
                    label: item.fields.name,
                    id: item.fields._id
                  }
                }));
              }
            });
          },
          minLength: 2,
          select: function( event, ui ) {
            $(".autocompleter").append(ui.item.id);
          },
          open: function() {
            $( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" );
          },
          close: function() {
                $( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" );
          }
        })
    });

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