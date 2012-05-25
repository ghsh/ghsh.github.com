module Jekyll
  require 'slim'
  class SlimConverter < Converter
    safe true
    priority :normal

    def matches(ext)
      ext =~ /slim/i
    end

    def output_ext(ext)
      ".html"
    end

    def convert(content)
      begin
        Slim::Template.new { content }.render binding
      rescue StandardError => e
        puts "SLIM error:" + e.message
      end
    end
  end
end
