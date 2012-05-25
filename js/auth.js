(function() {

  window.auth = function(auth) {
    if (auth) {
      return $(function() {
        $('#console').show('slow').data('token', auth.token);
        return $('#pitch').hide().load('resources.html');
      });
    }
  };

  auth.login = function() {
    return window.location = "http://getshuriken.com/auth/github?origin=" + window.location.href;
  };

  auth.logout = function() {
    return window.location = "http://getshuriken.com/auth/logout?origin=" + window.location.href;
  };

  $(window).on('click', 'a.btn-login', auth.login);

  $(window).on('click', 'a.btn-logout', auth.logout);

}).call(this);
