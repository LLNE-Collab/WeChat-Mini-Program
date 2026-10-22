var store = require("../../utils/store.js");
var sim = require("../../utils/sim.js");

var SPEC = {
  months: { label: "术后几个月", unit: "个月", step: 1, min: 0, max: 120, digits: 0, start: 1 },
  weight: { label: "体重", unit: "公斤", step: 1, min: 35, max: 120, digits: 0, start: 55 },
  height: { label: "身高（用来算体质指数，知道指数可跳过）", unit: "厘米", step: 1, min: 140, max: 190, digits: 0, start: 160 },
  bmi: { label: "体质指数", unit: "", step: 0.1, min: 14, max: 40, digits: 1, start: 22 },
  shoulder: { label: "两边肩膀高度差", unit: "厘米", step: 0.1, min: 0, max: 6, digits: 1, start: 0 },
  chemoCycles: { label: "化疗周期", unit: "个", step: 1, min: 0, max: 12, digits: 0, start: 0 },
  cognition: { label: "基线认知", unit: "分", step: 1, min: 0, max: 30, digits: 0, start: 27 },
};

function blankDraft() {
  return { side: "", months: null, weight: null, height: null, bmi: null, bmiManual: false, shoulder: null, chemoRegimen: "", chemoCycles: null, cognition: null, activity: "" };
}

Page({
  data: {
    step: "form",
    draft: blankDraft(),
    steps: [],
    err: "",
    fillTip: false,
    out: {},
    chemos: [
      { id: "none", name: "没有化疗" },
      { id: "anthra", name: "蒽环类" },
      { id: "taxane", name: "紫杉类" },
      { id: "both", name: "蒽环加紫杉" },
      { id: "other", name: "其他" },
    ],
    activities: [
      { id: "rare", name: "很少活动" },
      { id: "light", name: "轻度家务" },
      { id: "often", name: "经常走动" },
      { id: "regular", name: "规律活动" },
    ],
  },
  onLoad: function () {
    var saved = store.load().assessment;
    var draft = saved ? Object.assign(blankDraft(), saved, { bmiManual: true }) : blankDraft();
    this.setData({ draft: draft, steps: this.paint(draft) });
  },
  paint: function (draft) {
    var self = this;
    return Object.keys(SPEC).map(function (key) {
      var spec = SPEC[key];
      var val = draft[key];
      return {
        key: key,
        label: spec.label,
        shown: val == null ? "请填" : Number(val).toFixed(spec.digits) + (spec.unit ? " " + spec.unit : ""),
      };
    });
  },
  choose: function (e) {
    var draft = this.data.draft;
    var key = e.currentTarget.dataset.key;
    draft[key] = e.currentTarget.dataset.value;
    if (key === "chemoRegimen" && draft.chemoRegimen === "none") draft.chemoCycles = 0;
    if (key === "chemoRegimen" && draft.chemoRegimen !== "none" && !draft.chemoCycles) draft.chemoCycles = 4;
    this.setData({ draft: draft, steps: this.paint(draft), err: "" });
  },
  bump: function (e) {
    var draft = this.data.draft;
    var key = e.currentTarget.dataset.key;
    var spec = SPEC[key];
    var dir = Number(e.currentTarget.dataset.dir);
    var cur = draft[key];
    if (cur == null) cur = spec.start;
    else cur = cur + dir * spec.step;
    cur = Math.max(spec.min, Math.min(spec.max, cur));
    draft[key] = Number(cur.toFixed(spec.digits));
    if (key === "bmi") draft.bmiManual = true;
    if ((key === "weight" || key === "height") && !draft.bmiManual && draft.weight && draft.height) {
      var m = draft.height / 100;
      draft.bmi = Math.round((draft.weight / (m * m)) * 10) / 10;
    }
    this.setData({ draft: draft, steps: this.paint(draft), err: "" });
  },
  fillDemo: function () {
    var draft = { side: "left", months: 4, weight: 58, height: 159, bmi: 23, bmiManual: true, shoulder: 1.6, chemoRegimen: "both", chemoCycles: 4, cognition: 27, activity: "light" };
    this.setData({ draft: draft, steps: this.paint(draft), err: "" });
  },
  run: function () {
    var d = this.data.draft;
    var missing = [];
    if (!d.side) missing.push("手术哪一侧");
    if (d.months == null) missing.push("术后几个月");
    if (d.weight == null) missing.push("体重");
    if (d.bmi == null) missing.push("体质指数");
    if (d.shoulder == null) missing.push("肩膀高度差");
    if (!d.chemoRegimen) missing.push("化疗方案");
    if (d.chemoCycles == null) missing.push("化疗周期");
    if (d.cognition == null) missing.push("基线认知");
    if (!d.activity) missing.push("日常活动");
    if (missing.length) {
      this.setData({ err: missing.join("、") });
      this.showFillTip();
      return;
    }
    var saved = {
      side: d.side, months: d.months, weight: d.weight, height: d.height, bmi: d.bmi,
      shoulder: d.shoulder, chemoRegimen: d.chemoRegimen, chemoCycles: d.chemoCycles,
      cognition: d.cognition, activity: d.activity, at: Date.now(),
    };
    var db = store.load();
    db.assessment = saved;
    store.save(db);
    var a = sim.assess(saved);
    this.setData({
      step: "out",
      out: {
        risk: a.risk,
        riskClass: a.risk === "高" ? "high" : a.risk === "中" ? "mid" : "low",
        direction: a.direction,
        cobb0: a.cobb0.toFixed(1),
        sideText: a.affected === "左" ? "左侧" : "右侧",
        cobbText: a.cobbRange[0].toFixed(1) + "° – " + a.cobbRange[1].toFixed(1) + "°",
        shoulderText: a.shoulderRange[0].toFixed(1) + " – " + a.shoulderRange[1].toFixed(1) + " 厘米",
      },
    });
    wx.setNavigationBarTitle({ title: "评估结果" });
  },
  showFillTip: function () {
    var self = this;
    if (this._tipTimer) clearTimeout(this._tipTimer);
    this.setData({ fillTip: true });
    this._tipTimer = setTimeout(function () {
      self.setData({ fillTip: false });
    }, 2000);
  },
  onUnload: function () {
    if (this._tipTimer) clearTimeout(this._tipTimer);
  },
  predict: function () { wx.navigateTo({ url: "/pages/predict/predict" }); },
  home: function () { wx.switchTab({ url: "/pages/home/home" }); },
});
