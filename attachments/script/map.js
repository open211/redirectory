var mapUtil = function() {

  function createMap(config) {

    delete app.cache.services;

    config = $.extend({
      containerId: 'mapContainer',
      mapCenterLat: 45.5234515,
    	mapCenterLon: -122.6762071,
    	mapStartZoom: 2,
    	zoomControl: true
      }, app.config, config);

    var container = $('#' + config.containerId);

    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/d3394c6c242a4f26bb7dd4f7e132e5ff/37608/256/{z}/{x}/{y}.png',
      cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
      cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttribution});

    var MarkerDot = L.Icon.extend({
      iconUrl: 'style/images/marker-dot.png',
      shadowUrl: 'style/images/marker-shadow.png',
      iconSize: new L.Point(11,11),
      shadowSize: new L.Point(0,0),
      iconAnchor: new L.Point(5,5),
      popupAnchor: new L.Point(-3, -76)
    });

    var markerDot = new MarkerDot();

    var map = new L.Map(config.containerId, config);

    map.setView(new L.LatLng(config.mapCenterLat, config.mapCenterLon), config.mapStartZoom).addLayer(cloudmade);

    if (config.dataset) {
      map.on('moveend', function() {
        showDataset(config.dataset);
      });
    }

    function listAddresses(results, status) {
      $('#address').removeClass('loading');

      var list = $('#address-list'),
          input = $('#address');

      list.empty();

      $.each(results, function(i, val) {
        var lat = val.geometry.location.lat()
          , lng = val.geometry.location.lng();
        list.append('<li data-icon="false"><a data-lat="'+lat+'" data-lng="'+lng+'"class="menuOption">' + val.formatted_address + '</a></li>');
      });

      $('.menuOption').hover(
        function(e) { $(e.target).addClass('menuHover');}
        ,function(e) { $(e.target).removeClass('menuHover');}
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
          , lng = parseFloat(loc.attr('data-lng'));
        map.setView(new L.LatLng(lat, lng), 16);
      });
    };

    function showLoader() {
      $('.map_header', container).first().addClass('loading');
    }

    function hideLoader() {
      $('.map_header', container).first().removeClass('loading');
    }

    function showPoint(feature) {
      var point = feature.geometry,
          markerLocation = new L.LatLng(parseFloat(point.coordinates[1]), parseFloat(point.coordinates[0])),
          marker = new L.Marker(markerLocation, {icon: markerDot});
      if (feature.properties) marker.properties = feature.properties;
      map.addLayer(marker);
      marker.on('click', function(e) {
        app.emitter.emit("select", e.target);
      });
    }

    function showDataset(name) {
      var bbox = getBB();
      showLoader();
      $.ajax({
        url: config.baseURL + "api/" + name + "/geo",
        dataType: 'jsonp',
        data: {bbox: bbox},
        success: function( data ) {
          if (!(name in app.cache)) app.cache[name] = {};
          _.map(data.rows, function(row) {
            if (!(row.id in app.cache[name])) {
              showPoint({
                          type: "Feature",
                          geometry: {"type": "Point", "coordinates": [row.value.longitude, row.value.latitude]},
                          properties: row.value
                        });
              app.cache[name][row.id] = row.value;
            }
          });
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
          var json = JSON.parse(data);
          util.cacheView(resource, json);
          var docs = _.map(json.rows, function(item) { return item.value; });
          return JSON.stringify({ docs: docs });
        }
      };
      return $.ajax(ajaxOpts).promise();
    }

    return {
      instance: map,
      markerDot: markerDot,
      container: container,
      config: config,
      geocoder: new google.maps.Geocoder(),
      uri: "/" + encodeURIComponent(name) + "/",
      showLoader: showLoader,
      hideLoader: hideLoader,
      showDataset: showDataset,
      showPoint: showPoint,
      fetchResource: fetchResource,
      getBB: getBB,
      listAddresses: listAddresses
    };
  }

  return {
    createMap:createMap
  };
}();