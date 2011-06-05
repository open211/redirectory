require 'rubygems'
require 'json'
require 'net/http'
require 'uri'
require 'open-uri'
require 'set'

api_host = "smalldata.org:9200"
api_uri = "http://#{api_host}/social_services/social_services/_search"

result_limit = 5

def newline_separated_file_to_set name
  things = Set.new
  open name do |f|
    f.lines.each do |thing|
      things.add thing.strip.downcase
    end
  end
  things
end

def parse_query words
  unimportant_words = ['and', 'or']
  zipcodes, keywords = words.partition {|item| item =~ /^[0-9]{5}$/}
  cities = newline_separated_file_to_set 'http://hosting.tropo.com/71814/www/city_names.txt'
  cities_for_query, keywords = keywords.partition {|item| cities.include? item.strip.downcase}
  keywords.reject! {|item| unimportant_words.include?(item)}
  return zipcodes, cities_for_query, keywords
end

unless $message
  if $currentCall.channel == "TEXT"
    input = $currentCall.initialText
    network = $currentCall.network
    words = input.split
    zipcodes, cities_for_query, keywords = parse_query words
    while zipcodes.empty? and cities_for_query.empty? and keywords.empty?
      message = "We expect input to include a ZIP code or city name (city names with spaces are unsupported currently, sorry.), along with a list of keywords to search for.  Please try again."
      words = ask(message).split
      zipcodes, cities_for_query, keywords = parse_query words
    end
    say "Searching for #{keywords.join(', ')} in #{(zipcodes + cities_for_query).join(', ')}"
    # extra_params = {
    #   :message => $currentCall.initialText,
    #   :incoming_number => $currentCall.calledID,
    #   :origin_number => $currentCall.callerID
    # }
    # bboxes = []
    # zipcodes.each do |zipcode|
    #   uri = URI.parse(api_uri + "/zip?key=" + '%22' + zipcode + '%22')
    #   zip_response = Net::HTTP.get_response(uri)
    #   results = JSON.parse(zip_response.body)
    #   bbox = results["rows"][0]["value"]["bbox"]
    #   push bboxes, bbox
    # end
    # query = keywords.join(',')
    # uri = URI.parse("#{api_uri}/search?bbox=#{bbox}&query=#{query}")
    query = {
      :wildcard => {:description => "*#{keywords[0]}*"},
      :wildcard => {:name => "*#{keywords[0]}*"}
    }.to_json.to_s
    begin
      search_response = Net::HTTP.post_form(URI.parse(api_uri), {
                                              :query => query,
                                              :fields => ["name","coordinates","_id"]
                                            })
      #say search_response.body
      results = JSON.parse(search_response.body)
      top_hits = results["hits"].first(result_limit)
      say (top_hits.collect {|hit| "#{hit.name}: #{hit.phone}"}).join("\n")
    rescue
      say "Oops! The query did not complete correctly and will be recorded for review. Thanks for your patience!"
    end
  elsif $currentCall.channel == "VOICE"
    callerID = $currentCall.callerID
    record "Welcome to the Redirectory! What problems need solving?", {
      :maxTime => 15,
      :timeout => null,
      :silenceTimeout => 3.0,
      :terminator => "#",
      :recordFormat => "audio/mp3",
      :transcriptionOutURI => "mailto:briantrice@gmail.com",
      :transcriptionOutFormat => "json",
      :transcriptionID => callerID
    }
  else
    log "Unrecognized channel"
  end
end

hangup
