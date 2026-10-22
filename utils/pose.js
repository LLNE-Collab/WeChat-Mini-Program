var LIMITS = { shoulderCm: 2, leanDeg: 5, shoulderRiseCm: 0.8, holdMs: 3000 };
var SHOULDER_WIDTH_CM = 38;

function dist(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function measure(pts, img) {
  if (!pts || pts.length < 4) return { ok: false, reason: "四个点还没点完。" };
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
  var diff = Math.abs(ls.y - rs.y) * (SHOULDER_WIDTH_CM / sw);
  var higher = "两边差不多";
  if (diff >= 0.2) higher = ls.y < rs.y ? "左肩高一点" : "右肩高一点";
  var lean = (Math.atan2((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2, hipY - shoulderY) * 180) / Math.PI;
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
    return { title: "这是您的第一次", body: "已经记下来了。以后每次都和这一次比，不和别人比。" };
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

function leanFromBuffer(data, width, height) {
  if (!data || !width || !height) return null;
  var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  function centroid(y0, y1) {
    var sx = 0;
    var sw = 0;
    var n = 0;
    var step = 3;
    for (var y = y0; y < y1; y += step) {
      for (var x = 4; x < width - 4; x += step) {
        var i = (y * width + x) * 4;
        var r = bytes[i];
        var g = bytes[i + 1];
        var b = bytes[i + 2];
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
    if (sw < 40 || n < 12) return null;
    return sx / sw;
  }
  var up = centroid(Math.floor(height * 0.28), Math.floor(height * 0.48));
  var lo = centroid(Math.floor(height * 0.56), Math.floor(height * 0.86));
  if (up == null || lo == null) return null;
  return (Math.atan2(up - lo, height * 0.35) * 180) / Math.PI;
}

module.exports = {
  LIMITS: LIMITS,
  measure: measure,
  describe: describe,
  leanFromBuffer: leanFromBuffer,
};
