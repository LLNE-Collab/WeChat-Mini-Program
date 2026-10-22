var store = require("../../utils/store.js");

Page({
  data: { list: [] },
  onShow: function () {
    var db = store.load();
    var list = db.sessions.map(function (s, i) {
      return {
        id: s.id,
        n: i + 1,
        when: store.clockText(s.at),
        level: s.level,
        pct: Math.round((s.accuracy || 0) * 100),
        rt: ((s.meanRt || 0) / 1000).toFixed(1),
        advice: s.adviceTitle || "",
      };
    });
    list.reverse();
    this.setData({ list: list });
  },
  open: function (e) {
    wx.navigateTo({ url: "/pages/result/result?id=" + e.currentTarget.dataset.id });
  },
});
