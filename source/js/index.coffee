$ ->
  console.log "INITING !!"
  github = {}
  github.api = null
  github.user = ko.observable()

  skip = $('a.skip')
  skip.onp = -> @data('skip')
  skip.end = -> @hide('fast').data('skip', false)
  skip.start = -> @show('fast').data('skip', false)
  skip.click -> $(@).hide('fast').data('skip', true)


  term = $('#console').jqconsole('', '>>> ', '... ')
  $('#console').data('term', term)
  blink = ->
    if !$('#console .jqconsole:first').is('.jqconsole-blurred')
      $('#console .jqconsole-cursor:first').toggleClass('blink')
  setInterval blink, 400
  term.$prompt_label.text = term.$prompt_label.html

  term.puts = (html, cls = '')->
    term.Write html, cls, false

  term.ret = ->
    $('#console textarea').trigger(
      $.Event 'keydown',
        preventDefault:(->), ctrlKey: false, which: 13, keyCode:13)

  term.update_prompt = ->
    prompt = ['$']
    if github.fs.pwd()
      path = github.fs.pwd().canonicalPath()
      if github.user() && path == "/github/#{github.user().login}"
        path = "~"
      else
        path = github.fs.pwd().path
      prompt.unshift "<span class='path-pwd'>#{path}</span>"
      prompt.unshift "<span class='path-separator'>:</span>"
    if github.user()
      u = github.user()
      nick = github.user().login
      prompt.unshift "<a href='#' data-cmd='whoami' class='typer cmd #{'warn' if !u.email || !u.name }'>#{u.login}</a>"
    if term.prompt_label_main
      term.prompt_label_main = prompt.join(' ') + ' '

  typer = (at, enableSkip = true)->
    skip.start() if enableSkip
    if at == null
      el = null
      term.ClearPromptText()
      writer = (x)-> term.SetPromptText(term.GetPromptText() + x)
    else if at == term
      el = $('<div class="jqconsole-output"></div>').
             insertBefore('#console .jqconsole-input')
      writer = _.bind(el.append, el)
    else
      el = $(at)
      writer = _.bind(el.append, el)
    new $.Typer el, writer, _.bind(term.Focus, term), _.bind(skip.onp, skip)

  repl = (err)->
    term.Write(err + "\n", 'jqconsole-output-error') if err
    term.Prompt true, (input)->
      return repl() if input.trim() == ''
      try
        cmd = CmdParse.parse(input)
      catch e
        return repl "error parsing command line: #{e.message}"
      repl.execute cmd.slice(0), repl

  repl.execute = (cmd, cb)->
   prog = cmd[0]
   exec = repl.state[prog] || repl.command[prog] || repl.unknown(prog)
   exec.apply(exec, [cmd.slice(1), cb])

  repl.state = {}
  repl.command = {}
  repl.unknown = (prog)-> (cmd, cb)->
    cb "command not found: #{prog}\n"

  repl.command.clear = (cmd, cb)->
    $('#console .jqconsole-prompt').siblings().hide()
    cb()

  repl.command.help = (cmd, cb)->
    cmds = _.map(_.keys(repl.command), (c)-> "<span class='path-separator'>#{c}</b>").join(' ')
    term.Write "<h1>Help<h1><p>Available commands:<br/> #{cmds}</p>", '', false
    cb()

  repl.command.git = (cmd, cb)-> github.gitCmd(cmd, cb)
  repl.command.hub = (cmd, cb)-> github.hubCmd(cmd, cb)

  repl.command.logout = (cmd, cb)-> auth.logout()

  repl.command.whoami = (cmd, cb)->
    if github.user()
      u = github.user()

      term.Write "<a href='#{u.html_url}'><img src='#{u.avatar_url}'/></a><br/>", '', false

      v = if u.name && u.name != ''
          "<a href='#{u.html_url}' target='_blank'>#{u.name}</a>"
        else
          "No name configured. "


      term.Write("<span>#{v} <a href='#' class='btn btn-inverse btn-ninja git-config-global' data-set='user.name'>change</a></span>\n", '', false)

      v = if u.email && u.email != ''
          "#{u.email}"
        else
          "No email configured. "

      term.Write("<span>#{v} <a href='#' class='btn btn-inverse btn-ninja git-config-global' data-set='user.email'>change</a></span>\n", '', false)
    else
      term.Write "Anonymous\n"
    cb()

  $(document).on 'click', 'a.typer.cmd', (event)->
    event.preventDefault()
    event.stopPropagation()
    typer(null).type ($(this).attr('data-cmd') || $(this).text()), ->
      term.ret()

  github.gitCmd = (argv, cb)->
    if typeof(argv[0]) == 'string'
      cmd = github.gitCmd[argv[0]] || repl.unknown("git #{argv[0]}")
      return cmd.apply(cmd, [argv.slice(1), cb])
    else
      cb()

  github.hubCmd = (argv, cb)->
    if typeof(argv[0]) == 'string'
      cmd = github.hubCmd[argv[0]] ||
            github.gitCmd[argv[0]] ||
            repl.unknown("hub #{argv[0]}")
      return cmd.apply(cmd, [argv.slice(1), cb])
    else
      cb()

  github.userAttr = (attr)->
    puts: (cb)->
      term.Write "#{github.user()[attr]}\n"
      cb()
    get: -> github.user()[attr]
    set: (value, cb)->
      obj = {}
      obj[attr] = value
      github.api.patch "user", obj, (e,d)->
        if e then cb "Error #{e}"
        else
          github.user(d)
          cb()

  github.userAttr["user.name"] = github.userAttr('name')
  github.userAttr["user.email"] = github.userAttr('email')
  github.userAttr["user.blog"] = github.userAttr('blog')
  github.userAttr["user.bio"] = github.userAttr('bio')
  github.userAttr["user.company"] = github.userAttr('company')
  github.userAttr["user.location"] = github.userAttr('location')
  github.userAttr["user.hireable"] = github.userAttr('hireable')

  github.gitCmd.config = (argv, cb)->
    opts = { global: false }
    args = []
    while argv.length > 0
     a = argv.shift()
     if a.long || a.short
       switch  (a.long || a.short)
         when "global" then opts.global = true
         else cb "Bad option: git config #{a.long || a.short}"
     else
       args.push a

    if args.length > 1 # set
      github.userAttr[args[0]].set(args[1], cb)
    else if args.length == 1 # get
      github.userAttr[args[0]].puts(cb)
    else
      for own name, attr of github.userAttr
        term.Write "#{name} = #{attr.get()}  <a href='#' class='btn btn-inverse btn-ninja git-config-global' data-set='#{name}'>change</a>\n", '', false
      cb()

  $(document).on 'click', 'a.btn.git-config-global', (event)->
    event.preventDefault()
    event.stopPropagation()
    attr = $(this).attr('data-set')
    typer(null).type "git config --global #{attr} \"\"", ->
      term._MoveLeft false
      t = $('<span/>').insertBefore('.jqconsole-cursor').tooltip(
        title: "Write your #{attr} and hit enter"
        animation: true
        placement: 'top')
      t.tooltip('show')
      setTimeout _.bind(t.tooltip, t, 'hide'), 5000


  github.user.subscribe (user)->
    github.fs(user)
    return unless user
    term.update_prompt()

  intro = (cb)->
    term.Write "Welcome <a href='#' data-cmd='whoami' class='typer cmd'>#{github.user().login}</a>\n", '', false
    cb()

  github.fs = (user)=>
    root = GitHub.FS.treeJSON github.api, path: '/'
    github.fs.root(root)
    unless user
      return github.fs.pwd(github.fs.root())
    _.extend root.mkdir('gists'), GitHub.FS.UserGists
    home = root.mkdir('github').mkdir(user.login)
    _.extend home, GitHub.FS.UserRepos
    github.fs.pwd(home)

  github.fs.root = ko.observable()
  github.fs.pwd = ko.observable()
  github.fs.pwd.subscribe -> term.update_prompt()

  repl.command.pwd = (cmd, cb)->
   path = github.fs.pwd().canonicalPath()
   term.Write path + "\n"
   cb()

  repl.command.ls = (cmd, cb)->
    github.fs.pwd().resolve (e, dir)->
      return cb e if e
      if typeof(cmd[0]) == 'string'
        dir = dir.find(cmd[0])
      unless dir
        return cb "No such file or directory: #{cmd[0]}"
      dir.resolve (e, dir)->
        return cb e if e
        if dir.named
          sep = "<br/>"
          term.Write "<a href='#./' class='ls-dir'>./</a>#{sep}", '', false
          term.Write "<a href='#../' class='ls-dir'>../</a>#{sep}", '', false if dir.parent
          for own k, v of dir.named
            if v.child
              dir_cls = if v.repo then "ls-repo" else "ls-dir"
              term.Write "<a href='##{k}' class='#{dir_cls}'>#{k}/</a>#{sep}", '', false
            else if v.link
              term.Write "<a href='##{k}' class='ls-link'>#{k}</a> -> <a href='##{v.link.canonicalPath()}' class='ls-link-dest'>#{v.link.canonicalPath()}</a>#{sep}", '', false
            else
              term.Write "<a href='##{k}' class='ls-file'>#{k}</a>#{sep}", '', false
        else
          term.Write "#{dir.mode} #{cmd[0]}  #{dir.size}kB #{dir.sha}\n"
        cb()


  repl.command.mkdir = (cmd, cb)->
   github.fs.pwd().resolve (e, here)->
    name = cmd[0]
    if here.find name
      return cb "Existing file or directory: #{name}"
    dir = here.mkdir name
    cb()

  repl.command.cd = (cmd, cb)->
   dir = null
   if cmd.length == 0 || cmd[0] == "~"
    dir = github.fs.root()
   else if cmd[0] == "-"
    dir = @stack.shift() || pwd()
   cd = (dir)=>
     @stack.unshift(dir) unless @stack[0] == dir
     github.fs.pwd(dir)
     cb()
   if dir
     cd dir
   else
     github.fs.pwd().resolve (e, dir)->
      dir = dir.find cmd[0]
      if dir && dir.type != 'blob'
        cd dir
      else
        cb "No such directory: #{cmd[0]}"

  repl.command.cd.stack = []

  repl.command.cat = (cmd, cb)->
    github.fs.pwd().resolve (e, dir)->
      return cb e if e
      file = dir.find cmd[0]
      if !file || file.named
        cb "No such file: #{cmd[0]}"
      else
        file.cat (err, content)->
          return cb err if err
          if window.hljs
            content = hljs.highlightAuto(content).value
          term.Write "<div class='hero-unit cat'>#{content}</div>", "", false
          term.Write "\n"
          cb()

  createEditor = (cmd, config = {}, cb)->
    github.fs.pwd().resolve (err, dir)->
      return cb err if err
      file = dir.find cmd[0]
      if !file || file.named
        cb "No such file: #{cmd[0]}"
      else
        file.cat (err, content)->
          return cb err if err
          lang = null
          if window.hljs
            lang = hljs.highlightAuto(content).language
          term.Write "<div class='hero-unit' editor></div>", "jqterminal-editor", false
          place = $('.jqterminal-editor:last div.hero-unit')
          config.value = content
          config.theme = 'monokai'
          config.mode = lang || "clike"
          # config.onChange = (ed, obj)-> sha1
          config.autofocus = true
          config.lineNumbers = true
          config.onFocus = ()-> term.Disable()
          config.onBlur = ()-> term.Enable()
          term.Disable()
          editor = CodeMirror(place[0], config)
          cb()

  repl.command.edit = (cmd, cb)-> createEditor cmd, {}, cb
  repl.command.vi = (cmd, cb)-> createEditor cmd, { keyMap: "vim" }, cb
  repl.command.vim = repl.command.vi
  repl.command.emacs = (cmd, cb)-> createEditor cmd, { keyMap: "emacs" }, cb

  github.gitCmd.init = (cmd, cb)->
    github.fs.pwd().resolve (err, dir)->
      return cb err if err
      return cb "Already a git repo." if dir.repo
      here = dir.canonicalPath().split('/').slice(0,-1).join('/')
      must = "/github/#{github.api.user.login}"
      warn = "Only subdirs of #{must} can be turned into a git repo."
      return cb warn unless here == must
      term.Write "<span class='jqconsole-output-warn'>Attention</span>. This will create a repository on your <b>GitHub</b> account.\n", '', false
      term.Write "Do you really want to continue? [y/N]"
      term.Input (input)->
        return cb() unless input.toLowerCase() == "y"
        opts = {}

        chooseName = ->
          term.Write "Repository name: [<span class='path-pwd'>#{dir.path}</span>]", '', false
          term.Input (input)->
            input = input.trim()
            if input != ""
              if dir.parent.find(input)
                term.Write "A directory already exists with that name.\n", 'jqconsole-output-warn', false
                return chooseName()
              if input != dir.path
                term.Write "Renaming directory #{dir.path} to #{input}\n"
                dir.path = input
                delete dir.parent.named[dir.path]
                dir.parent.named[input] = dir
                github.fs.pwd(dir)
                return chooseName.next()
            chooseName.next()

        setDescription = ->
          opts.name = dir.path
          term.Write "Repository description:"
          term.Input (input)->
            input = input.trim()
            opts.description = input if input != ""
            setDescription.next()

        setHomepage = ->
          term.Write "Repository homepage:"
          term.Input (input)->
            input = input.trim()
            opts.homepage = input if input != ""
            setHomepage.next()

        choosePrivate = ->
          term.Write "Create as private: [y/N]"
          term.Input (input)->
            input = input.trim()
            opts.private = true if input.toLowerCase() == 'y'
            choosePrivate.next()

        createRepo = ->
          at = "#{github.api.user.login}/#{dir.path}"
          at = "<a href='http://github.com/#{at}' target='_blank'>#{at}</a>"
          github.api.post "user/repos", opts, (err, repo)->
            return cb err if err
            dir.repo = repo
            _.extend dir, GitHub.FS.Repo
            term.Write "Repository #{at} created.\n", '', false
            cb()

        chooseName.next = setDescription
        setDescription.next = setHomepage
        setHomepage.next = choosePrivate
        choosePrivate.next = createRepo

        chooseName()


  boot = ->
    github.api = new GitHub.API $('#console').data('token')
    github.api.get 'user', {}, (e, user)->
      github.api.user = user
      github.user(user)
      intro repl

  boot()

