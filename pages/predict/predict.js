var store = require("../../utils/store.js");
var sim = require("../../utils/sim.js");
var draw = require("../../utils/draw.js");
var qlib = require("../../utils/questions.js");

function band(pair, suffix) {
  return pair[0].toFixed(1) + " – " + pair[1].toFixed(1) + (suffix || "");
}

Page({
  data: {
    adherence: 80,
    quality: 90,
    level: 3,
    week: 12,
    levels: [1, 2, 3, 4, 5],
    weeks: [8, 9, 10, 11, 12],
    levelName: qlib.LEVEL_NAME[3],
    profile: "",
    cards: [],
    mech: false,
  },
  onLoad: function () {
    var a = store.load().assessment;
    if (!a) {
      wx.redirectTo({ url: "/pages/blank/blank" });
      return;
    }
    this.assess = a;
    this.setData({
      profile: "手术" + (a.side === "right" ? "右侧" : "左侧") + " · 术后 " + a.months + " 个月 · 肩高差 " + Number(a.shoulder).toFixed(1) + " 厘米 · 体质指数 " + a.bmi + " · 化疗 " + a.chemoCycles + " 个周期",
    });
    this.recalc();
  },
  input: function () {
    var a = this.assess;
    return {
      side: a.side, months: a.months, weight: a.weight, bmi: a.bmi, shoulder: a.shoulder,
      chemoRegimen: a.chemoRegimen, chemoCycles: a.chemoCycles, cognition: a.cognition, activity: a.activity,
      adherence: this.data.adherence, quality: this.data.quality, level: this.data.level,
    };
  },
  recalc: function () {
    var fc = sim.forecast(this.input(), this.data.week);
    this.fc = fc;
    var names = [["none", "不练", false], ["single", "只练动作", false], ["dual", "边做边答题", true]];
    var cards = names.map(function (n) {
      var row = fc.at[n[0]];
      return {
        name: n[1],
        dual: n[2],
        cobb: band(row.cobb, "°"),
        sym: band(row.sym, ""),
        shoulder: band(row.shoulder, " 厘米"),
        lean: band(row.lean, "°"),
        body: band(row.body, ""),
        qol: band(row.qol, ""),
      };
    });
    this.setData({ cards: cards });
    var self = this;
    wx.nextTick(function () { self.paint(); });
  },
  paint: function () {
    var self = this;
    if (!this.fc) return;
    draw.paint(this, "#cobb", function (ctx, w, h) {
      draw.drawCobb(ctx, w, h, self.fc.curves, self.data.week);
    });
    if (this.data.mech) {
      draw.paint(this, "#mech", function (ctx, w, h) {
        draw.drawMech(ctx, w, h, self.fc.curves.dual);
      });
    }
  },
  onAdh: function (e) {
    this.setData({ adherence: Number(e.detail.value) });
    this.recalc();
  },
  onQuality: function (e) {
    this.setData({ quality: Number(e.detail.value) });
    this.recalc();
  },
  onLevel: function (e) {
    var n = Number(e.currentTarget.dataset.n);
    this.setData({ level: n, levelName: qlib.LEVEL_NAME[n] });
    this.recalc();
  },
  onWeek: function (e) {
    this.setData({ week: Number(e.currentTarget.dataset.n) });
    this.recalc();
  },
  toggleMech: function () {
    var self = this;
    this.setData({ mech: !this.data.mech }, function () { self.paint(); });
  },
});
