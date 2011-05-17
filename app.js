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
    , {from:"/api/new_cities", to: "_view/by_city", "query" : {"descending" : true}}
    , {from:"/api", to:'../../'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {
  by_city : {
    map : function(doc) {
      if( doc.city ) {
        emit(doc.created_at, doc.city);
      }
    }
  }
}

/*ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
};*/

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;