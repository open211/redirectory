var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc =
  { _id:'_design/app'
  , rewrites :
    [ {from:"/", to:'index.html'}
    , {from:"/search", to:'search.html'}
    , {from:"/search/", to:'search.html'}
    , {from:"/api", to:'../../'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

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

  all : {
    map : function(doc) {
      if(doc.name) emit(doc._id, doc.name);
    }
  }

};

/*ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
};*/

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;