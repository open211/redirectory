$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

function showLoader() {
  $('.map_header').first().addClass('loading');  
}

function hideLoader() {
  $('.map_header').first().removeClass('loading');  
}

var map, po, currentData, geoJson, db, config;


function createMap(config) {
  po = org.polymaps;
  geoJson = po.geoJson();
  config.mapContainer = $('div.map_container');

  var featuresCache = {};
  map = po.map()
      .container(config.mapContainer[0].appendChild(po.svg("svg")))
      .zoom(config.mapStartZoom)
      .center({lat: config.mapCenterLat, lon: config.mapCenterLon})
      .add(po.interact())

  map.add(po.image()
      .url(po.url("http://{S}tile.cloudmade.com"
      + "/d3394c6c242a4f26bb7dd4f7e132e5ff" // http://cloudmade.com/register
      + "/998/256/{Z}/{X}/{Y}.png")
      .repeat(false)
      .hosts(["a.", "b.", "c.", ""])));

  showDataset();
}


function load(e){
  var cssObj = objColor = "#AFDE41";
  for (var i = 0; i < e.features.length; i++) {
    var feature = e.features[i];
    if( feature.data.geometry.type == 'LineString' || feature.data.geometry.type == 'MultiLineString' ) {
      cssObj = {
        fill: 'none',
        stroke: objColor,
        strokeWidth:2,
        opacity: .9 
      }
    } else {
      cssObj = {
        fill: objColor,
        opacity: .9 
      }
    }
    $( feature.element )
      .css( cssObj )
  }

  var counts = {};
  $.each(e.features, function( i, feature) {
    var type = this.data.geometry.type.toLowerCase(),
        el = this.element,
        $el   = $(el),
        $cir  = $(el.firstChild),
        text  = po.svg('text'),
        props = this.data.properties,
        check = $('span.check[data-code=' + props.code + ']'),
        inact = check.hasClass('inactive');
    if(!counts[props.code]) {
      counts[props.code] = 0
    } 
    counts[props.code]++
    $el.bind('click', {props: props, geo: this.data.geometry}, onPointClick)      
    text.setAttribute("text-anchor", "middle")
    text.setAttribute("dy", ".35em")
    text.appendChild(document.createTextNode(props.code))
    el.appendChild(text)
  })
}

function fetchFeatures(bbox, callback) {
  $.ajax({
    url: "http://rectangl.es/api/_design/app/_spatiallist/geojson/full",
    dataType: 'jsonp',
    data: {bbox: "-180,-90,180,90", query: "center"},
    success: callback
  });
}

var showDataset = function() {
  var bbox = getBB();
  showLoader();
  fetchFeatures( bbox, function( data ){
    var feature = po.geoJson()
          .features( data.features )
          .on( "show", load );
    map.add( feature );
    hideLoader();
  })
}

var getBB = function(){
  return map.extent()[0].lon + "," + map.extent()[0].lat + "," + map.extent()[1].lon + "," + map.extent()[1].lat;
}

var formatMetadata = function(data) {
  out = '<dl>';
  $.each(data, function(key, val) {
    if (typeof(val) == 'string' && key[0] != '_') {
      out = out + '<dt>' + key + '<dd>' + val;
    } else if (typeof(val) == 'object' && key != "geometry" && val != null) {
      if (key == 'properties') {
        $.each(val, function(attr, value){
          out = out + '<dt>' + attr + '<dd>' + value;
        })
      } else {
        out = out + '<dt>' + key + '<dd>' + val.join(', ');
      }
    }
  });
  out = out + '</dl>';
  return out;
}

var onPointClick = function( event ) {
  var coor = event.data.geo.coordinates,
    props = event.data.props;
  if (event.data.geo.type === "Point") {
    var centroid = event.data.geo;
  } else {
    var centroid = gju.centroid(event.data.geo);
  }

  config.mapContainer
    .maptip(this)
    .map(map)
    .data(props)
    .location({lat: centroid.coordinates[1], lon: centroid.coordinates[0]})
    .classNames(function(d) {
      return d.code
    })
    .top(function(tip) {
      var point = tip.props.map.locationPoint(this.props.location)
      return parseFloat(point.y - 30)
    })
    .left(function(tip) {
      var radius = tip.target.getAttribute('r'),
          point = tip.props.map.locationPoint(this.props.location)
      return parseFloat(point.x + (radius / 2.0) + 20)
    })
    .content(function(d) {
      var self = this,
        props = d,
        cnt = $('<div/>'),
        hdr = $('<h2/>'),
        bdy = $('<p/>'),
        check = $('#sbar span[data-code=' + props.code + ']'),
        ctype = check.next().clone(),
        otype = check.closest('li.group').attr('data-code'),
        close = $('<span/>').addClass('close').text('x')

      hdr.append($('<span/>').addClass('badge').text('E').attr('data-code', otype))
        .append("properties")
        .append(ctype)
        .append(close)
        .addClass(otype) 

      bdy.html(formatMetadata(props))
      bdy.append($('<span />')
        .addClass('date')
        .text(props.properties))

      cnt.append($('<div/>'))
      cnt.append(hdr).append(bdy) 

      close.click(function() {
        self.hide()
      })   

      return cnt
    }).render()    
};


$(function() {
  
  // Should probably abstract out the couch url and the db prefix and the version and the starting map center.
  config = {
  	dbPrefix: '',
  	mapCenterLat: 42.3584308,
  	mapCenterLon: -71.0597732,
  	mapStartZoom: 14,
    db: "api", // relative vhost links defined in rewrites.json
    design: "ddoc",
    vhost: true,
    couchUrl: "",
    host: "http://" + window.location.href.split( "/" )[ 2 ],  
  };

  // vhosts are when you mask couchapps behind a pretty URL
  function inVhost() {
    var vhost = false;
    if ( document.location.pathname.indexOf( "_design" ) === -1 ) {
      vhost = true;
    }
    return vhost;
  }
  
  config.mapCenterLon = -122.6762071;
  config.mapCenterLat = 45.5234515;
  createMap(config);
  
  $("#new_message").submit(function() {
    var input = $("input[name=message]", this);
    $.getJSON('http://rectangl.es/api/zip?key="' + input.val() + '"', function(data) {
      var center = data.rows[0].value.centroid.coordinates;
      map.center({lat: center[1], lon: center[0]});
      $.getJSON('http://rectangl.es/api/search?bbox=' + data.rows[0].value.bbox + "&query=center", function(doc) {
        var list = $('.results')
        doc.map(function(d) {
          list.append('<li>' + d + '</li>');
        })
      })
    })
  });
})