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

restart = lambda { kill_jekyll; start_jekyll }

start_jekyll
at_exit { kill_jekyll }

guard 'sass', :input => 'source/css', :output => '_site/css'
guard 'coffeescript', :input => 'source/js', :output => '_site/js'
guard :shell do
  watch %r{^source/(.*\.)slim$} do |m|
    require 'slim'
     begin
      File.write "_site/#{m[1]}html", Slim::Template.new { File.read m[0] }.render(binding)
     rescue => e
        ::Guard::CoffeeScript::Formatter.error e.message
     else
       ::Guard::CoffeeScript::Formatter.success "SLIM Compiled #{m[0]}"
     end
  end
end

