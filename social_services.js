var couchapp = require('couchapp')
  , path = require('path')
  ;

var ddoc = { _id:'_design/social_services'};

ddoc.views = {

  keyword : {
    map : function(doc) {
      if(doc.keywords && doc.keywords.length) {
        doc.keywords.map(function(kw) {
          emit(kw, doc._id);
        });
      }
    }
  },

  name : {
    map : function(doc) {
      if(doc.name) emit(doc._id, doc.name);
    }
  },

  district : {
    map : function(doc) {
      if(doc.district) emit(doc._id, doc.district);
    }
  }

};

ddoc.spatial = {
  by_name: function(doc) {
    if(doc.name && doc.geometry) {
      emit(doc.geometry, doc.name);
    }
  },

  full: function(doc){
  	if(doc.geometry){
  		emit(doc.geometry, doc);
  	}
  }
};

ddoc.lists = {

  geojson: function(head, req) {
      var row, out, sep = '\n';

      // Send the same Content-Type as CouchDB would
      if (req.headers.Accept.indexOf('application/json')!=-1)
        start({"headers":{"Content-Type" : "application/json"}});
      else
        start({"headers":{"Content-Type" : "text/plain"}});

      if ('callback' in req.query) send(req.query['callback'] + "(");

      send('{"type": "FeatureCollection", "features":[');
      while ((row = getRow())) {
          out = '{"type": "Feature", "geometry": ' + JSON.stringify(row.value.geometry);
          delete row.value.geometry;
          out += ', "properties": ' + JSON.stringify(row.value) + '}';

          send(sep + out);
          sep = ',\n';
      }
      send("]}");
      if ('callback' in req.query) send(")");

  },

  search : function(head, req) {
    var row;
    var content_type;
    var query;

    var normalize = function(str) {
      return str.split(' ').map(function(t) {
        return t.toLowerCase();
      });
    };

    start({
      'headers' : {
        'Content-Type' : 'application/json'
      }
    });

    if(!(query = req.query.query)) {
      send(JSON.stringify({
        'error' : 'please specify a query'
      }) + '\n');
      return;
    }
    query = normalize(query);

    var prefix = '';
    send('[');
    while((row = getRow())) {
      var terms = normalize(row.value);
      if(terms.some(function(term) {
        return (query.indexOf(term) != -1);
      })) {
        send(prefix + JSON.stringify(row.value));
        if(!prefix) prefix = ',\n';
      }
    }
    send(']');
  }

};

module.exports = ddoc;