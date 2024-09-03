require "digest"
require "json"
require "optparse"

HASH_SAVE_FILE = "manifest.db"
MANIFEST_FILE = "manifest.json"

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: manifest_generator.rb [options]"
  opts.on("-i", "--inpath PATH", "PATH to use for analyze files and generate #{MANIFEST_FILE}") { |i| options[:inpath] = i }
  opts.on("-s", "--savepath PATH", "PATH to use for save #{HASH_SAVE_FILE}") { |s| options[:savepath] = s }
  opts.on("-v", "--verbose", "Verbose mode") { |v| options[:verbose] = v }
end.parse!

options[:inpath] ||= "."
options[:savepath] ||= "."

hashes = begin
  JSON.parse(File.read(File.join(options[:savepath], HASH_SAVE_FILE)))
rescue
  {}
end

file_entries = (Dir.glob(File.join(options[:inpath], "**/*.*")))
file_entries.delete_if { |f| File.basename(f) == MANIFEST_FILE || File.basename(f) == HASH_SAVE_FILE }

puts "Start generating manifest..." if options[:verbose]
file_entries.each do |file|
  relative_file = file.gsub(options[:inpath], "/")
  hash = Digest::SHA2.hexdigest(File.read(file))

  if hashes[relative_file].nil? || hashes[relative_file]["sha2"] != hash
    timestamp = Time.now.to_i
    hashes[relative_file] = {"sha2" => hash, "timestamp" => timestamp}
    puts "  Changes in: #{relative_file} - #{timestamp} - #{hash}" if options[:verbose]
  end
end
hashes.keep_if { |k, _| file_entries.include?(File.join(options[:inpath] ,k)) }
hashes = hashes.sort_by { |k, _| k }.to_h

manifest = {manifest: {}}
hashes.each { |k, v| manifest[:manifest][k] = v["timestamp"] }

manifest_timestamp = Time.now.to_i
manifest[:manifest]["/#{MANIFEST_FILE}"] = manifest_timestamp
manifest[:manifest] = manifest[:manifest].sort_by { |k, _| k }.to_h
puts "  Changes in: /#{MANIFEST_FILE} - #{manifest_timestamp}" if options[:verbose]

f = File.open(File.join(options[:inpath], MANIFEST_FILE), "w")
f.write(JSON.pretty_generate(manifest))
f.close

f = File.open(File.join(options[:savepath], HASH_SAVE_FILE), "w")
f.write(hashes.to_json)
f.close
puts "DONE!" if options[:verbose]
