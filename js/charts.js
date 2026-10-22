(function (root) {
  function fit(canvas, cssH) {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 320;
    var h = cssH || 220;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.height = h + "px";
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g: g, w: w, h: h };
  }

  function drawCobb(canvas, curves, week) {
    var box = fit(canvas, 230);
    var g = box.g;
    var w = box.w;
    var h = box.h;
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
    function x(wk) {
      return pad.l + ((w - pad.l - pad.r) * wk) / 12;
    }
    function y(v) {
      return pad.t + ((max - v) / (max - min)) * (h - pad.t - pad.b);
    }
    g.strokeStyle = "#E4DEE8";
    g.lineWidth = 1;
    g.fillStyle = "#8A8494";
    g.font = "12px Microsoft YaHei, sans-serif";
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
    g.fillStyle = "#8A8494";
    [0, 4, 8, 12].forEach(function (wk) {
      g.fillText(String(wk), x(wk), h - 8);
    });
    if (week != null) {
      g.strokeStyle = "#C5D5E0";
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(x(week), pad.t);
      g.lineTo(x(week), h - pad.b);
      g.stroke();
      g.setLineDash([]);
    }
    var styles = [
      { key: "none", color: "#8A8494", width: 2.5 },
      { key: "single", color: "#A9C3D4", width: 3 },
      { key: "dual", color: "#3E6F8A", width: 3.5 },
    ];
    styles.forEach(function (s) {
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

  function drawMech(canvas, dual) {
    var box = fit(canvas, 200);
    var g = box.g;
    var w = box.w;
    var h = box.h;
    g.clearRect(0, 0, w, h);
    var pad = { l: 36, r: 12, t: 16, b: 28 };
    function x(wk) {
      return pad.l + ((w - pad.l - pad.r) * wk) / 12;
    }
    function y(v) {
      return pad.t + (1 - v) * (h - pad.t - pad.b);
    }
    g.strokeStyle = "#E4DEE8";
    g.font = "12px Microsoft YaHei, sans-serif";
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
    line(function (r) {
      return r.auto;
    }, "#5E516C");
    line(function (r) {
      return r.conflict;
    }, "#7FA3B8");
    g.textAlign = "center";
    g.fillStyle = "#8A8494";
    g.fillText("周", w / 2, h - 8);
  }

  function drawSession(canvas, session) {
    var box = fit(canvas, 240);
    var g = box.g;
    var w = box.w;
    var h = box.h;
    g.clearRect(0, 0, w, h);
    var samples = (session.samples || []).filter(function (s) {
      return s.valid && s.lean != null;
    });
    var pad = { l: 34, r: 10, t: 16, b: 26 };
    var tMax = samples.length ? samples[samples.length - 1].t : 1;
    (session.questions || []).forEach(function (q) {
      if (q.end > tMax) tMax = q.end;
    });
    tMax = Math.max(tMax, 1000);
    var maxLean = 8;
    samples.forEach(function (s) {
      maxLean = Math.max(maxLean, Math.abs(s.lean) + 1);
    });
    function x(t) {
      return pad.l + ((w - pad.l - pad.r) * t) / tMax;
    }
    function y(v) {
      return pad.t + ((maxLean - v) / (maxLean - 0)) * (h - pad.t - pad.b);
    }
    (session.questions || []).forEach(function (q) {
      g.fillStyle = "rgba(50, 205, 50, 0.16)";
      var x0 = x(q.start);
      var x1 = x(q.end);
      g.fillRect(x0, pad.t, Math.max(2, x1 - x0), h - pad.t - pad.b);
    });
    (session.overSpans || []).forEach(function (sp) {
      g.fillStyle = "rgba(211, 47, 47, 0.22)";
      var x0 = x(sp.t0);
      var x1 = x(sp.t1);
      g.fillRect(x0, pad.t, Math.max(2, x1 - x0), h - pad.t - pad.b);
    });
    g.strokeStyle = "#E1EDE2";
    g.fillStyle = "#5F6F62";
    g.font = "12px Microsoft YaHei, sans-serif";
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
    g.textAlign = "left";
    g.fillStyle = "#D32F2F";
    g.fillText("界限", pad.l + 4, y(limit) - 4);
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
    g.fillStyle = "#1A3D1A";
    g.font = "12px Microsoft YaHei, sans-serif";
    g.textAlign = "center";
    (session.questions || []).forEach(function (q) {
      var label = q.n + "题·" + q.level + "级";
      g.fillText(label, (x(q.start) + x(q.end)) / 2, h - 8);
    });
  }

  root.SHCharts = { drawCobb: drawCobb, drawMech: drawMech, drawSession: drawSession };
})(window);
