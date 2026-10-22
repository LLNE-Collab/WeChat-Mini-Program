function drawCobb(g, w, h, curves, week) {
  g.clearRect(0, 0, w, h);
  var pad = { l: 36, r: 12, t: 16, b: 28 };
  var all = curves.none.concat(curves.single, curves.dual);
  var min = all[0].cobb;
  var max = min;
  all.forEach(function (r) {
    if (r.cobb < min) min = r.cobb;
    if (r.cobb > max) max = r.cobb;
  });
  min = Math.floor(min - 0.4);
  max = Math.ceil(max + 0.4);
  if (max === min) max = min + 1;
  function x(wk) { return pad.l + ((w - pad.l - pad.r) * wk) / 12; }
  function y(v) { return pad.t + ((max - v) / (max - min)) * (h - pad.t - pad.b); }
  g.strokeStyle = "#E4DEE8";
  g.lineWidth = 1;
  g.fillStyle = "#8A8494";
  g.font = "12px sans-serif";
  g.textAlign = "right";
  for (var i = 0; i <= 4; i++) {
    var v = min + ((max - min) * i) / 4;
    var yy = y(v);
    g.beginPath();
    g.moveTo(pad.l, yy);
    g.lineTo(w - pad.r, yy);
    g.stroke();
    g.fillText(v.toFixed(0) + "°", pad.l - 4, yy + 4);
  }
  g.textAlign = "center";
  [0, 4, 8, 12].forEach(function (wk) { g.fillText(String(wk), x(wk), h - 8); });
  if (week != null) {
    g.strokeStyle = "#C5D5E0";
    g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(x(week), pad.t);
    g.lineTo(x(week), h - pad.b);
    g.stroke();
    g.setLineDash([]);
  }
  [
    { key: "none", color: "#8A8494", width: 2.5 },
    { key: "single", color: "#A9C3D4", width: 3 },
    { key: "dual", color: "#3E6F8A", width: 3.5 },
  ].forEach(function (s) {
    g.beginPath();
    curves[s.key].forEach(function (r, idx) {
      var px = x(r.w);
      var py = y(r.cobb);
      if (idx === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.strokeStyle = s.color;
    g.lineWidth = s.width;
    g.lineJoin = "round";
    g.stroke();
  });
}

function drawMech(g, w, h, dual) {
  g.clearRect(0, 0, w, h);
  var pad = { l: 36, r: 12, t: 16, b: 28 };
  function x(wk) { return pad.l + ((w - pad.l - pad.r) * wk) / 12; }
  function y(v) { return pad.t + (1 - v) * (h - pad.t - pad.b); }
  g.strokeStyle = "#E4DEE8";
  g.font = "12px sans-serif";
  g.fillStyle = "#8A8494";
  g.textAlign = "right";
  [0, 0.5, 1].forEach(function (v) {
    var yy = y(v);
    g.beginPath();
    g.moveTo(pad.l, yy);
    g.lineTo(w - pad.r, yy);
    g.stroke();
    g.fillText(String(v), pad.l - 4, yy + 4);
  });
  function line(getter, color) {
    g.beginPath();
    dual.forEach(function (r, idx) {
      var px = x(r.w);
      var py = y(getter(r));
      if (idx === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.strokeStyle = color;
    g.lineWidth = 2.5;
    g.stroke();
  }
  line(function (r) { return r.auto; }, "#5E516C");
  line(function (r) { return r.conflict; }, "#7FA3B8");
}

function drawSession(g, w, h, session) {
  g.clearRect(0, 0, w, h);
  var samples = (session.samples || []).filter(function (s) { return s.valid && s.lean != null; });
  var pad = { l: 34, r: 10, t: 16, b: 26 };
  var tMax = samples.length ? samples[samples.length - 1].t : 1;
  (session.questions || []).forEach(function (q) { if (q.end > tMax) tMax = q.end; });
  tMax = Math.max(tMax, 1000);
  var maxLean = 8;
  samples.forEach(function (s) { maxLean = Math.max(maxLean, Math.abs(s.lean) + 1); });
  function x(t) { return pad.l + ((w - pad.l - pad.r) * t) / tMax; }
  function y(v) { return pad.t + ((maxLean - v) / maxLean) * (h - pad.t - pad.b); }
  (session.questions || []).forEach(function (q) {
    g.fillStyle = "rgba(50, 205, 50, 0.16)";
    g.fillRect(x(q.start), pad.t, Math.max(2, x(q.end) - x(q.start)), h - pad.t - pad.b);
  });
  (session.overSpans || []).forEach(function (sp) {
    g.fillStyle = "rgba(211, 47, 47, 0.22)";
    g.fillRect(x(sp.t0), pad.t, Math.max(2, x(sp.t1) - x(sp.t0)), h - pad.t - pad.b);
  });
  g.strokeStyle = "#E1EDE2";
  g.fillStyle = "#5F6F62";
  g.font = "12px sans-serif";
  g.textAlign = "right";
  for (var i = 0; i <= 4; i++) {
    var v = (maxLean * i) / 4;
    var yy = y(v);
    g.beginPath();
    g.moveTo(pad.l, yy);
    g.lineTo(w - pad.r, yy);
    g.stroke();
    g.fillText(v.toFixed(0) + "°", pad.l - 4, yy + 4);
  }
  var limit = session.threshold || 5;
  g.strokeStyle = "#D32F2F";
  g.setLineDash([5, 4]);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(pad.l, y(limit));
  g.lineTo(w - pad.r, y(limit));
  g.stroke();
  g.setLineDash([]);
  if (samples.length) {
    g.beginPath();
    samples.forEach(function (s, idx) {
      var px = x(s.t);
      var py = y(Math.max(0, s.lean));
      if (idx === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.strokeStyle = "#1F7A32";
    g.lineWidth = 2.4;
    g.stroke();
  }
}

function paint(page, selector, drawer) {
  var query = wx.createSelectorQuery().in(page);
  query.select(selector).fields({ node: true, size: true }).exec(function (res) {
    if (!res || !res[0] || !res[0].node) return;
    var canvas = res[0].node;
    var ctx = canvas.getContext("2d");
    var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2) || 2;
    var w = res[0].width;
    var h = res[0].height;
    if (!w || !h) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawer(ctx, w, h);
  });
}

module.exports = { drawCobb: drawCobb, drawMech: drawMech, drawSession: drawSession, paint: paint };
