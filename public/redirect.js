(function () {
  var base = "/push_/";
  var target = window.location.pathname + window.location.search + window.location.hash;
  sessionStorage.setItem("push_redirect", target);
  window.location.replace(base);
})();
