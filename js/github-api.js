(function() {
  var GitHub, target;

  target = window || module.exports;

  GitHub = target['GitHub'] || {};

  target['GitHub'] = GitHub;

  GitHub.API = (function() {

    function API(token) {
      var req;
      req = function(method) {
        var contentType, convert;
        convert = function(x) {
          return x;
        };
        contentType = 'application/x-www-form-urlencoded';
        if (method.match(/P/)) {
          convert = (function(x) {
            return JSON.stringify(x);
          });
        }
        if (method.match(/P/)) {
          contentType = 'application/json';
        }
        return function(res, body, cb) {
          if (body == null) {
            body = {};
          }
          return $.ajax({
            url: "https://api.github.com/" + res,
            type: method,
            dataType: 'json',
            contentType: contentType,
            data: convert(body),
            beforeSend: function(xhr) {
              return xhr.setRequestHeader("Authorization", "Bearer " + token);
            },
            crossDomain: true,
            success: function(d) {
              return cb(null, d);
            },
            error: function(d) {
              return cb(null);
            }
          });
        };
      };
      this.options = req("OPTIONS");
      this.get = req("GET");
      this.post = req("POST");
      this.put = req("PUT");
      this.patch = req("PATCH");
      this.del = req("DELETE");
    }

    return API;

  })();

  GitHub.FS = (function() {
    var Blob, Link, Tree;

    function FS() {}

    FS.Repo = {
      repoPath: function() {
        return "" + this.repo.owner.login + "/" + this.repo.name;
      },
      repoBase: function() {
        return "repos/" + (this.repoPath());
      },
      getRefs: function(cb) {
        var _this = this;
        if (this.refs) {
          return cb(null, this.refs);
        } else {
          return this.api.get("" + (this.repoBase()) + "/git/refs", {}, function(err, data) {
            _this.refs = data;
            return cb(err, data);
          });
        }
      },
      getHeadRef: function(refs, cb) {
        var ref, _i, _len;
        for (_i = 0, _len = refs.length; _i < _len; _i++) {
          ref = refs[_i];
          if (ref.ref === "refs/heads/" + (this.repo.master_branch || "master")) {
            return cb(null, ref.object);
          }
        }
        return cb("Ref not found: " + name);
      },
      getCommit: function(ref, cb) {
        var _this = this;
        if (ref.commit) {
          return cb(null, ref.commit);
        }
        return this.api.get("" + (this.repoBase()) + "/git/commits/" + ref.sha, {}, function(e, c) {
          if (e) {
            return cb(e);
          }
          ref.commit = c;
          return cb(null, c);
        });
      },
      getCommitTree: function(c, cb) {
        if (c.tree.tree) {
          return cb(null, c.tree.tree);
        }
        return this.api.get("" + (this.repoBase()) + "/git/trees/" + c.tree.sha, {
          recursive: 1
        }, function(e, t) {
          if (e) {
            return cb(e);
          }
          c.tree.tree = t;
          return cb(null, t);
        });
      },
      buildTree: function(tree, cb) {
        if (this.work) {
          return cb(null, this.work);
        }
        this.work = GitHub.FS.treeJSON(this.api, tree);
        this.work.parent = this.parent;
        this.work.backlink = this;
        return cb(null, this.work);
      },
      repoBuild: function(cb) {
        return async.waterfall([_.bind(this.getRefs, this), _.bind(this.getHeadRef, this), _.bind(this.getCommit, this), _.bind(this.getCommitTree, this), _.bind(this.buildTree, this)], cb);
      },
      resolve: function(cb) {
        return Tree.prototype.resolve.apply(this, [
          function(e, dir) {
            if (e) {
              return cb(e);
            }
            if (dir.repo) {
              return dir.repoBuild(cb);
            } else {
              return cb(null, dir);
            }
          }
        ]);
      }
    };

    FS.UserRepos = {
      resolve: function(cb) {
        var self;
        self = this;
        return Tree.prototype.resolve.apply(self, [
          function(e, dir) {
            if (e) {
              return cb(e);
            }
            return self.fetchRepos.apply(dir, [cb]);
          }
        ]);
      },
      fetchRepos: function(cb) {
        var _this = this;
        if (this.fetched_user_repos) {
          return cb(null, this);
        }
        return this.api.get("user/repos", {
          type: "all"
        }, function(e, repos) {
          var github, home, myhome, own, repdir, repo, _i, _len;
          github = _this.root().find('github');
          myhome = github.find(_this.api.user.login) || github.mkdir(_this.api.user.login);
          for (_i = 0, _len = repos.length; _i < _len; _i++) {
            repo = repos[_i];
            own = repo.owner.login === _this.api.user.login;
            home = github.find(repo.owner.login) || github.mkdir(repo.owner.login);
            repdir = home.mkdir(repo.name);
            _.extend(repdir, GitHub.FS.Repo);
            repdir.repo = repo;
            if (!own) {
              myhome.ln(repo.name, repdir);
            }
          }
          _this.fetched_user_repos = repos;
          console.log("FETCHED REPOS CALLING CALLBACK");
          return cb(null, _this);
        });
      }
    };

    FS.UserGists = {
      ls: function(cb) {
        var _this = this;
        if (this.fetched_user_gists) {
          return Tree.prototype.ls.apply(this, []);
        }
        return this.api.get("gists", {
          type: "all"
        }, function(e, gists) {
          var gist, gistd, gistr, _i, _len;
          gistr = _this.root().find('gists');
          for (_i = 0, _len = gists.length; _i < _len; _i++) {
            gist = gists[_i];
            gistd = gistr.mkdir(gist.id);
            gistd.gist = gist;
          }
          _this.fetched_user_gists = gists;
          return Tree.prototype.ls.apply(_this, [cb]);
        });
      }
    };

    Link = (function() {

      function Link(path, dest) {
        this.path = path;
        this.link = dest;
      }

      Link.prototype.canonicalPath = function(dir) {
        if (dir == null) {
          dir = this;
        }
        return dir.parent.canonicalPath() + "/" + this.path;
      };

      Link.prototype.resolve = function(cb) {
        return this.link.resolve(cb);
      };

      return Link;

    })();

    Blob = (function() {

      function Blob(api) {
        this.api = api;
      }

      Blob.prototype.cat = function(cb) {
        var root,
          _this = this;
        if (this.blob) {
          return cb(null, this.blob);
        }
        root = this.parent.git_root();
        return this.api.get("repos/" + root.repo.owner.login + "/" + root.repo.name + "/git/blobs/" + this.sha, {}, function(err, data) {
          if (data.encoding === 'base64') {
            if (typeof window.atob === 'function') {
              _this.blob = atob(data.content.replace(/\n/g, ''));
            }
          }
          if (!_this.blob) {
            return cb("Unknown ecoding: " + data.encoding);
          }
          return cb(null, _this.blob);
        });
      };

      return Blob;

    })();

    Tree = (function() {

      function Tree(api) {
        this.api = api;
        this.child = [];
        this.named = {};
      }

      Tree.prototype.git_root = function(dir) {
        if (dir == null) {
          dir = this;
        }
        while (dir) {
          if (dir.repo) {
            return dir;
          }
          dir = dir.backlink || dir.parent;
        }
        return null;
      };

      Tree.prototype.root = function() {
        var dir;
        dir = this;
        while (dir.parent) {
          dir = dir.parent;
        }
        return dir;
      };

      Tree.prototype.resolve = function(cb) {
        if (this.link) {
          return this.link.resolve(cb);
        } else {
          return cb(null, this);
        }
      };

      Tree.prototype.ln = function(name, target) {
        var here, link;
        link = new Link(name, target);
        here = this;
        link.parent = here;
        here.child.push(link);
        here.named[name] = link;
        return link;
      };

      Tree.prototype.find = function(path, dir) {
        var paths, _i, _len;
        if (dir == null) {
          dir = this;
        }
        paths = path.split(/\s*\/+\s*/);
        if (paths[0] === '') {
          paths.shift();
          dir = dir.root();
        }
        for (_i = 0, _len = paths.length; _i < _len; _i++) {
          path = paths[_i];
          if (dir && path !== '') {
            dir = path === "." ? dir : path === ".." ? dir.parent || dir : dir.named[path];
          }
        }
        return dir;
      };

      Tree.prototype.canonicalPath = function(dir) {
        var ary;
        if (dir == null) {
          dir = this;
        }
        if (!dir.parent) {
          return '/';
        }
        ary = [];
        while (dir) {
          if (dir.parent) {
            ary.unshift(dir.path);
          } else {
            ary.unshift('');
          }
          dir = dir.parent;
        }
        return ary.join('/');
      };

      Tree.prototype.mkdir = function(name, dir) {
        var here;
        if (dir == null) {
          dir = this;
        }
        here = GitHub.FS.treeJSON(dir.api, {
          path: name,
          parent: dir
        });
        dir.child.push(here);
        dir.named[name] = here;
        return here;
      };

      return Tree;

    })();

    FS.fromJSON = function(api, json) {
      return GitHub.FS[json.type + "JSON"](api, json);
    };

    FS.treeJSON = function(api, json) {
      var ch, child, childs, here, name, path, tree, _i, _len;
      tree = new Tree(api);
      childs = json.tree || [];
      delete json.tree;
      for (_i = 0, _len = childs.length; _i < _len; _i++) {
        child = childs[_i];
        path = child.path.split('/');
        name = path.pop();
        here = tree.find(path.join('/')) || tree;
        ch = GitHub.FS.fromJSON(api, child);
        ch.parent = here;
        ch.path = name;
        here.child.push(ch);
        here.named[name] = ch;
      }
      return _.extend(tree, json);
    };

    FS.blobJSON = function(api, json) {
      var blob;
      blob = new Blob(api);
      _.extend(blob, json);
      return blob;
    };

    return FS;

  })();

}).call(this);
