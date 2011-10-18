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
      res.basic_auth options.user options.pass if options.user && options.pass
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

@cities = {
  "12063970792" => "Seattle",
  "14158898462" => "San Francisco",
  "14157660887" => "Oakland",
  "15035759494" => "Portland"
}

@search = Rest::Server.new "open211.org", 80
@numbers = Rest::Server.new "yourcouch", 80, {"user" => "user", "pass" => "pass"}

@number = $currentCall.callerID.to_s
@query = $currentCall.initialText.downcase
@last_search = false

def get_last_search
  res = @numbers.get "/open211_messages/" + @number
  if res.kind_of?(Net::HTTPNotFound)
    @last_search = false 
  else
    @last_search = JSON.parse res.body
  end
  @last_search
end

def update_last_search(data)
  @last_search = get_last_search unless @last_search
  new_search = @query != "next"
  data = {"page" => 1, "query" => @query} if new_search
  data['query'] = @last_search['query'] if @last_search && !new_search
  data['_rev'] = @last_search['_rev'] if @last_search
  data['_id'] = @number
  p data
  res = @numbers.post "/open211_messages/", data.to_json
  JSON.parse res.body
end

def search(query, offset)
  query_json = {
    "size" => offset.to_i,
    "query" => {
      "query_string" => {
        "fields" => ["name", "description"],
        "query" => query
      }
    },
    "filter" => {
      "query" => {
        "query_string" => {
          "default_field" => "city",
          "query" => @cities[$currentCall.calledID.to_s]
        }
      }
    }
  }
  response = @search.post "/api/search", query_json.to_json
  JSON.parse response.body
end

if $currentCall.channel == "TEXT"
  begin
    results = search(@query)
    
    if @last_search = get_last_search
      @page = @last_search['page']
    else
      @page = 1
    end

    if @query == "next"
      results = search @last_search['query'], @page
    else
      results = search @query, @page
    end

    hit = results['hits']['hits'][-1]['_source']
    response = hit['name']
    %w(phone address hours).each do |attr|
      response << ", #{hit[attr]}" if hit[attr]
    end
    say response
    
    update_last_search("page" => @page + 1, "query" => @query)
  rescue
    log "Error while processing #{$currentCall.initialText} from #{$currentCall.callerID}"
  end
end

hangup