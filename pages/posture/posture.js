var store = require("../../utils/store.js");
var pose = require("../../utils/pose.js");

var NAMES = ["左肩", "右肩", "左髋", "右髋"];
var COLORS = ["#2197A9", "#32CD32", "#607D8B", "#6E5A7B"];

Page({
  data: {
    step: "intro",
    intro: "",
    source: "",
    src: "",
    nextName: "点击左肩",
    dots: [],
    report: null,
    canSave: false,
    saved: false,
    refused: "",
  },
  onLoad: function (query) {
    this.mode = query && query.mode === "review" ? "review" : "check";
    this.points = [];
    this.setData({
      intro: this.mode === "review"
        ? "训练完成，查看自己姿势。"
        : "日常查看时，站在地上固定标记处，保持距离、高度、朝向不变。",
    });
  },
  shoot: function () { this.pick(["camera"]); },
  album: function () { this.pick(["album"]); },
  pick: function (sourceType) {
    var self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: sourceType,
      success: function (res) {
        var path = res.tempFiles[0].tempFilePath;
        wx.getImageInfo({
          src: path,
          success: function (info) {
            self.checkDark(path, function (dark) {
              if (dark) {
                self.refuse("图片不清晰，未识别到肩膀或髋。请重拍一张。");
                return;
              }
              self.imgW = info.width;
              self.imgH = info.height;
              self.points = [];
              self.setData({ step: "mark", source: "photo", src: path, dots: [], report: null, saved: false, nextName: "点击左肩" });
            });
          },
        });
      },
    });
  },
  checkDark: function (path, cb) {
    try {
      var canvas = wx.createOffscreenCanvas({ type: "2d", width: 40, height: 40 });
      var ctx = canvas.getContext("2d");
      var img = canvas.createImage();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, 40, 40);
        var d = ctx.getImageData(0, 0, 40, 40).data;
        var sum = 0;
        for (var i = 0; i < d.length; i += 4) sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        cb(sum / (d.length / 4) < 28);
      };
      img.onerror = function () { cb(false); };
      img.src = path;
    } catch (e) {
      cb(false);
    }
  },
  sample: function () {
    this.points = [];
    this.imgW = 360;
    this.imgH = 520;
    this.setData({ step: "mark", source: "sample", report: null, saved: false, nextName: "点击左肩", dots: [] });
    var self = this;
    wx.nextTick(function () { self.paintSample(); });
  },
  paintSample: function () {
    var self = this;
    wx.createSelectorQuery().in(this).select("#sample").fields({ node: true, size: true }).exec(function (res) {
      if (!res[0] || !res[0].node) return;
      var canvas = res[0].node;
      var ctx = canvas.getContext("2d");
      var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2) || 2;
      var w = res[0].width;
      var h = res[0].height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      self.imgW = w;
      self.imgH = h;
      ctx.fillStyle = "#F4F7F5";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#D5DDD8";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 16);
      ctx.lineTo(w / 2, h - 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#1F6B40";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.16, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.26, h * 0.32);
      ctx.lineTo(w * 0.74, h * 0.32);
      ctx.moveTo(w / 2, h * 0.2);
      ctx.lineTo(w / 2, h * 0.58);
      ctx.moveTo(w * 0.33, h * 0.61);
      ctx.lineTo(w * 0.67, h * 0.61);
      ctx.moveTo(w * 0.33, h * 0.61);
      ctx.lineTo(w * 0.3, h * 0.9);
      ctx.moveTo(w * 0.67, h * 0.61);
      ctx.lineTo(w * 0.7, h * 0.9);
      ctx.stroke();
      var guides = [
        [w * 0.26, h * 0.32],
        [w * 0.74, h * 0.32],
        [w * 0.33, h * 0.61],
        [w * 0.67, h * 0.61],
      ];
      guides.forEach(function (p) {
        ctx.beginPath();
        ctx.fillStyle = "#1F6B40";
        ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
        ctx.fill();
      });
      self.points.forEach(function (p, i) {
        ctx.beginPath();
        ctx.fillStyle = COLORS[i];
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  },
  onImageTap: function (e) {
    if (this.points.length >= 4) return;
    var x = e.detail.x;
    var y = e.detail.y;
    var self = this;
    wx.createSelectorQuery().in(this).select("#shot").boundingClientRect(function (rect) {
      if (!rect) return;
      self.addPoint(((x - rect.left) / rect.width) * self.imgW, ((y - rect.top) / rect.height) * self.imgH);
    }).exec();
  },
  onSample: function (e) {
    if (this.points.length >= 4) return;
    var t = e.touches[0];
    var self = this;
    wx.createSelectorQuery().in(this).select("#sample").boundingClientRect(function (rect) {
      if (!rect) return;
      var x = t.clientX != null ? t.clientX : t.x;
      var y = t.clientY != null ? t.clientY : t.y;
      self.addPoint(((x - rect.left) / rect.width) * self.imgW, ((y - rect.top) / rect.height) * self.imgH);
    }).exec();
  },
  addPoint: function (x, y) {
    this.points.push({ x: x, y: y });
    if (this.points.length === 4) {
      var result = pose.measure(this.points, { width: this.imgW, height: this.imgH });
      if (!result.ok) {
        this.refuse(result.reason);
        return;
      }
      this.showReport(result);
    }
    this.refreshDots();
    if (this.data.source === "sample") this.paintSample();
  },
  refreshDots: function () {
    var self = this;
    this.setData({
      nextName: this.points.length < 4 ? "请点" + NAMES[this.points.length] : "四个点齐了",
      dots: this.points.map(function (p, i) {
        return { left: (p.x / self.imgW) * 100, top: (p.y / self.imgH) * 100, color: COLORS[i] };
      }),
    });
  },
  showReport: function (m) {
    var base = this.data.source === "sample" ? null : store.load().baseline;
    var text = pose.describe(m, base);
    if (this.data.source === "sample") {
      text = { title: "示意图", body: "点击正确选项即可看到数字。示意图不记入您的记录。对比自己动作，请拍摄您的照片。" };
    }
    this.result = m;
    this.setData({
      report: {
        title: text.title,
        body: text.body,
        higher: m.higher,
        shoulderText: m.shoulderCm.toFixed(1) + " 厘米",
        leanText: Math.abs(m.lean).toFixed(1) + "°",
        shoulderOver: m.shoulderOver,
        leanOver: m.leanOver,
      },
      canSave: this.data.source !== "sample" && !this.data.saved,
    });
  },
  undo: function () {
    this.points.pop();
    this.result = null;
    this.setData({ report: null, canSave: false });
    this.refreshDots();
    if (this.data.source === "sample") this.paintSample();
  },
  unclear: function () {
    this.refuse("未识别到肩膀或髋。请重拍一张，让两边肩膀和髋都露出来。");
  },
  refuse: function (reason) {
    if (this.data.source !== "sample") {
      var db = store.load();
      db.postures.push({ id: "p" + Date.now(), at: Date.now(), refused: reason, mode: this.mode });
      store.save(db);
    }
    this.setData({ step: "refused", refused: reason });
  },
  savePose: function () {
    if (!this.result || this.data.source === "sample" || this.data.saved) return;
    var m = this.result;
    var rec = {
      id: "p" + Date.now(),
      at: Date.now(),
      mode: this.mode,
      shoulderCm: Math.round(m.shoulderCm * 10) / 10,
      lean: Math.round(m.lean * 10) / 10,
      higher: m.higher,
      shoulderOver: m.shoulderOver,
      leanOver: m.leanOver,
    };
    var db = store.load();
    if (!db.baseline) db.baseline = { shoulderCm: rec.shoulderCm, lean: rec.lean, at: rec.at };
    db.postures.push(rec);
    store.save(db);
    this.setData({ saved: true, canSave: false });
  },
  again: function () {
    this.points = [];
    this.result = null;
    this.setData({ step: "intro", report: null, saved: false, src: "" });
  },
  home: function () { wx.switchTab({ url: "/pages/home/home" }); },
});
