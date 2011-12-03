var couchapp = require('couchapp')
  , path = require('path')
  ;

var ddoc = { _id:'_design/zipcodes'};

ddoc.views = {

  by_zipcode : {
    map : function(doc) {
      function area(polygon) {
        var area = 0;
        // TODO: polygon holes at coordinates[1]
        var points = polygon.coordinates[0];
        var j = points.length - 1;
        var p1, p2;

        for (var i=0; i < points.length; j = i++) {
          p1 = {x: points[i][1], y: points[i][0]};
          p2 = {x: points[j][1], y: points[j][0]};
          area += p1.x * p2.y;
          area -= p1.y * p2.x;
        }

        area /= 2;
        return area;
      };

      // adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
      function centroid(polygon) {
        var f, x = 0, y = 0;
        // TODO: polygon holes at coordinates[1]
        var points = polygon.coordinates[0];
        var j = points.length - 1;
        var p1, p2;

        for (var i=0; i < points.length; j = i++) {
          p1 = {x: points[i][1], y: points[i][0]};
          p2 = {x: points[j][1], y: points[j][0]};
          f = p1.x * p2.y - p2.x * p1.y;
          x += (p1.x + p2.x) * f;
          y += (p1.y + p2.y) * f;
        }

        f = area(polygon) * 6;
        return { 'type': 'Point', 'coordinates': [y/f, x/f] };
      };

      if(doc.zipcode && doc.geometry) {
        var one_mile = 1;
        var centroid = centroid(doc.geometry);
        var lat = centroid.coordinates[1]
          , lon = centroid.coordinates[0];
        var bbox = (lon - one_mile) + "," + (lat - one_mile) + "," + (lon + one_mile) + "," + (lat + one_mile);

        emit(doc.zipcode, {centroid: centroid, bbox: bbox});
      }
    }
  }

};

module.exports = ddoc;