require 'rubygems'
require 'net/http'
require 'json'

module Rest
  # from http://wiki.apache.org/couchdb/Getting_started_with_Ruby
  class Server
    def initialize(host, port, options = nil)
      @host = host
      @port = port
      @options = options
    end

    def get(uri)
      request(Net::HTTP::Get.new(uri))
    end

    def put(uri, json)
      req = Net::HTTP::Put.new(uri)
      req["content-type"] = "application/json"
      req.body = json
      request(req)
    end

    def post(uri, json)
      req = Net::HTTP::Post.new(uri)
      req["content-type"] = "application/json"
      req.body = json
      request(req)
    end

    def request(req)
      res = Net::HTTP.start(@host, @port) { |http|http.request(req) }
      unless res.kind_of?(Net::HTTPSuccess)
        handle_error(req, res)
      end
      res
    end

    private

    def handle_error(req, res)
      log "ERROR! #{res.code}:#{res.message}\nMETHOD:#{req.method}\nURI:#{req.path}\n#{res.body}"
    end
  end
end

@api_host = "open211.org"
@search = Rest::Server.new @api_host, 80

def search(query)
  query_json = {
    "size" => 5,
    "query" => {
      "query_string" => {
          "fields" => ["name", "description"],
          "query" => query
      }
    }
  }.to_json
  response = @search.post "/api/search", query_json
  JSON.parse response.body
end

unless $message
  if $currentCall.channel == "TEXT"
    input = $currentCall.initialText
    network = $currentCall.network
    begin
      results = search(input)
      hit = results['hits']['hits'][0]['_source']
      response = hit['name']
      %w(phone address hours).each do |attr|
        response << ", #{hit[attr]}" if hit[attr]
      end
      say response
    rescue
      log "Error while processing #{$currentCall.initialText} from #{$currentCall.callerID}"
    end
  end
end

hangup