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
  
  function show( thing ) {
    $('.' + thing ).show();
    $('.' + thing + '-overlay').show();
  }

  function hide( thing ) {
    $('.' + thing ).hide();
    $('.' + thing + '-overlay').hide();
    if (thing === "dialog") app.emitter.clear('esc'); // todo more elegant solution
  }
  
  function position( thing, elem, offset ) {
    var position = elem.offset();
    if (offset) {
      if (offset.top) position.top += offset.top;
      if (offset.left) position.left += offset.left;
    }
    $('.' + thing + '-overlay').show().click(function(e) {
      $(e.target).addClass('hidden');
      $('.' + thing).addClass('hidden');
    });
    $('.' + thing).show().css({top: position.top + elem.height(), left: position.left});
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
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
  }
  
  function switchInfo( name, id ) {
    var properties = app.cache[name][id];
    app.selectedDoc = properties;
    var data = {properties: []}
    _.each(_.keys(properties), function(prop) {
      if (_.include(["name", "description", "source"], prop)) {
        data[prop] = properties[prop];
      } else if (_.include(["_id", "_rev", "geometry", "latitude", "longitude", "type"], prop)) {
        return;
      } else {
        var formatted = {key: capitalize(prop), value: properties[prop]}
        if (_.include(["link", "website"], prop)) formatted.classStyle = "link";
        data.properties.push(formatted);
      }
    })
    if (data.properties.length > 0) data.hasProperties = true;
    util.render('sidebar', 'left', data);
  }
  
  function scrollDown(target){
    $('html, body').animate({
      scrollTop: target.offset().top
    }, 1000);
  }
  
  var bucket = {
    everything: function() {
      var list = localStorage.getItem("savedLocations");
      if (list) list = JSON.parse(list);
      if (!list) list = [];
      return list;
    },
    fetch: function(id) {
      return _.detect(bucket.everything(), function(doc){ return doc._id === id; })
    },
    add: function(newDoc) {
      var list = bucket.everything();
      if (bucket.fetch(newDoc._id)) return;
      list.push(newDoc);
      localStorage.setItem("savedLocations", JSON.stringify(list));
    },
    remove: function(id) {
      var list = _.reject(bucket.everything(), function(doc){ return doc._id === id })
      localStorage.setItem("savedLocations", JSON.stringify(list));
    },
    clear: function() { localStorage.removeItem("savedLocations") }
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
  
  function search(term, filter, options) {
    var postData = {
      "fields": ["name", "latitude", "longitude", "_id"],
      "size": 5,
      "query" : {
        "query_string" : {
          "fields" : ["name", "description"],
          "query" : term
        }
      }
    };
    if (filter) {
      postData.filter = {
        "query" : filter,
        "_cache" : true
      };
    }
    var qs = options ? '?'+$.param(options) : '';
    return $.ajax({
      url: app.config.baseURL + "api/search" + qs,
      type: "POST",
      dataType: "json",
      data: JSON.stringify(postData),
      dataFilter: function(data) {
        data = JSON.parse(data);
        var hits = $.map( data.hits.hits, function( item ) {
          return {
            longitude: item.fields.longitude,
            latitude: item.fields.latitude,
            name: item.fields.name,
            id: item.fields._id
          }
        });
        return JSON.stringify(hits);
      }
    }).promise();
  }
  
  function bindAutocomplete(input, filter) {
    input.keyup(function() {
      input.siblings('.loading').show();
      util.delay(function() {
        util.search(input.val(), filter).then(function(results) {
          input.siblings('.loading').hide();
          util.render('searchResults', 'search-list', {results: results});
        });
      }, 1000)();
    });
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
    Emitter: Emitter,
    cacheView: cacheView,
    inURL: inURL,
    show: show,
    hide: hide,
    position: position,
    render: render,
    formatMetadata:formatMetadata,
    getBaseURL:getBaseURL,
    capitalize: capitalize,
    switchInfo: switchInfo,
    scrollDown: scrollDown,
    resetForm: resetForm,
    bindGeocoder: bindGeocoder,
    bindFormUpload: bindFormUpload,
    bindAttachmentUpload: bindAttachmentUpload,
    search: search,
    bindAutocomplete: bindAutocomplete,
    delay: delay,
    bucket: bucket,
    persist: persist,
    changeCity: changeCity
  };
}();