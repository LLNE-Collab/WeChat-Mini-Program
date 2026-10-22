(function (root) {
  /** 假设界限：肩高差 2 cm，侧倾 5°。只作提醒，不是诊断标准。 */
  var LIMITS = { shoulderCm: 2, leanDeg: 5, shoulderRiseCm: 0.8, holdMs: 3000 };
  var SHOULDER_WIDTH_CM = 38;

  function dist(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function meanLuminance(img) {
    var c = document.createElement("canvas");
    var w = 40;
    var h = 40;
    c.width = w;
    c.height = h;
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data;
    var sum = 0;
    var n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) {
      sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    }
    return sum / n;
  }

  /**
   * 四点：左肩、右肩、左髋、右髋。像素坐标。
   * 肩宽按 38 cm 换算。只适合和本人基线比。
   */
  function measure(pts, img) {
    if (!pts || pts.length < 4) {
      return { ok: false, reason: "四个点还没点完。" };
    }
    var ls = pts[0];
    var rs = pts[1];
    var lh = pts[2];
    var rh = pts[3];
    var sw = dist(ls, rs);
    var hw = dist(lh, rh);
    if (sw < img.width * 0.12 || hw < img.width * 0.1) {
      return { ok: false, reason: "肩膀或髋看不清。这次先不给数字，请重拍一张，让两边肩膀和髋都露出来。" };
    }
    var shoulderY = (ls.y + rs.y) / 2;
    var hipY = (lh.y + rh.y) / 2;
    if (hipY < shoulderY + img.height * 0.08) {
      return { ok: false, reason: "这四个点对不上肩膀和髋。这次先不给数字，请重拍或重新点。" };
    }
    var cmPerPx = SHOULDER_WIDTH_CM / sw;
    var diff = Math.abs(ls.y - rs.y) * cmPerPx;
    var higher = "两边差不多";
    if (Math.abs(ls.y - rs.y) * cmPerPx >= 0.2) {
      higher = ls.y < rs.y ? "左肩高一点" : "右肩高一点";
    }
    var mx1 = (ls.x + rs.x) / 2;
    var mx2 = (lh.x + rh.x) / 2;
    var lean = (Math.atan2(mx1 - mx2, hipY - shoulderY) * 180) / Math.PI;
    return {
      ok: true,
      shoulderCm: diff,
      higher: higher,
      lean: lean,
      shoulderOver: diff >= LIMITS.shoulderCm,
      leanOver: Math.abs(lean) >= LIMITS.leanDeg,
    };
  }

  function describe(cur, baseline) {
    if (!baseline) {
      return {
        title: "这是您的第一次",
        body: "已经记下来了。以后每次都和这一次比，不和别人比。",
      };
    }
    var dS = cur.shoulderCm - baseline.shoulderCm;
    var dL = Math.abs(cur.lean) - Math.abs(baseline.lean);
    var lines = [];
    if (dS < -0.3) lines.push("和您第一次相比，两边肩膀更齐了一些。");
    else if (dS > 0.3) lines.push("和您第一次相比，两边肩膀的高度差多了一点点。");
    else lines.push("和您第一次相比，两边肩膀差不多，保持得挺稳。");
    if (dL < -1) lines.push("身子也比第一次更正一些。");
    else if (dL > 1) lines.push("身子比第一次又侧了一点点。可以对着镜子，把气放稳，头顶轻轻领正。");
    else lines.push("侧着的角度和第一次差不多。");
    if (cur.shoulderOver || cur.leanOver || dS >= LIMITS.shoulderRiseCm) {
      lines.push("有一个数过了界限。界限只是提醒，不是评价您的样子。对着镜子调一调就好。");
    }
    return { title: "和第一次比", body: lines.join("") };
  }

  function estimateLean(video) {
    if (!video || !video.videoWidth) return null;
    var w = 96;
    var h = 128;
    var canvas = estimateLean._c || (estimateLean._c = document.createElement("canvas"));
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h).data;
    function centroid(y0, y1) {
      var sx = 0;
      var sw = 0;
      var n = 0;
      for (var y = y0; y < y1; y++) {
        for (var x = 6; x < w - 6; x++) {
          var i = (y * w + x) * 4;
          var r = d[i];
          var g = d[i + 1];
          var b = d[i + 2];
          var lum = 0.3 * r + 0.59 * g + 0.11 * b;
          var sat = Math.max(r, g, b) - Math.min(r, g, b);
          var weight = lum < 185 ? 185 - lum : sat > 28 ? sat : 0;
          if (weight > 12) {
            sx += x * weight;
            sw += weight;
            n++;
          }
        }
      }
      if (sw < 80 || n < 24) return null;
      return sx / sw;
    }
    var up = centroid(34, 60);
    var lo = centroid(72, 110);
    if (up == null || lo == null) return null;
    return (Math.atan2(up - lo, 48) * 180) / Math.PI;
  }

  function drawSample(canvas) {
    var w = 360;
    var h = 520;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.maxWidth = w + "px";
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#F4F7F5";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#D5DDD8";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w / 2, 36);
    g.lineTo(w / 2, h - 28);
    g.stroke();
    g.strokeStyle = "#1F6B40";
    g.fillStyle = "#E7F3EC";
    g.lineWidth = 8;
    g.lineCap = "round";
    g.beginPath();
    g.arc(w / 2, 78, 28, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(92, 168);
    g.lineTo(268, 168);
    g.stroke();
    g.beginPath();
    g.moveTo(w / 2, 110);
    g.lineTo(w / 2, 300);
    g.stroke();
    g.beginPath();
    g.moveTo(118, 318);
    g.lineTo(242, 318);
    g.stroke();
    g.beginPath();
    g.moveTo(118, 318);
    g.lineTo(108, 470);
    g.moveTo(242, 318);
    g.lineTo(252, 470);
    g.stroke();
    var dots = [
      [92, 168],
      [268, 168],
      [118, 318],
      [242, 318],
    ];
    dots.forEach(function (p) {
      g.beginPath();
      g.fillStyle = "#1F6B40";
      g.arc(p[0], p[1], 7, 0, Math.PI * 2);
      g.fill();
    });
    return {
      width: w,
      height: h,
      hint: dots.map(function (p) {
        return { x: p[0], y: p[1] };
      }),
    };
  }

  root.SHPose = {
    LIMITS: LIMITS,
    SHOULDER_WIDTH_CM: SHOULDER_WIDTH_CM,
    measure: measure,
    describe: describe,
    meanLuminance: meanLuminance,
    estimateLean: estimateLean,
    drawSample: drawSample,
  };
})(window);
