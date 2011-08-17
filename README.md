Redirectory for Social Services
===============================

The Redirectory is a simple solution for communities to build up a searchable service
for answering social services queries to their members with minimal overhead.

The ingredients consist of:
- A data import bridge to a simple format
- A CouchApp web application which consumes the output and structures it into a simple, easily replicated
database.
- A web application presenting a map and simple text search.
- A phone/SMS/IM service for querying the service via mobile phone or computer.

![map](http://i.imgur.com/q5qWA.png)

For more details check out the [wiki](https://github.com/open211/redirectory/wiki)

Installation
------------

open211 uses a utility written in node.js (node.couchapp.org) to push code from your computer to HTTP land. it doesn't require node.js on the server, just couchdb + elasticsearch

 install couchdb 1.1 or above, node.js and npm
 make sure "secure_rewrites" is set to false and "allow_jsonp" is set to true in your couch config
 then replicate these two couches on your couch:
 http://max.ic.ht/social_services
 http://max.ic.ht/redirectory
 npm install -g couchapp
 then do:
 couchapp push social_services.js yourcouch/social_services
 couchapp push app.js yourcouch/redirectory

 then visit yourcouch/redirectory/_design/app/_rewrite
 
 for full text search we use elasticsearch. you have to run it somewhere and use the couchdb "river" plugin to sync elasticsearch with couchdb
 
 to set up the full text search proxy we utilize couchdb 1.1's built in proxy.
 add the following tuple to httpd_global_handlers in the couch config:
 _search: {couch_httpd_proxy, handle_proxy_req, <<"YOUR_ELASTICSEARCH_URL_HERE">>}
 
 an example elasticsearch url is http://www.example.com:9200 (default port for ES is 9200)