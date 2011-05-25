var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc =
  { _id:'_design/app'
  , rewrites :
    [ {from:"/", to:'index.html'}
    , {from:"/api/search", to:'../../../social_services/_design/social_services/_spatiallist/search/by_name'}
    , {from:"/api/services", to:'../../../social_services/_design/social_services/_spatiallist/geojson/full'}
    , {from:"/api/zip", to: "../../../zipcodes/_design/zipcodes/_view/by_zipcode"}
    , {from:"/api/cities", to: "_spatiallist/geojson/cities", "query" : {"bbox": "-180,-90,180,90"}}
    , {from:"/api", to:'../../'}
    , {from:"/api/services/*", to:'../../../social_services/*'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.spatial = { 
  cities: function(doc) {
    if(doc.name && doc.geometry) {        
      emit(doc.geometry, doc);
    }
  }
}

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
      while (row = getRow()) {
          out = '{"type": "Feature", "id": ' + JSON.stringify(row.id);
          out += ', "geometry": ' + JSON.stringify(row.value.geometry);
          out += ', "properties": ' + JSON.stringify(row.value) + '}';
          send(sep + out);
          sep = ',\n';
      }
      send("]}");
      if ('callback' in req.query) send(")");
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
};

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;