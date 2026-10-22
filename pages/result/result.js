var store = require("../../utils/store.js");
var draw = require("../../utils/draw.js");
var qlib = require("../../utils/questions.js");

Page({
  data: { empty: true },
  onLoad: function (query) {
    var db = store.load();
    if (!db.assessment) {
      wx.redirectTo({ url: "/pages/blank/blank" });
      return;
    }
    var session = null;
    if (query && query.id) {
      db.sessions.forEach(function (s) { if (s.id === query.id) session = s; });
    }
    if (!session && db.sessions.length) session = db.sessions[db.sessions.length - 1];
    if (!session) {
      this.setData({ empty: true });
      return;
    }
    this.session = session;
    var rows = (session.questions || []).map(function (q) {
      var lean = q.leanMean == null ? "这段没看清，没有算进去" : "歪了 " + Number(q.leanMean).toFixed(1) + "°";
      var over = q.leanMean != null && q.leanMean > (session.threshold || 5);
      return {
        n: q.n,
        over: over,
        text: "第 " + q.n + " 题 · 第 " + q.level + " 级 · " + (q.correct ? "答对" : "答错") + " · " + lean,
      };
    });
    this.setData({
      empty: false,
      when: store.clockText(session.at),
      level: session.level,
      levelName: qlib.LEVEL_NAME[session.level] || "",
      pct: Math.round(session.accuracy * 100),
      rt: (session.meanRt / 1000).toFixed(1),
      rows: rows,
      adviceTitle: session.adviceTitle,
      adviceDetail: session.adviceDetail,
      threshold: session.threshold || 5,
      photoLine: session.postureSource === "camera"
        ? "训练时悄悄记了 " + (session.photoCount || 0) + " 张，没有打断您。照片留在这台手机里，这里不展示。"
        : "这次没有打开摄像头。图上的歪斜是仿真示意，用来把流程走通。",
    });
    var self = this;
    wx.nextTick(function () {
      draw.paint(self, "#session", function (ctx, w, h) { draw.drawSession(ctx, w, h, session); });
    });
  },
  toPose: function () { wx.navigateTo({ url: "/pages/posture/posture?mode=review" }); },
  home: function () { wx.switchTab({ url: "/pages/home/home" }); },
});
