var store = require("../../utils/store.js");
var sim = require("../../utils/sim.js");
var pose = require("../../utils/pose.js");
var qlib = require("../../utils/questions.js");
var advice = require("../../utils/advice.js");

var EXS = [
  { name: "躺着 · 死虫式", hold: "手脚伸开后停住。腰尽量贴住，同时答题。", place: "手机放在头的上方，大约斜 30°。人要全身入镜。放好后先别再挪。" },
  { name: "跪着 · 鸟狗式", hold: "对侧的手和腿伸直后停住。背放平，同时答题。", place: "镜头放低，能看清肩膀到髋。放好后先别再挪。" },
  { name: "站着 · 弹力带抗旋转推举", hold: "双手把带子推到身前后停住。身体不要跟着转，同时答题。", place: "手机大约 1.2 米高，离人大约 2 米。人要全身入镜。放好后先别再挪。" },
];

Page({
  data: {
    phase: "guide",
    level: 1,
    levelName: "",
    exercise: 0,
    ex: EXS[0],
    camNote: "",
    showCam: false,
    q: {},
    word: "",
    wordList: [],
  },
  onLoad: function () {
    var db = store.load();
    if (!db.assessment) {
      wx.redirectTo({ url: "/pages/blank/blank" });
      return;
    }
    this.level = db.level || 1;
    this.questions = [];
    this.samples = [];
    this.chain = {};
    this.qInExercise = 0;
    this.source = "simulation";
    this.photoCount = 0;
    this.overMs = 0;
    this.coolUntil = 0;
    this.smooth = null;
    this.frameLean = null;
    this.started = 0;
    this.setData({ level: this.level, levelName: qlib.LEVEL_NAME[this.level], ex: EXS[0] });
  },
  onUnload: function () {
    this.stopMonitor();
    if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload();
  },
  armLeave: function () {
    if (wx.enableAlertBeforeUnload) {
      wx.enableAlertBeforeUnload({ message: "现在离开的话，这次不算做完，也不会出结果。" });
    }
  },
  startCam: function () {
    this.started = Date.now();
    this.source = "simulation";
    this.armLeave();
    this.setData({ phase: "setup", exercise: 0, ex: EXS[0], showCam: true, camNote: "正在打开摄像头…" });
    wx.setNavigationBarTitle({ title: EXS[0].name });
    this.ensureSample();
  },
  startSim: function () {
    this.started = Date.now();
    this.source = "simulation";
    this.armLeave();
    this.setData({
      phase: "setup",
      exercise: 0,
      ex: EXS[0],
      showCam: false,
      camNote: "这次不拍照。姿势曲线用仿真，方便把流程走通。",
    });
    wx.setNavigationBarTitle({ title: EXS[0].name });
    this.ensureSample();
  },
  onCamReady: function () {
    var ctx = wx.createCameraContext();
    var self = this;
    this.cam = ctx;
    this.source = "camera";
    this.photoTimer = setInterval(function () {
      ctx.takePhoto({
        quality: "low",
        success: function () { self.photoCount += 1; },
        fail: function () {},
      });
    }, 8000);
    if (typeof ctx.onCameraFrame === "function") {
      var last = 0;
      this.listener = ctx.onCameraFrame(function (frame) {
        var now = Date.now();
        if (now - last < 400) return;
        last = now;
        var raw = pose.leanFromBuffer(frame.data, frame.width, frame.height);
        if (raw == null || !isFinite(raw)) {
          self.frameLean = null;
          return;
        }
        self.smooth = self.smooth == null ? raw : self.smooth * 0.55 + raw * 0.45;
        self.frameLean = Math.abs(self.smooth);
      });
      this.listener.start();
    }
    this.setData({ camNote: "摄像头已开。答题时不会弹出画面。" });
  },
  onCamError: function () {
    this.source = "simulation";
    this.setData({ showCam: false, camNote: "摄像头没有打开。这次姿势用仿真，答题照常。" });
  },
  ensureSample: function () {
    var self = this;
    if (this.sampleTimer) return;
    this.sampleTimer = setInterval(function () { self.sampleOnce(); }, 500);
  },
  stopMonitor: function () {
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    if (this.photoTimer) clearInterval(this.photoTimer);
    this.sampleTimer = null;
    this.photoTimer = null;
    if (this.listener && this.listener.stop) this.listener.stop();
    this.listener = null;
  },
  sampleOnce: function () {
    if (!this.started) return;
    var t = Date.now() - this.started;
    var lean = null;
    var valid = false;
    if (this.source === "camera") {
      if (this.frameLean != null) {
        lean = this.frameLean;
        valid = true;
      }
    } else {
      lean = this.simulatedLean(t);
      valid = true;
    }
    this.samples.push({ t: t, lean: valid ? lean : null, valid: valid });
    if (valid && lean > pose.LIMITS.leanDeg) {
      this.overMs += 500;
      if (this.overMs >= pose.LIMITS.holdMs && Date.now() > this.coolUntil) {
        wx.vibrateShort({ type: "medium" });
        this.coolUntil = Date.now() + 8000;
        this.overMs = 0;
      }
    } else this.overMs = 0;
  },
  simulatedLean: function (t) {
    var lean = 1.3 + 0.15 * Math.sin(t / 700);
    if (this.live && t >= this.live.start) {
      var add = [0.9, 1.8, 4.6, 5.6, 6.4][this.level - 1] || 1;
      lean += add * Math.min(1, (t - this.live.start) / 2200);
    }
    return Math.max(0, lean);
  },
  hold: function () {
    this.qInExercise = 0;
    this.chain = {};
    this.askNext();
  },
  askNext: function () {
    var made = qlib.makeQuestion(this.level, this.chain);
    this.correct = made.correct;
    this.gridTarget = made.target;
    this.wordCat = made.category;
    this.wordList = [];
    this.locked = false;
    this.live = { start: Date.now() - this.started, level: this.level };
    this.sampleOnce();
    this.setData({
      phase: "ask",
      word: "",
      wordList: [],
      q: {
        type: made.type,
        prompt: made.prompt,
        giant: made.giant || "",
        giantColor: made.giantColor || "#102910",
        options: made.options || [],
        cells: made.cells || [],
        n: this.questions.length + 1,
      },
    });
  },
  pick: function (e) {
    if (this.locked) return;
    this.locked = true;
    this.finishQuestion(e.currentTarget.dataset.v === String(this.correct));
  },
  strike: function (e) {
    var i = Number(e.currentTarget.dataset.i);
    var cells = this.data.q.cells.map(function (c) {
      return c.i === i ? Object.assign({}, c, { struck: !c.struck }) : c;
    });
    this.setData({ "q.cells": cells });
  },
  gridDone: function () {
    if (this.locked) return;
    this.locked = true;
    var cells = this.data.q.cells;
    var ok = true;
    var self = this;
    cells.forEach(function (c) {
      var hit = !!c.struck;
      if ((c.n === self.gridTarget && !hit) || (c.n !== self.gridTarget && hit)) ok = false;
    });
    this.finishQuestion(ok);
  },
  onWord: function (e) { this.setData({ word: e.detail.value }); },
  addWord: function () {
    var w = (this.data.word || "").replace(/\s/g, "");
    if (!w) return;
    this.wordList.push(w);
    this.setData({ word: "", wordList: this.wordList });
  },
  wordDone: function () {
    if (this.locked) return;
    this.locked = true;
    this.finishQuestion(qlib.wordOk(this.wordCat, this.wordList || []));
  },
  finishQuestion: function (ok) {
    this.sampleOnce();
    var end = Date.now() - this.started;
    var q = this.data.q;
    this.questions.push({
      n: q.n,
      level: this.level,
      difficulty: this.level,
      type: q.type,
      prompt: q.prompt,
      start: this.live.start,
      end: end,
      rt: end - this.live.start,
      correct: !!ok,
    });
    this.live = null;
    this.qInExercise += 1;
    if (this.qInExercise < 2) {
      this.askNext();
      return;
    }
    this.exercise = (this.data.exercise || 0) + 1;
    if (this.exercise < 3) {
      this.chain = {};
      this.setData({ phase: "setup", exercise: this.exercise, ex: EXS[this.exercise] });
      wx.setNavigationBarTitle({ title: EXS[this.exercise].name });
    } else this.finish();
  },
  finish: function () {
    var samples = this.samples.slice();
    var source = this.source;
    var photoCount = this.photoCount || 0;
    this.stopMonitor();
    if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload();
    var questions = this.questions.map(function (q) {
      var during = samples.filter(function (s) { return s.valid && s.t >= q.start && s.t <= q.end; });
      var base = samples.filter(function (s) { return s.valid && s.t >= q.start - 2000 && s.t < q.start; });
      q.leanMean = avg(during);
      q.leanBase = avg(base);
      q.cost = q.leanMean != null && q.leanBase != null ? q.leanMean - q.leanBase : null;
      return q;
    });
    var spans = [];
    var open = null;
    samples.forEach(function (s) {
      var over = s.valid && s.lean > pose.LIMITS.leanDeg;
      if (over) {
        if (!open) open = { t0: s.t, t1: s.t };
        else open.t1 = s.t;
      } else if (open) {
        spans.push(open);
        open = null;
      }
    });
    if (open) spans.push(open);
    spans.forEach(function (sp) {
      sp.long = sp.t1 - sp.t0 >= 2500;
      var mid = (sp.t0 + sp.t1) / 2;
      questions.forEach(function (q) {
        if (mid >= q.start && mid <= q.end) {
          sp.questionN = q.n;
          sp.level = q.level;
        }
      });
    });
    var correctN = questions.filter(function (q) { return q.correct; }).length;
    var accuracy = questions.length ? correctN / questions.length : 0;
    var meanRt = questions.length ? questions.reduce(function (s, q) { return s + q.rt; }, 0) / questions.length : 0;
    var obvious = spans.some(function (sp) { return sp.long; }) || questions.some(function (q) {
      return q.leanMean != null && q.leanMean > pose.LIMITS.leanDeg;
    });
    var db = store.load();
    var rule = sim.nextLevel(this.level, accuracy, db.streak, obvious);
    var text = advice.adviceText(this.level, rule, accuracy, obvious);
    var session = {
      id: "s" + Date.now(),
      at: Date.now(),
      level: this.level,
      accuracy: accuracy,
      meanRt: meanRt,
      obviousLean: obvious,
      adviceTitle: text.title,
      adviceDetail: text.detail,
      nextLevel: rule.level,
      postureSource: source,
      threshold: pose.LIMITS.leanDeg,
      samples: samples,
      questions: questions,
      overSpans: spans,
      photoCount: photoCount,
    };
    db.sessions.push(session);
    db.level = rule.level;
    db.streak = rule.streak;
    store.save(db);
    this.finished = true;
    wx.redirectTo({ url: "/pages/result/result?id=" + session.id });
  },
});

function avg(arr) {
  if (!arr.length) return null;
  var s = 0;
  arr.forEach(function (x) { s += x.lean; });
  return s / arr.length;
}
