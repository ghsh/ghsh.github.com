target = (window || module.exports)
GitHub = target['GitHub'] || {}
target['GitHub'] = GitHub

class GitHub.API

  constructor: (token)->
   req = (method)->
    convert = (x)->x
    contentType = 'application/x-www-form-urlencoded'

    convert = ((x)->JSON.stringify(x)) if method.match(/P/)
    contentType = 'application/json' if method.match(/P/)

    (res, body = {}, cb)->
     $.ajax
       url: "https://api.github.com/#{res}"
       type: method
       dataType: 'json'
       contentType: contentType
       data: convert(body)
       beforeSend: (xhr)->(xhr.setRequestHeader "Authorization",
                           "Bearer #{token}")
       crossDomain: true
       success: (d)->(cb null, d)
       error: (d)->(cb null)

   @options = req "OPTIONS"
   @get = req "GET"
   @post = req "POST"
   @put = req "PUT"
   @patch = req "PATCH"
   @del = req "DELETE"

class GitHub.FS

  @Repo =

    repoPath: -> "#{@repo.owner.login}/#{@repo.name}"
    repoBase: -> "repos/#{@repoPath()}"

    getRefs: (cb)->
      if @refs
        return cb null, @refs
      else
        @api.get "#{@repoBase()}/git/refs", {}, (err, data)=>
          @refs = data
          cb(err, data)

    getHeadRef: (refs, cb)->
      for ref in refs
        if ref.ref == "refs/heads/" + (@repo.master_branch || "master")
          return cb null, ref.object
      cb "Ref not found: #{name}"

    getCommit: (ref, cb)->
      if ref.commit
        return cb null, ref.commit
      @api.get "#{@repoBase()}/git/commits/#{ref.sha}", {}, (e, c)=>
        return cb e if e
        ref.commit = c
        cb null, c

    getCommitTree: (c, cb)->
      if c.tree.tree
        return cb null, c.tree.tree
      @api.get "#{@repoBase()}/git/trees/#{c.tree.sha}", {recursive: 1}, (e, t) ->
          return cb e if e
          c.tree.tree = t
          cb null, t

    buildTree: (tree, cb)->
      if @work
        return cb null, @work
      @work = GitHub.FS.treeJSON @api, tree
      @work.parent = @parent
      @work.backlink = this
      cb null, @work

    repoBuild: (cb)->
      async.waterfall [
         _.bind(@getRefs, @),
         _.bind(@getHeadRef, @),
         _.bind(@getCommit, @),
         _.bind(@getCommitTree, @),
         _.bind(@buildTree, @)
        ],
        cb

    resolve: (cb)->
      Tree.prototype.resolve.apply this, [(e, dir)->
         return cb e if e
         if dir.repo
           dir.repoBuild cb
         else
           cb null, dir
      ]

  @UserRepos =
    resolve: (cb)->
      self = this
      Tree.prototype.resolve.apply self, [(e, dir)->
         return cb e if e
         self.fetchRepos.apply(dir, [cb])
      ]

    fetchRepos: (cb)->
      if @fetched_user_repos
        return cb null, this
      @api.get "user/repos", {type: "all"}, (e, repos)=>
        github = @root().find('github')
        myhome = github.find(@api.user.login) ||
                 github.mkdir(@api.user.login)
        for repo in repos
          own = repo.owner.login == @api.user.login
          home = github.find(repo.owner.login) ||
                 github.mkdir(repo.owner.login)
          repdir = home.mkdir(repo.name)
          _.extend repdir, GitHub.FS.Repo
          repdir.repo = repo
          myhome.ln repo.name, repdir unless own
        @fetched_user_repos = repos
        console.log "FETCHED REPOS CALLING CALLBACK"
        cb null, this

  @UserGists =
    ls: (cb)->
      if @fetched_user_gists
        return Tree.prototype.ls.apply(this, [])
      @api.get "gists", {type: "all"}, (e, gists)=>
        gistr = @root().find('gists')
        for gist in gists
          gistd = gistr.mkdir(gist.id)
          gistd.gist = gist
        @fetched_user_gists = gists
        Tree.prototype.ls.apply(this, [cb])

  class Link
    constructor: (path, dest)->
      @path = path
      @link = dest

    canonicalPath: (dir = this)->
      dir.parent.canonicalPath() + "/" + @path

    resolve: (cb)->
      @link.resolve cb

  class Blob
    constructor: (api) ->
      @api = api

    cat: (cb)->
      if @blob
        return cb null, @blob
      root = @parent.git_root()
      @api.get "repos/#{root.repo.owner.login}/#{root.repo.name}/git/blobs/#{@sha}", {}, (err, data)=>
        if data.encoding == 'base64'
          if typeof(window.atob) == 'function'
            @blob = atob data.content.replace(/\n/g, '')
        return cb "Unknown ecoding: #{data.encoding}" unless @blob
        cb null, @blob

  class Tree
    constructor: (api) ->
      @api = api
      @child = []
      @named = {}

    git_root: (dir = this)->
      while dir
        return dir if dir.repo
        dir = dir.backlink || dir.parent
      null

    root: ->
      dir = this
      dir = dir.parent while dir.parent
      dir

    resolve: (cb)->
      if @link
        @link.resolve cb
      else
        cb null, this

    ln: (name, target)->
      link = new Link(name, target)
      here = this
      link.parent = here
      here.child.push link
      here.named[name] = link
      link

    find: (path, dir = this)->
      paths = path.split(/\s*\/+\s*/)
      if paths[0] == ''
        paths.shift()
        dir = dir.root()
      for path in paths
        if dir && path != ''
          dir = if path == "."
                 dir
                else if path == ".."
                 dir.parent || dir
                else
                 dir.named[path]
      dir

    canonicalPath: (dir = this)->
      return '/' unless dir.parent
      ary = []
      while dir
        if dir.parent
          ary.unshift dir.path
        else
          ary.unshift ''
        dir = dir.parent
      ary.join('/')

    mkdir: (name, dir = this)->
      here = GitHub.FS.treeJSON(dir.api, {path: name, parent: dir})
      dir.child.push here
      dir.named[name] = here
      here

  @fromJSON = (api, json)->
    GitHub.FS[json.type+"JSON"](api, json)

  @treeJSON = (api, json)->
    tree = new Tree(api)
    childs = json.tree || []
    delete json.tree
    for child in childs
      path = child.path.split('/')
      name = path.pop()
      here = tree.find(path.join('/')) || tree
      ch = GitHub.FS.fromJSON(api, child)
      ch.parent = here
      ch.path = name
      here.child.push ch
      here.named[name] = ch
    _.extend tree, json

  @blobJSON = (api, json)->
    blob = new Blob(api)
    _.extend blob, json
    blob
