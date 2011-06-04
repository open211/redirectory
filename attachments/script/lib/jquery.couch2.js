(function($) {

  window.couch = {};

  var cache = {};

  var defaults = {
    headers: {"Accept":"application/json"},
    dataType:"json",
    contentType: "application/json",
    type: "GET",
    url: "/"
  };

  couch.clearCache = function() {
    cache = {};
  };

  couch.get = function(url) {
    return makeRequest({url:url, type:'GET'});
  };

  couch.db = function(name, couchRoot) {
    if(!couchRoot) couchRoot = "";
    return {
      name: name,
      uri: couchRoot + "/" + encodeURIComponent(name) + "/",

      get: function(id) {
        return makeRequest({url:this.uri + id, type:"GET"});
      },

      put: function(id, data) {
        return makeRequest({url:this.uri + id, type:"PUT", data:data});
      },

      designDocs: function(opts) {
        return makeRequest($.extend(defaults, {
          url: this.uri + "_all_docs",
          data: {startkey:'"_design/"', endkey:'"_design0"', include_docs:true}
        }));
      }

    };
  };

})(jQuery);

