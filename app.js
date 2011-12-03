var couchapp = require('couchapp')
  , path = require('path')
  ;

var ddoc =
  { "_id":"_design/app"
  , "rewrites" :
    [ {"from":"/", "to":"index.html"}
    , {"from":"/api/search", "to":"../../../_search/social_services/social_services/_search"} // github.com/open211/redirectory/wiki/Installation
    , {"from":"/api/social_services", "to":"../../../social_services"}
    , {"from":"/api/social_services/geo", "to":"../../../social_services/_design/geo/_spatial/latlon"} // github/maxogden/geocouch-utils
    , {"from":"/api/social_services/*", "to":"../../../social_services/*"}
    , {"from":"/api/cities", "to": "_spatial/cities", "query" : {"bbox": "-180,-90,180,90"}}
    , {"from":"/api", "to":"../../"}
    , {"from":"/api/*", "to":"../../*"}
    , {"from":"/*", "to":"*"}
    ]
  }
  ;

ddoc.spatial = {
  cities: function(doc) {
    if(doc.name && doc.geometry && doc.type == "city") {
      emit(doc.geometry, doc);
    }
  }
};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (oldDoc && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can modify documents on this database.";
  }
};

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;