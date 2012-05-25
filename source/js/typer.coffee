  class Typer

    strip = (msg)->
      msg.replace(/\n\n/g, "\r").replace(/\n/g, ' ').replace("\r", "\n")

    constructor: (el, writer, between = (->), skip = (->false), delay = 50)->
     @el = el
     @writer = writer
     @skip = skip
     @delay = delay
     @between = between


    type: (text, callback = ->)->
      text = strip(text)
      if @skip()
        @between()
        @writer text
        return callback null, this
      chars = text.split('')
      writer = =>
        @between()
        if @skip()
          @writer chars.join('')
          return callback null, this
        if chars.length > 0
          @writer chars.shift()
          setTimeout writer, @delay
        else
          callback null, this
      writer()
      this

  $.Typer = Typer

  $.fn.type = (args...)->
    typer = new Typer(this, (x)=>$(this).append(x))
    typer.type.apply typer, args
    typer
