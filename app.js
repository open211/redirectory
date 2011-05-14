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

ddoc.lists = {

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
        send(prefix + row.id);
        if(!prefix) prefix = ',\n';
      }
    }
    send(']');
  }

};

/*ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
};*/

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;