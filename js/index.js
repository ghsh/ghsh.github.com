(function() {
  var __hasProp = {}.hasOwnProperty;

  $(function() {
    var blink, boot, createEditor, github, intro, repl, skip, term, typer,
      _this = this;
    console.log("INITING !!");
    github = {};
    github.api = null;
    github.user = ko.observable();
    skip = $('a.skip');
    skip.onp = function() {
      return this.data('skip');
    };
    skip.end = function() {
      return this.hide('fast').data('skip', false);
    };
    skip.start = function() {
      return this.show('fast').data('skip', false);
    };
    skip.click(function() {
      return $(this).hide('fast').data('skip', true);
    });
    term = $('#console').jqconsole('', '>>> ', '... ');
    $('#console').data('term', term);
    blink = function() {
      if (!$('#console .jqconsole:first').is('.jqconsole-blurred')) {
        return $('#console .jqconsole-cursor:first').toggleClass('blink');
      }
    };
    setInterval(blink, 400);
    term.$prompt_label.text = term.$prompt_label.html;
    term.puts = function(html, cls) {
      if (cls == null) {
        cls = '';
      }
      return term.Write(html, cls, false);
    };
    term.ret = function() {
      return $('#console textarea').trigger($.Event('keydown', {
        preventDefault: (function() {}),
        ctrlKey: false,
        which: 13,
        keyCode: 13
      }));
    };
    term.update_prompt = function() {
      var nick, path, prompt, u;
      prompt = ['$'];
      if (github.fs.pwd()) {
        path = github.fs.pwd().canonicalPath();
        if (github.user() && path === ("/github/" + (github.user().login))) {
          path = "~";
        } else {
          path = github.fs.pwd().path;
        }
        prompt.unshift("<span class='path-pwd'>" + path + "</span>");
        prompt.unshift("<span class='path-separator'>:</span>");
      }
      if (github.user()) {
        u = github.user();
        nick = github.user().login;
        prompt.unshift("<a href='#' data-cmd='whoami' class='typer cmd " + (!u.email || !u.name ? 'warn' : void 0) + "'>" + u.login + "</a>");
      }
      if (term.prompt_label_main) {
        return term.prompt_label_main = prompt.join(' ') + ' ';
      }
    };
    typer = function(at, enableSkip) {
      var el, writer;
      if (enableSkip == null) {
        enableSkip = true;
      }
      if (enableSkip) {
        skip.start();
      }
      if (at === null) {
        el = null;
        term.ClearPromptText();
        writer = function(x) {
          return term.SetPromptText(term.GetPromptText() + x);
        };
      } else if (at === term) {
        el = $('<div class="jqconsole-output"></div>').insertBefore('#console .jqconsole-input');
        writer = _.bind(el.append, el);
      } else {
        el = $(at);
        writer = _.bind(el.append, el);
      }
      return new $.Typer(el, writer, _.bind(term.Focus, term), _.bind(skip.onp, skip));
    };
    repl = function(err) {
      if (err) {
        term.Write(err + "\n", 'jqconsole-output-error');
      }
      return term.Prompt(true, function(input) {
        var cmd;
        if (input.trim() === '') {
          return repl();
        }
        try {
          cmd = CmdParse.parse(input);
        } catch (e) {
          return repl("error parsing command line: " + e.message);
        }
        return repl.execute(cmd.slice(0), repl);
      });
    };
    repl.execute = function(cmd, cb) {
      var exec, prog;
      prog = cmd[0];
      exec = repl.state[prog] || repl.command[prog] || repl.unknown(prog);
      return exec.apply(exec, [cmd.slice(1), cb]);
    };
    repl.state = {};
    repl.command = {};
    repl.unknown = function(prog) {
      return function(cmd, cb) {
        return cb("command not found: " + prog + "\n");
      };
    };
    repl.command.clear = function(cmd, cb) {
      $('#console .jqconsole-prompt').siblings().hide();
      return cb();
    };
    repl.command.help = function(cmd, cb) {
      var cmds;
      cmds = _.map(_.keys(repl.command), function(c) {
        return "<span class='path-separator'>" + c + "</b>";
      }).join(' ');
      term.Write("<h1>Help<h1><p>Available commands:<br/> " + cmds + "</p>", '', false);
      return cb();
    };
    repl.command.git = function(cmd, cb) {
      return github.gitCmd(cmd, cb);
    };
    repl.command.hub = function(cmd, cb) {
      return github.hubCmd(cmd, cb);
    };
    repl.command.logout = function(cmd, cb) {
      return auth.logout();
    };
    repl.command.whoami = function(cmd, cb) {
      var u, v;
      if (github.user()) {
        u = github.user();
        term.Write("<a href='" + u.html_url + "'><img src='" + u.avatar_url + "'/></a><br/>", '', false);
        v = u.name && u.name !== '' ? "<a href='" + u.html_url + "' target='_blank'>" + u.name + "</a>" : "No name configured. ";
        term.Write("<span>" + v + " <a href='#' class='btn btn-inverse btn-ninja git-config-global' data-set='user.name'>change</a></span>\n", '', false);
        v = u.email && u.email !== '' ? "" + u.email : "No email configured. ";
        term.Write("<span>" + v + " <a href='#' class='btn btn-inverse btn-ninja git-config-global' data-set='user.email'>change</a></span>\n", '', false);
      } else {
        term.Write("Anonymous\n");
      }
      return cb();
    };
    $(document).on('click', 'a.typer.cmd', function(event) {
      event.preventDefault();
      event.stopPropagation();
      return typer(null).type($(this).attr('data-cmd') || $(this).text(), function() {
        return term.ret();
      });
    });
    github.gitCmd = function(argv, cb) {
      var cmd;
      if (typeof argv[0] === 'string') {
        cmd = github.gitCmd[argv[0]] || repl.unknown("git " + argv[0]);
        return cmd.apply(cmd, [argv.slice(1), cb]);
      } else {
        return cb();
      }
    };
    github.hubCmd = function(argv, cb) {
      var cmd;
      if (typeof argv[0] === 'string') {
        cmd = github.hubCmd[argv[0]] || github.gitCmd[argv[0]] || repl.unknown("hub " + argv[0]);
        return cmd.apply(cmd, [argv.slice(1), cb]);
      } else {
        return cb();
      }
    };
    github.userAttr = function(attr) {
      return {
        puts: function(cb) {
          term.Write("" + (github.user()[attr]) + "\n");
          return cb();
        },
        get: function() {
          return github.user()[attr];
        },
        set: function(value, cb) {
          var obj;
          obj = {};
          obj[attr] = value;
          return github.api.patch("user", obj, function(e, d) {
            if (e) {
              return cb("Error " + e);
            } else {
              github.user(d);
              return cb();
            }
          });
        }
      };
    };
    github.userAttr["user.name"] = github.userAttr('name');
    github.userAttr["user.email"] = github.userAttr('email');
    github.userAttr["user.blog"] = github.userAttr('blog');
    github.userAttr["user.bio"] = github.userAttr('bio');
    github.userAttr["user.company"] = github.userAttr('company');
    github.userAttr["user.location"] = github.userAttr('location');
    github.userAttr["user.hireable"] = github.userAttr('hireable');
    github.gitCmd.config = function(argv, cb) {
      var a, args, attr, name, opts, _ref;
      opts = {
        global: false
      };
      args = [];
      while (argv.length > 0) {
        a = argv.shift();
        if (a.long || a.short) {
          switch (a.long || a.short) {
            case "global":
              opts.global = true;
              break;
            default:
              cb("Bad option: git config " + (a.long || a.short));
          }
        } else {
          args.push(a);
        }
      }
      if (args.length > 1) {
        return github.userAttr[args[0]].set(args[1], cb);
      } else if (args.length === 1) {
        return github.userAttr[args[0]].puts(cb);
      } else {
        _ref = github.userAttr;
        for (name in _ref) {
          if (!__hasProp.call(_ref, name)) continue;
          attr = _ref[name];
          term.Write("" + name + " = " + (attr.get()) + "  <a href='#' class='btn btn-inverse btn-ninja git-config-global' data-set='" + name + "'>change</a>\n", '', false);
        }
        return cb();
      }
    };
    $(document).on('click', 'a.btn.git-config-global', function(event) {
      var attr;
      event.preventDefault();
      event.stopPropagation();
      attr = $(this).attr('data-set');
      return typer(null).type("git config --global " + attr + " \"\"", function() {
        var t;
        term._MoveLeft(false);
        t = $('<span/>').insertBefore('.jqconsole-cursor').tooltip({
          title: "Write your " + attr + " and hit enter",
          animation: true,
          placement: 'top'
        });
        t.tooltip('show');
        return setTimeout(_.bind(t.tooltip, t, 'hide'), 5000);
      });
    });
    github.user.subscribe(function(user) {
      github.fs(user);
      if (!user) {
        return;
      }
      return term.update_prompt();
    });
    intro = function(cb) {
      term.Write("Welcome <a href='#' data-cmd='whoami' class='typer cmd'>" + (github.user().login) + "</a>\n", '', false);
      return cb();
    };
    github.fs = function(user) {
      var home, root;
      root = GitHub.FS.treeJSON(github.api, {
        path: '/'
      });
      github.fs.root(root);
      if (!user) {
        return github.fs.pwd(github.fs.root());
      }
      _.extend(root.mkdir('gists'), GitHub.FS.UserGists);
      home = root.mkdir('github').mkdir(user.login);
      _.extend(home, GitHub.FS.UserRepos);
      return github.fs.pwd(home);
    };
    github.fs.root = ko.observable();
    github.fs.pwd = ko.observable();
    github.fs.pwd.subscribe(function() {
      return term.update_prompt();
    });
    repl.command.pwd = function(cmd, cb) {
      var path;
      path = github.fs.pwd().canonicalPath();
      term.Write(path + "\n");
      return cb();
    };
    repl.command.ls = function(cmd, cb) {
      return github.fs.pwd().resolve(function(e, dir) {
        if (e) {
          return cb(e);
        }
        if (typeof cmd[0] === 'string') {
          dir = dir.find(cmd[0]);
        }
        if (!dir) {
          return cb("No such file or directory: " + cmd[0]);
        }
        return dir.resolve(function(e, dir) {
          var dir_cls, k, sep, v, _ref;
          if (e) {
            return cb(e);
          }
          if (dir.named) {
            sep = "<br/>";
            term.Write("<a href='#./' class='ls-dir'>./</a>" + sep, '', false);
            if (dir.parent) {
              term.Write("<a href='#../' class='ls-dir'>../</a>" + sep, '', false);
            }
            _ref = dir.named;
            for (k in _ref) {
              if (!__hasProp.call(_ref, k)) continue;
              v = _ref[k];
              if (v.child) {
                dir_cls = v.repo ? "ls-repo" : "ls-dir";
                term.Write("<a href='#" + k + "' class='" + dir_cls + "'>" + k + "/</a>" + sep, '', false);
              } else if (v.link) {
                term.Write("<a href='#" + k + "' class='ls-link'>" + k + "</a> -> <a href='#" + (v.link.canonicalPath()) + "' class='ls-link-dest'>" + (v.link.canonicalPath()) + "</a>" + sep, '', false);
              } else {
                term.Write("<a href='#" + k + "' class='ls-file'>" + k + "</a>" + sep, '', false);
              }
            }
          } else {
            term.Write("" + dir.mode + " " + cmd[0] + "  " + dir.size + "kB " + dir.sha + "\n");
          }
          return cb();
        });
      });
    };
    repl.command.mkdir = function(cmd, cb) {
      return github.fs.pwd().resolve(function(e, here) {
        var dir, name;
        name = cmd[0];
        if (here.find(name)) {
          return cb("Existing file or directory: " + name);
        }
        dir = here.mkdir(name);
        return cb();
      });
    };
    repl.command.cd = function(cmd, cb) {
      var cd, dir,
        _this = this;
      dir = null;
      if (cmd.length === 0 || cmd[0] === "~") {
        dir = github.fs.root();
      } else if (cmd[0] === "-") {
        dir = this.stack.shift() || pwd();
      }
      cd = function(dir) {
        if (_this.stack[0] !== dir) {
          _this.stack.unshift(dir);
        }
        github.fs.pwd(dir);
        return cb();
      };
      if (dir) {
        return cd(dir);
      } else {
        return github.fs.pwd().resolve(function(e, dir) {
          dir = dir.find(cmd[0]);
          if (dir && dir.type !== 'blob') {
            return cd(dir);
          } else {
            return cb("No such directory: " + cmd[0]);
          }
        });
      }
    };
    repl.command.cd.stack = [];
    repl.command.cat = function(cmd, cb) {
      return github.fs.pwd().resolve(function(e, dir) {
        var file;
        if (e) {
          return cb(e);
        }
        file = dir.find(cmd[0]);
        if (!file || file.named) {
          return cb("No such file: " + cmd[0]);
        } else {
          return file.cat(function(err, content) {
            if (err) {
              return cb(err);
            }
            if (window.hljs) {
              content = hljs.highlightAuto(content).value;
            }
            term.Write("<div class='hero-unit cat'>" + content + "</div>", "", false);
            term.Write("\n");
            return cb();
          });
        }
      });
    };
    createEditor = function(cmd, config, cb) {
      if (config == null) {
        config = {};
      }
      return github.fs.pwd().resolve(function(err, dir) {
        var file;
        if (err) {
          return cb(err);
        }
        file = dir.find(cmd[0]);
        if (!file || file.named) {
          return cb("No such file: " + cmd[0]);
        } else {
          return file.cat(function(err, content) {
            var editor, lang, place;
            if (err) {
              return cb(err);
            }
            lang = null;
            if (window.hljs) {
              lang = hljs.highlightAuto(content).language;
            }
            term.Write("<div class='hero-unit' editor></div>", "jqterminal-editor", false);
            place = $('.jqterminal-editor:last div.hero-unit');
            config.value = content;
            config.theme = 'monokai';
            config.mode = lang || "clike";
            config.autofocus = true;
            config.lineNumbers = true;
            config.onFocus = function() {
              return term.Disable();
            };
            config.onBlur = function() {
              return term.Enable();
            };
            term.Disable();
            editor = CodeMirror(place[0], config);
            return cb();
          });
        }
      });
    };
    repl.command.edit = function(cmd, cb) {
      return createEditor(cmd, {}, cb);
    };
    repl.command.vi = function(cmd, cb) {
      return createEditor(cmd, {
        keyMap: "vim"
      }, cb);
    };
    repl.command.vim = repl.command.vi;
    repl.command.emacs = function(cmd, cb) {
      return createEditor(cmd, {
        keyMap: "emacs"
      }, cb);
    };
    github.gitCmd.init = function(cmd, cb) {
      return github.fs.pwd().resolve(function(err, dir) {
        var here, must, warn;
        if (err) {
          return cb(err);
        }
        if (dir.repo) {
          return cb("Already a git repo.");
        }
        here = dir.canonicalPath().split('/').slice(0, -1).join('/');
        must = "/github/" + github.api.user.login;
        warn = "Only subdirs of " + must + " can be turned into a git repo.";
        if (here !== must) {
          return cb(warn);
        }
        term.Write("<span class='jqconsole-output-warn'>Attention</span>. This will create a repository on your <b>GitHub</b> account.\n", '', false);
        term.Write("Do you really want to continue? [y/N]");
        return term.Input(function(input) {
          var chooseName, choosePrivate, createRepo, opts, setDescription, setHomepage;
          if (input.toLowerCase() !== "y") {
            return cb();
          }
          opts = {};
          chooseName = function() {
            term.Write("Repository name: [<span class='path-pwd'>" + dir.path + "</span>]", '', false);
            return term.Input(function(input) {
              input = input.trim();
              if (input !== "") {
                if (dir.parent.find(input)) {
                  term.Write("A directory already exists with that name.\n", 'jqconsole-output-warn', false);
                  return chooseName();
                }
                if (input !== dir.path) {
                  term.Write("Renaming directory " + dir.path + " to " + input + "\n");
                  dir.path = input;
                  delete dir.parent.named[dir.path];
                  dir.parent.named[input] = dir;
                  github.fs.pwd(dir);
                  return chooseName.next();
                }
              }
              return chooseName.next();
            });
          };
          setDescription = function() {
            opts.name = dir.path;
            term.Write("Repository description:");
            return term.Input(function(input) {
              input = input.trim();
              if (input !== "") {
                opts.description = input;
              }
              return setDescription.next();
            });
          };
          setHomepage = function() {
            term.Write("Repository homepage:");
            return term.Input(function(input) {
              input = input.trim();
              if (input !== "") {
                opts.homepage = input;
              }
              return setHomepage.next();
            });
          };
          choosePrivate = function() {
            term.Write("Create as private: [y/N]");
            return term.Input(function(input) {
              input = input.trim();
              if (input.toLowerCase() === 'y') {
                opts["private"] = true;
              }
              return choosePrivate.next();
            });
          };
          createRepo = function() {
            var at;
            at = "" + github.api.user.login + "/" + dir.path;
            at = "<a href='http://github.com/" + at + "' target='_blank'>" + at + "</a>";
            return github.api.post("user/repos", opts, function(err, repo) {
              if (err) {
                return cb(err);
              }
              dir.repo = repo;
              _.extend(dir, GitHub.FS.Repo);
              term.Write("Repository " + at + " created.\n", '', false);
              return cb();
            });
          };
          chooseName.next = setDescription;
          setDescription.next = setHomepage;
          setHomepage.next = choosePrivate;
          choosePrivate.next = createRepo;
          return chooseName();
        });
      });
    };
    boot = function() {
      github.api = new GitHub.API($('#console').data('token'));
      return github.api.get('user', {}, function(e, user) {
        github.api.user = user;
        github.user(user);
        return intro(repl);
      });
    };
    return boot();
  });

}).call(this);
