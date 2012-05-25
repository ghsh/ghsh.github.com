(function() {
  var Typer,
    __slice = [].slice;

  Typer = (function() {
    var strip;

    strip = function(msg) {
      return msg.replace(/\n\n/g, "\r").replace(/\n/g, ' ').replace("\r", "\n");
    };

    function Typer(el, writer, between, skip, delay) {
      if (between == null) {
        between = (function() {});
      }
      if (skip == null) {
        skip = (function() {
          return false;
        });
      }
      if (delay == null) {
        delay = 50;
      }
      this.el = el;
      this.writer = writer;
      this.skip = skip;
      this.delay = delay;
      this.between = between;
    }

    Typer.prototype.type = function(text, callback) {
      var chars, writer,
        _this = this;
      if (callback == null) {
        callback = function() {};
      }
      text = strip(text);
      if (this.skip()) {
        this.between();
        this.writer(text);
        return callback(null, this);
      }
      chars = text.split('');
      writer = function() {
        _this.between();
        if (_this.skip()) {
          _this.writer(chars.join(''));
          return callback(null, _this);
        }
        if (chars.length > 0) {
          _this.writer(chars.shift());
          return setTimeout(writer, _this.delay);
        } else {
          return callback(null, _this);
        }
      };
      writer();
      return this;
    };

    return Typer;

  })();

  $.Typer = Typer;

  $.fn.type = function() {
    var args, typer,
      _this = this;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    typer = new Typer(this, function(x) {
      return $(_this).append(x);
    });
    typer.type.apply(typer, args);
    return typer;
  };

}).call(this);
