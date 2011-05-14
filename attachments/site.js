var request = function (options, callback) {
  options.success = function (obj) {
    callback(null, obj);
  };
  options.error = function (err) {
    if (err) callback(err);
    else callback(true);
  };
  if (options.data && typeof options.data == 'object') {
    options.data = JSON.stringify(options.data);
  }
  if (!options.dataType) options.processData = false;
  if (!options.dataType) options.contentType = 'application/json';
  if (!options.dataType) options.dataType = 'json';
  $.ajax(options);
};

$.expr[":"].exactly = function(obj, index, meta, stack){
  return ($(obj).text() == meta[3]);
};

var param = function( a ) {
  // Query param builder from jQuery, had to copy out to remove conversion of spaces to +
  // This is important when converting datastructures to querystrings to send to CouchDB.
	var s = [];
	if ( jQuery.isArray(a) || a.jquery ) {
		jQuery.each( a, function() { add( this.name, this.value ); });
	} else {
	  for ( var prefix in a ) { buildParams( prefix, a[prefix] ); }
	}
  return s.join("&");
	function buildParams( prefix, obj ) {
		if ( jQuery.isArray(obj) ) {
			jQuery.each( obj, function( i, v ) {
				if (  /\[\]$/.test( prefix ) ) { add( prefix, v );
				} else { buildParams( prefix + "[" + ( typeof v === "object" || jQuery.isArray(v) ? i : "") +"]", v );}
			});
		} else if (  obj != null && typeof obj === "object" ) {
			jQuery.each( obj, function( k, v ) { buildParams( prefix + "[" + k + "]", v ); });
		} else { add( prefix, obj ); }
	}
	function add( key, value ) {
		value = jQuery.isFunction(value) ? value() : value;
		s[ s.length ] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
	}
}

function showLoader() {
  $('.map_header').first().addClass('loading');  
}

function hideLoader() {
  $('.map_header').first().removeClass('loading');  
}


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
      .add(po.hash());

  map.add(po.image()
      .url(po.url("http://{S}tile.cloudmade.com"
      + "/d3394c6c242a4f26bb7dd4f7e132e5ff" // http://cloudmade.com/register
      + "/998/256/{Z}/{X}/{Y}.png")
      .repeat(false)
      .hosts(["a.", "b.", "c.", ""])));

  map.add(po.compass()
      .pan("none"));
  
  showDataset();
}

function randomColor(colors) {
  var sick_neon_colors = ["#CB3301", "#FF0066", "#FF6666", "#FEFF99", "#FFFF67", "#CCFF66", "#99FE00", "#EC8EED", "#FF99CB", "#FE349A", "#CC99FE", "#6599FF", "#03CDFF"];
  return sick_neon_colors[Math.floor(Math.random()*sick_neon_colors.length)];
};

function load(e){
  var cssObj = randColor = randomColor();
  for (var i = 0; i < e.features.length; i++) {
    var feature = e.features[i];
    if( feature.data.geometry.type == 'LineString' || feature.data.geometry.type == 'MultiLineString' ) {
      cssObj = {
        fill: 'none',
        stroke: randColor,
        strokeWidth:2,
        opacity: .9 
      }
    } else {
      cssObj = {
        fill: randColor,
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
    url: config.couchUrl + "data",
    data: {
      "bbox": bbox
    },
    success: callback
  });
}

var showDataset = function() {
  var bbox = getBB();
  showLoader();
  fetchFeatures( bbox, function( data ){
    data = JSON.parse(data);
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
    
      cnt.append($('<div/>').addClass('nub'))
      cnt.append(hdr).append(bdy) 
    
      close.click(function() {
        self.hide()
      })   

      return cnt
    }).render()    
};

var app = {};
app.index = function () {
  
};

$(function () {
  app.s = $.sammy(function () {
    // Index of all databases
    this.get('', app.index);
    this.get("#/", app.index);
  });
  app.s.run();
});
