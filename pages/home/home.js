var store = require("../../utils/store.js");

Page({
  data: {
    date: "",
    trained: false,
    level: 1,
    shoulder: "还没有量过",
    doneToday: false,
    hasAssess: false,
    primary: "开始第一次评估",
    primaryGo: "assess",
    primaryClass: "teal",
  },
  onShow: function () {
    if (typeof this.getTabBar === "function" && this.getTabBar()) this.getTabBar().setData({ selected: 0 });
    var db = store.load();
    var trained = db.sessions.length > 0;
    var doneToday = db.sessions.some(function (s) { return store.sameDay(s.at, Date.now()); });
    var last = null;
    (db.postures || []).forEach(function (p) {
      if (!p.refused && p.shoulderCm != null) last = p;
    });
    var primary = "开始第一次评估";
    var primaryGo = "assess";
    var primaryClass = "teal";
    if (db.assessment && !doneToday) {
      primary = "开始今天的训练";
      primaryGo = "train";
      primaryClass = "lime";
    } else if (db.assessment && doneToday) {
      primary = "看今天的结果";
      primaryGo = "result";
      primaryClass = "ink";
    }
    this.setData({
      date: store.dayText(),
      trained: trained,
      level: db.level || 1,
      shoulder: last ? Number(last.shoulderCm).toFixed(1) + " 厘米" : "还没有量过",
      doneToday: doneToday,
      hasAssess: !!db.assessment,
      primary: primary,
      primaryGo: primaryGo,
      primaryClass: primaryClass,
    });
  },
  go: function (e) {
    var dest = e.currentTarget.dataset.go;
    var db = store.load();
    if (!db.assessment && (dest === "train" || dest === "posture" || dest === "result" || dest === "predict")) {
      wx.navigateTo({ url: "/pages/blank/blank" });
      return;
    }
    wx.navigateTo({ url: "/pages/" + dest + "/" + dest });
  },
});
