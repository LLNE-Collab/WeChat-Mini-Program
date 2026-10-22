var KEY = "shuangheng.v1";

function empty() {
  return { assessment: null, level: 1, streak: 0, sessions: [], postures: [], baseline: null };
}

function load() {
  try {
    var data = wx.getStorageSync(KEY);
    if (!data) return empty();
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
  var copy = JSON.parse(JSON.stringify(data));
  (copy.sessions || []).forEach(function (s) {
    s.thumbs = [];
  });
  try {
    wx.setStorageSync(KEY, copy);
  } catch (e) {
    (copy.sessions || []).forEach(function (s) {
      s.samples = (s.samples || []).filter(function (_, i) { return i % 2 === 0; });
    });
    wx.setStorageSync(KEY, copy);
  }
}

function sameDay(a, b) {
  var da = new Date(a);
  var db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function clockText(ts) {
  var d = new Date(ts);
  var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
  var mm = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
  return d.getMonth() + 1 + "月" + d.getDate() + "日 " + hh + ":" + mm;
}

function dayText(ts) {
  var d = new Date(ts || Date.now());
  return d.getMonth() + 1 + "月" + d.getDate() + "日 星期" + "日一二三四五六"[d.getDay()];
}

module.exports = { load: load, save: save, empty: empty, sameDay: sameDay, clockText: clockText, dayText: dayText };
