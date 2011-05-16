require 'rubygems'
require 'json'
require 'net/http'
require 'uri'

outbound = !!$message

api_host = "rectangl.es"
api_uri = "http://#{api_host}/api"

result_limit = 5

unless outbound
  if $currentCall.channel == "TEXT"
    input = $currentCall.initialText
    network = $currentCall.network
    zipcode = ''
    bbox = ''
    words = input.split(' ')
    unimportant_words = ['and', 'or']
    words.each do |item|
      if item =~ /^[0-9]{5}$/
        zipcode = item
      end
    end
    keywords = words.reject do |item|
      unimportant_words.include?(item) || item == zipcode
    end
    unless network == 'SMS'
      say "Welcome to the Redirectory! Finding " + keywords.join(", ") + " in ZIP: #{zipcode}"
    end
    #extra_params = {
    #  :message => $currentCall.initialText,
    #  :incoming_number => $currentCall.calledID,
    #  :origin_number => $currentCall.callerID
    #}
    uri = URI.parse(api_uri + "/zip?key=" + '%22' + zipcode + '%22')
    unless zipcode.empty?
      zip_response = Net::HTTP.get_response(uri)
      results = JSON.parse(zip_response.body)
      bbox = results["rows"][0]["value"]["bbox"]
    end
    query = keywords.join(',')
    uri = URI.parse("#{api_uri}/search?bbox=#{bbox}&query=#{query}")
    search_response = Net::HTTP.get_response(uri)
    results = JSON.parse(search_response.body)
    say results["rows"].first(result_limit).join("\n")
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
