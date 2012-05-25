# -*- ruby -*-

$jekyll = nil

def kill_jekyll
  if $jekyll
    puts "Killing jekyll #{$jekyll}"
    Process.kill "HUP", $jekyll
    $jekill = nil
  end
end

def start_jekyll
  $jekyll = spawn "bundle exec jekyll --server"
  puts "Jekyll running on pid #{$jekyll}"
end

guard :shell do
  watch %r{^source\/.*$} do
    kill_jekyll
    start_jekyll 
  end
end

at_exit { kill_jekyll }
