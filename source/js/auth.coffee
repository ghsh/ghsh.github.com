window.auth = (auth)->
  if auth then $ ->
    $('#console').show('slow').data('token', auth.token)
    $('#pitch').hide().load('resources.html')

auth.login = ->
  window.location = "http://getshuriken.com/auth/github?origin="+window.location.href
auth.logout = ->
  window.location = "http://getshuriken.com/auth/logout?origin="+window.location.href
  

$(window).on 'click', 'a.btn-login', auth.login
$(window).on 'click', 'a.btn-logout', auth.logout
