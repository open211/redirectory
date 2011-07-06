var util = function() {

  var Emitter = function() {
    this.emit = function(channel, obj) { this.trigger(channel, obj); };
  };
  MicroEvent.mixin(Emitter);

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
  
  function cacheView(view, data) {
    if (!(view in app.cache)) app.cache[view] = {};
    _.map(data.rows, function(doc) { 
      app.cache[view][doc.value._id] = doc.value;
    })
  }

  function inURL(url, str) {
    var exists = false;
    if ( url.indexOf( str ) > -1 ) {
      exists = true;
    }
    return exists;
  }

  function render( template, target, options ) {
    if ( !options ) options = {data: {}};
    if ( !options.data ) options = {data: options};
    var html = $.mustache( $( "#" + template + "Template" ).html(), options.data ),
        targetDom = $( "#" + target );
    if( options.append ) {
      targetDom.append( html );
    } else {
      targetDom.html( html );
    }
    if (template in app.after) app.after[template]();
  }

  function formatMetadata(data) {
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

  function getBaseURL(url) {
    var baseURL = "";
    if ( inURL(url, '_design') ) {
      if (inURL(url, '_rewrite')) {
        var path = url.split("#")[0];
        if (path[path.length - 1] === "/") {
          baseURL = "";
        } else {
          baseURL = '_rewrite/';
        }
      } else {
        baseURL = '_rewrite/';
      }
    }
    return baseURL;
  }
  
  function switchInfo( name, id ) {
    var properties = app.cache[name][id];
    $('.sidebar .bottom').html(formatMetadata(properties));
    $('.sidebar .title').text(properties.name);
  }
  
  function scrollDown(target){
    $('html, body').animate({
      scrollTop: target.offset().top
    }, 1000);
  }
  
  var persist = {
    restore: function() {
      $('.persist').each(function(i, el) {
        var inputId = $(el).attr('id');
        if(localStorage.getItem(inputId)) $('#' + inputId).val(localStorage.getItem(inputId));
      })
    },
    save: function(id) {
      localStorage.setItem(id, $('#' + id).val());
    },
    clear: function() {
      $('.persist').each(function(i, el) {
        localStorage.removeItem($(el).attr('id'));
      })
    },
    init: function() {
      if (Modernizr.localstorage) {
        util.persist.restore();

        $('.persist').keyup(function(e) {
          var inputId = $(e.target).attr('id');
          util.persist.save(inputId);
        })
      }
    }
  }
  
  // simple debounce adapted from underscore.js
  function delay(func, wait) {
    return function() {
      var context = this, args = arguments;
      var throttler = function() {
        delete app.timeout;
        func.apply(context, args);
      };
      if (!app.timeout) app.timeout = setTimeout(throttler, wait);      
    };
  };
  
  function resetForm(form) {
    $(':input', form)
     .not(':button, :submit, :reset, :hidden')
     .val('')
     .removeAttr('checked')
     .removeAttr('selected');
  }
  
  function bindGeocoder(input) {
    input.keyup(function() {
      input.addClass('loading');
      util.delay(function() {
        app.map.geocoder.geocode({'address':input.val()}, app.map.listAddresses);
      }, 2000)();
    });
  }
  
  function makeGeoJSON(latlngdoc) {
    return { type: "Feature", 
      geometry: {"type": "Point", "coordinates": [latlngdoc.longitude, latlngdoc.latitude]}, 
      properties: latlngdoc };
  }
  
  function bindFormUpload(form) {
    form.submit(function(e) {
      e.preventDefault();
      
      if (Modernizr.localstorage) util.persist.clear();
        
      //TODO useful validation
      // if (app.map.lastCoordinates) {
      //   alert('Please enter an address first');
      //   return;
      // }
      
      var data = form.serializeObject();
      _.map(_.keys(data), function(key) {
        if (data[key] === "") delete data[key];
      })
      
      $.extend(data, {"verified": false, "created_at": new Date()});
      if (app.map && app.map.lastCoordinates) $.extend(data, {"geometry": {"type": "Point", "coordinates": app.map.lastCoordinates}});

      var reqOpts = {
        uri: app.config.baseURL + "api",
        method: "POST",
        headers: {"Content-type": "application/json"}
      }
      
      if (app.currentDoc) {
        $.extend(reqOpts, {
          uri: app.config.baseURL + "api/" + app.currentDoc._id,
          method: "PUT"
        })
        $.extend(data, {"_rev": app.currentDoc._rev, "_attachments": app.currentDoc._attachments});
      }
      
      reqOpts.body = JSON.stringify(data);
      $.request(reqOpts, function(err, resp, body) {
        resetForm(form);
        window.scrollTo(0, 0);
        alert('Thanks! Your submission was successfully uploaded');
      })
    })
  }

  function bindAttachmentUpload(form) {
    currentFileName = {};
    uploadSequence = [];

    $.getJSON( '/_uuids', function( data ) { 
      app.docURL = app.config.baseURL + "api/" + data.uuids[ 0 ] + "/";
    });

    $( '.file_list' ).html( "" );

    var uploadSequence = [];
    uploadSequence.start = function (index, fileName, rev) {
      var next = this[index];
      currentFileName = fileName;
      var url = app.docURL + fileName;
      if (!rev && app.currentDoc && app.currentDoc._rev) var rev = app.currentDoc._rev;
      if (rev) url = url + "?rev=" + rev;
      next(url);
      this[index] = null;
    };

    form.fileUploadUI({
      multipart: false,
      uploadTable: $( '.file_list' ),
      downloadTable: $( '.file_list' ),
      buildUploadRow: function ( files, index ) {
        return $( $.mustache( $( '#uploaderTemplate' ).text(), { name: files[ index ].name } ));
      },
      buildDownloadRow: function ( file ) {
        return $( '<tr class="complete"><td class="complete">' + currentFileName + '<\/td><td></td>\/tr>' );
      },
      beforeSend: function (event, files, index, xhr, handler, callBack) {
        uploadSequence.push(function (url) {
          handler.url = url;
          callBack();
        });
        if (index === 0) {
          uploadSequence.splice(0, uploadSequence.length - 1);
        }
        if (index + 1 === files.length) {
          uploadSequence.start(0, files[ index ].fileName);
        }
      },
      onComplete: function (event, files, index, xhr, handler) {
        var nextUpload = uploadSequence[ index + 1 ];
        if ( nextUpload ) {
          uploadSequence.start( index + 1, files[ index ].fileName, handler.response.rev);
        } else {
          var reqOpts = {
            uri: app.config.baseURL + "api/" + handler.response.id,
            headers: {"Content-type": "application/json"}
          }
          $.request(reqOpts, function(err, resp, body) {
            app.currentDoc = JSON.parse(body);
          })
        }
      },
      onAbort: function (event, files, index, xhr, handler) {
        handler.removeNode(handler.uploadRow);
        uploadSequence[index] = null;
        uploadSequence.start(index + 1, handler.url);
      }
    });
  }
  
  function bindAutocomplete(input) {
    input.autocomplete({
      source: function( request, response ) {
        var cityName = $('.menu li a.hiLite')[0].innerText;
        var postData = {
          "query": {
            "text": { "name" : request.term }
          },
          "fields": ["name", "latitude", "longitude", "_id"]
        };
        $.ajax({
          url: config.baseURL + "api/_search",
          type: "POST",
          dataType: "json",
          data: JSON.stringify(postData),
          success: function( searchData ) {
            response( $.map( searchData.hits.hits, function( item ) {
              return {
                coordinates: [item.fields.longitude, item.fields.latitude],
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
  }
  
  function changeCity(name) {
    var cities = app.cache.cities;
    $.each(cities, function(i, city) {
      if(city.name === name) {
        util.switchInfo("cities", city._id);
        app.map.instance.setView(new L.LatLng(city.geometry.coordinates[1], city.geometry.coordinates[0]), 15);
      }
    })
  }
  
  return {
    Emitter:Emitter,
    cacheView: cacheView,
    inURL: inURL,
    render: render,
    formatMetadata:formatMetadata,
    getBaseURL:getBaseURL,
    switchInfo: switchInfo,
    scrollDown: scrollDown,
    resetForm: resetForm,
    makeGeoJSON: makeGeoJSON,
    bindGeocoder: bindGeocoder,
    bindFormUpload: bindFormUpload,
    bindAttachmentUpload: bindAttachmentUpload,
    bindAutocomplete: bindAutocomplete,
    delay: delay,
    persist: persist,
    changeCity: changeCity
  };
}();