var mapUtil = function() {
  
  function createMap(config) {
    
    config = $.extend({
      containerId: 'mapContainer',
      mapCenterLat: 45.5234515,
    	mapCenterLon: -122.6762071,
    	mapStartZoom: 2,
    	zoomControl: true
    }, app.config, config)
    
    var container = $('#' + config.containerId);
    
    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/d3394c6c242a4f26bb7dd4f7e132e5ff/37608/256/{z}/{x}/{y}.png',
  	    cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
  	    cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttribution});
  	    
    var MarkerDot = L.Icon.extend({
      iconUrl: 'style/images/marker-dot.png',
      shadowUrl: 'style/images/marker-shadow.png',
      iconSize: new L.Point(11,11),
      shadowSize: new L.Point(0.0),
      iconAnchor: new L.Point(5,5),
      popupAnchor: new L.Point(-3, -76)
    });

    var markerDot = new MarkerDot();
        
    var geojson = new L.GeoJSON(null, {
   		pointToLayer: function(latlng) { return new L.Marker(latlng, {icon: markerDot}) }
		});
		
		geojson.on('featureparse', function(e) {
  		e.layer.on('click', function(c) { app.emitter.emit("select", e.properties._id) });
    })
    
    var map = new L.Map(config.containerId, config);
    
    map.setView(new L.LatLng(config.mapCenterLat, config.mapCenterLon), config.mapStartZoom).addLayer(cloudmade).addLayer(geojson);
    
    if (config.dataset) {
      map.on('moveend', function() {
        showDataset(config.dataset);
      }) 
    }

    // TODO scope selector
    $('.fullscreen').click(function() {
      $('.directory').toggleClass('fullscreen');
      app.map.instance.invalidateSize();
    })
    
    function listAddresses(results, status) {
      $('#address').removeClass('loading');
      
      var list = $('#address-list'),
          input = $('#address');
          
      list.empty();

      $.each(results, function(i, val) {
        var lat = val.geometry.location.lat()
          , lng = val.geometry.location.lng()
        list.append('<li data-icon="false"><a data-lat="'+lat+'" data-lng="'+lng+'"class="menuOption">' + val.formatted_address + '</a></li>');
      });
      
      $('.menuOption').hover(
        function(e) { $(e.target).addClass('menuHover')}
       ,function(e) { $(e.target).removeClass('menuHover')}
      );

      $('li', list).click(function(e) {
        list.empty();
        var loc = $(e.target);
        $('#address').val(loc.text());
        $('.crosshair').show();
        $('#map-wrapper').show();
        
        app.map.instance.on('move', function() {
          app.map.lastCoordinates = [app.map.instance.getCenter().lng, app.map.instance.getCenter().lat];
        });
             
        map.invalidateSize();          
        var lat = parseFloat(loc.attr('data-lat'))
          , lng = parseFloat(loc.attr('data-lng'))
        map.setView(new L.LatLng(lat, lng), 16);
      });
    };
    
    function showLoader() {
      $('.map_header', container).first().addClass('loading');
    }
    
    function hideLoader() {
      $('.map_header', container).first().removeClass('loading');
    }
    
    function showDataset(name) {
      var bbox = getBB();
      showLoader();
      $.ajax({
        url: config.baseURL + "api/" + name,
        dataType: 'jsonp',
        data: {bbox: bbox},
        success: function( data ) {
          if (!(name in app.cache)) app.cache[name] = {};
          data.rows.map(function(row) {
            if (!(row.id in app.cache[name])) {
              geojson.addGeoJSON({
                              type: "Feature", 
                              geometry: {"type": "Point", "coordinates": [row.value.longitude, row.value.latitude]}, 
                              properties: row.value
                            });                
              app.cache[name][row.id] = row.value;
            }
          })
          hideLoader();
        }
      });
    }
    
    function getBB(){
      var b = map.getBounds();
      return b._southWest.lng + "," + b._southWest.lat + "," + b._northEast.lng + "," + b._northEast.lat;
    }
    
    function fetchResource(resource) {
      var ajaxOpts = {
        url: config.baseURL + "api/" + resource,
        dataType: 'json',
        dataFilter: function(data) {
          var data = JSON.parse(data);
          util.cacheView(resource, data);
          var docs = _.map(data.rows, function(item) { return item.value })
          return JSON.stringify({ docs: docs });
        }
      }
      return $.ajax(ajaxOpts).promise();
    }

    return {
      instance: map,
      geojson: geojson,
      container: container,
      config: config,
      geocoder: new google.maps.Geocoder(),
      uri: "/" + encodeURIComponent(name) + "/",
      showLoader: showLoader,
      hideLoader: hideLoader,
      showDataset: showDataset,
      fetchResource: fetchResource,
      getBB: getBB,
      listAddresses: listAddresses
    }
  }

  return {
    createMap:createMap
  };
}();