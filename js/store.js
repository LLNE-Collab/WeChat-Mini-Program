(function (root) {
  var KEY = "shuangheng.v1";

  function empty() {
    return {
      assessment: null,
      level: 1,
      streak: 0,
      sessions: [],
      postures: [],
      baseline: null,
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var data = JSON.parse(raw);
      var base = empty();
      Object.keys(base).forEach(function (k) {
        if (data[k] !== undefined) base[k] = data[k];
      });
      return base;
    } catch (e) {
      return empty();
    }
  }

  function save(data) {
    var json = JSON.stringify(data);
    try {
      localStorage.setItem(KEY, json);
      return true;
    } catch (e) {
      var copy = JSON.parse(json);
      (copy.sessions || []).forEach(function (s) {
        s.thumbs = [];
      });
      (copy.postures || []).forEach(function (p) {
        p.thumb = "";
      });
      localStorage.setItem(KEY, JSON.stringify(copy));
      return true;
    }
  }

  root.SHStore = { load: load, save: save, empty: empty };
})(window);
