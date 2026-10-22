/**
 * 双行立衡 · 简化仿真
 * 默认档案对齐方案算例：左侧全切、术后 4 个月、肩高差 1.6 cm、
 * 体质指数 23、化疗 4 周期、基线认知 27、居家完成度 80%。
 * 第 0 周资源池数字固定写在 referenceWeek0()，供推演页与方案对照。
 * 凡未注明文献来源的系数，均为假设参数，只用于示意。
 */
var SHSim = (function () {
  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function round(n, d) {
    var p = Math.pow(10, d || 0);
    return Math.round(n * p) / p;
  }

  /** 方案图 3：第 0 周资源池（默认档案、认知任务按第 3 级计） */
  function referenceWeek0() {
    return {
      pool: 48,
      posture: 37.7,
      cognitive: 29,
      deficit: 18.7,
      conflict: 0.39,
      automation: 0.05,
    };
  }

  function normalize(input) {
    input = input || {};
    var activity = input.activity || "light";
    if (["rare", "light", "often", "regular"].indexOf(activity) < 0) activity = "light";
    return {
      side: input.side === "right" ? "right" : "left",
      months: clamp(num(input.months, 4), 0, 120),
      weight: clamp(num(input.weight, 58), 30, 150),
      bmi: clamp(num(input.bmi, 23), 14, 45),
      shoulder: clamp(num(input.shoulder, 1.6), 0, 8),
      chemoRegimen: input.chemoRegimen || "none",
      chemoCycles: clamp(num(input.chemoCycles, 4), 0, 16),
      cognition: clamp(num(input.cognition, 27), 0, 30),
      activity: activity,
      adherence: clamp(num(input.adherence, 80), 0, 100) / 100,
      quality: clamp(num(input.quality, 90), 0, 100) / 100,
      level: clamp(Math.round(num(input.level, 3)), 1, 5),
    };
  }

  /** 由基线估计当前 Cobb 角（度）。默认档案 = 13.2 */
  function baselineCobb(p) {
    return (
      5.75 +
      p.shoulder * 3.5 +
      p.months * 0.4 +
      p.chemoCycles * 0.15 +
      Math.max(p.bmi - 22, 0) * 0.1 -
      (p.cognition - 24) * 0.15
    );
  }

  /** 不干预时每周 Cobb 角增量。默认档案约 0.283°/周 */
  function driftPerWeek(p) {
    var act = { rare: 1.1, light: 1, often: 0.94, regular: 0.88 }[p.activity] || 1;
    var base =
      0.118 +
      p.shoulder * 0.05 +
      p.chemoCycles * 0.015 +
      (p.bmi - 20) * 0.006 +
      Math.max(28 - p.cognition, 0) * 0.008;
    return base * act;
  }

  /** 中枢资源池。化疗 4 周期时为 48 */
  function poolOf(p) {
    return Math.max(30, 54 - p.chemoCycles * 1.5);
  }

  function cogCostOf(level) {
    return [17, 23, 29, 35, 41][level - 1];
  }

  function leanFromShoulder(cm) {
    return (Math.atan2(cm, 38) * 180) / Math.PI;
  }

  /**
   * 相对「完成度 80%、动作质量 100%」的训练效力。
   * 完成度减半不会把效果打没，便于对齐「降到 40% 约升高 0.7°」。
   */
  function trainScale(p) {
    var ratio = Math.max(p.adherence, 0) / 0.8;
    var adh = 0.48 + 0.52 * Math.pow(Math.min(ratio, 1.35), 0.55);
    var quality = 0.78 + 0.22 * p.quality;
    return adh * quality;
  }

  function project(input, weeks) {
    var p = normalize(input);
    weeks = clamp(Math.round(num(weeks, 12)), 1, 16);
    var cobb0 = baselineCobb(p);
    var drift = driftPerWeek(p);
    var pool = poolOf(p);
    var names = ["none", "single", "dual"];
    var out = {};

    names.forEach(function (sc) {
      var cobb = cobb0;
      var shoulder = p.shoulder;
      var auto = 0.05;
      var rows = [];
      var scale = sc === "none" ? 0 : trainScale(p);
      var chemoExtra = Math.max(0, p.chemoCycles - 4);
      var levelBoost = 1 + (p.level - 3) * 0.035;

      for (var w = 0; w <= weeks; w++) {
        var postureRaw = 34 + shoulder * 2.5;
        var posture = postureRaw * (1 - 0.185 * auto);
        var cog = sc === "dual" ? cogCostOf(p.level) : sc === "single" ? cogCostOf(p.level) * 0.12 : 0;
        var deficit = Math.max(0, posture + cog - pool);
        var conflict = deficit / pool;
        var sym = symmetryAt(sc, w, weeks, scale);
        rows.push({
          w: w,
          cobb: cobb,
          shoulder: Math.max(0, shoulder),
          sym: sym,
          auto: auto,
          conflict: conflict,
          lean: leanFromShoulder(shoulder),
        });
        if (w === weeks) break;

        if (sc === "dual") {
          auto = clamp(auto + 0.0558 * scale * (1 + 0.025 * (p.level - 3)), 0.05, 0.9);
        } else if (sc === "single") {
          auto = clamp(auto + 0.01 * scale, 0.05, 0.3);
        }

        var immediate = 0;
        var later = 0;
        if (sc === "single") immediate = drift * 0.8 * scale;
        if (sc === "dual") {
          immediate = drift * 0.972 * scale;
          later = drift * 0.34 * auto * scale * levelBoost;
        }
        // 化疗多出来的部分，训练抵消不完。+2 个周期时，双任务第 12 周大约 +0.4°。
        var chemoDrag = chemoExtra * 0.0055 * (sc === "dual" ? 1 : sc === "single" ? 1.2 : 1.5);
        cobb = cobb + drift + chemoDrag - immediate - later;

        if (sc === "none") shoulder = p.shoulder + (cobb - cobb0) * 0.16;
        else if (sc === "single") shoulder = p.shoulder + (cobb - cobb0) * 0.12;
        else shoulder = p.shoulder + (cobb - cobb0) * 0.35;
        shoulder = clamp(shoulder, 0.2, 8);
      }
      out[sc] = rows;
    });

    return { profile: p, cobb0: cobb0, drift: drift, pool: pool, weeks: weeks, series: out };
  }

  function symmetryAt(sc, w, weeks, effort) {
    var end = sc === "none" ? 0.67 : sc === "single" ? 0.82 : 0.92;
    var reach = sc === "none" ? 1 : clamp(effort / 0.92, 0, 1);
    var start = 0.78;
    return start + (end - start) * (w / weeks) * reach;
  }

  function band(center, half) {
    return [round(center - half, 1), round(center + half, 1)];
  }

  function activityLabel(key) {
    return { rare: "很少活动", light: "轻度家务", often: "经常走动", regular: "规律活动" }[key] || "轻度家务";
  }

  function sideLabel(side) {
    return side === "right" ? "右" : "左";
  }

  /**
   * 评估端：若不干预，约 3 个月（12 周）后的区间与风险。
   * 风险看的是推演增幅和基线，不是诊断。
   */
  function assess(input) {
    var run = project(Object.assign({}, input, { adherence: 0, quality: 0, level: 1 }), 12);
    var p = run.profile;
    var last = run.series.none[run.series.none.length - 1];
    var cobb0 = run.cobb0;
    var delta = last.cobb - cobb0;
    var half = 0.55 + p.chemoCycles * 0.04 + (p.activity === "rare" ? 0.15 : 0);
    var cobbRange = band(last.cobb, half);
    var shHalf = 0.25 + half * 0.08;
    var shoulderRange = band(last.shoulder, shHalf);

    var score = 0;
    if (p.months <= 6) score += 1;
    if (p.shoulder >= 2) score += 2;
    else if (p.shoulder >= 1.2) score += 1;
    if (p.chemoCycles >= 6) score += 2;
    else if (p.chemoCycles >= 3) score += 1;
    if (p.cognition < 24) score += 2;
    else if (p.cognition < 27) score += 1;
    if (p.bmi >= 28) score += 1;
    if (p.activity === "rare") score += 1;
    if (delta >= 4) score += 2;
    else if (delta >= 2.5) score += 1;
    if (last.cobb >= 20) score += 2;
    else if (last.cobb >= 15) score += 1;

    var risk = score >= 6 ? "高" : score >= 3 ? "中" : "低";
    var affected = sideLabel(p.side);
    var healthy = p.side === "right" ? "左" : "右";

    return {
      profile: p,
      risk: risk,
      score: score,
      cobb0: round(cobb0, 1),
      cobbRange: cobbRange,
      shoulder0: round(p.shoulder, 1),
      shoulderRange: [round(Math.max(0, shoulderRange[0]), 1), round(shoulderRange[1], 1)],
      lean0: round(leanFromShoulder(p.shoulder), 1),
      leanRange: band(last.lean, 0.4),
      direction: "若不练，背可能向" + affected + "侧歪，" + healthy + "侧肩膀可能会慢慢高一点。",
      affected: affected,
      healthy: healthy,
      activityLabel: activityLabel(p.activity),
    };
  }

  function lifeScores(p, scenario, week, row) {
    var ease0 = 62 - Math.max(0, p.shoulder - 1) * 6 - Math.max(0, 26 - p.cognition) * 0.4;
    var qol0 = 66 - Math.max(0, p.months < 3 ? 4 : 0) - Math.max(0, p.bmi - 26) * 0.3;
    var easeGain = scenario === "dual" ? 12 : scenario === "single" ? 5 : -5;
    var qolGain = scenario === "dual" ? 10 : scenario === "single" ? 4 : -3;
    var scale = clamp(week / 12, 0, 1.2);
    var effort = scenario === "none" ? 1 : clamp(trainScale(p), 0.4, 1.15);
    if (scenario !== "none") {
      easeGain *= effort;
      qolGain *= effort;
    }
    var half = scenario === "none" ? 4 : 3;
    return {
      body: band(ease0 + easeGain * scale, half),
      qol: band(qol0 + qolGain * scale, half),
    };
  }

  /**
   * 结局页用：三条曲线 + 选定周的区间。
   * week 取 8–12。
   */
  function forecast(input, week) {
    week = clamp(Math.round(num(week, 12)), 8, 12);
    var run = project(input, 12);
    var p = run.profile;
    var pick = function (name) {
      return run.series[name][week];
    };
    var pack = function (name) {
      var row = pick(name);
      var life = lifeScores(p, name, week, row);
      var cobbHalf = name === "none" ? 0.8 : 0.45;
      var shHalf = 0.2;
      return {
        cobb: band(row.cobb, cobbHalf),
        shoulder: band(row.shoulder, shHalf),
        lean: band(row.lean, 0.35),
        sym: band(row.sym * 100, name === "none" ? 4 : 3),
        body: life.body,
        qol: life.qol,
        auto: round(row.auto, 2),
        conflict: round(row.conflict, 2),
        point: {
          cobb: round(row.cobb, 1),
          shoulder: round(row.shoulder, 2),
          lean: round(row.lean, 1),
          sym: round(row.sym, 2),
        },
      };
    };
    return {
      profile: p,
      week: week,
      pool: round(run.pool, 1),
      cobb0: round(run.cobb0, 1),
      week0: resourceAt(run, 0),
      curves: {
        none: run.series.none.map(slim),
        single: run.series.single.map(slim),
        dual: run.series.dual.map(slim),
      },
      at: {
        none: pack("none"),
        single: pack("single"),
        dual: pack("dual"),
      },
    };
  }

  function resourceAt(run, week) {
    var row = run.series.dual[week];
    var p = run.profile;
    var postureRaw = 34 + row.shoulder * 2.5;
    var posture = postureRaw * (1 - 0.2 * row.auto);
    var cognitive = cogCostOf(p.level);
    var deficit = Math.max(0, posture + cognitive - run.pool);
    return {
      pool: round(run.pool, 1),
      posture: round(posture, 1),
      cognitive: round(cognitive, 1),
      deficit: round(deficit, 1),
      conflict: round(deficit / run.pool, 2),
      automation: round(row.auto, 2),
    };
  }

  function slim(row) {
    return {
      w: row.w,
      cobb: round(row.cobb, 2),
      shoulder: round(row.shoulder, 2),
      lean: round(row.lean, 2),
      sym: round(row.sym, 3),
      auto: round(row.auto, 3),
      conflict: round(row.conflict, 3),
    };
  }

  /**
   * 调阶：正确率 >80% 且连续两次，下次升一级；
   * <70% 下次降一级；人还明显歪着，即使答对也不升级。
   * 新等级下次训练才生效。
   */
  function nextLevel(level, accuracy, streak, obviousLean) {
    level = clamp(level, 1, 5);
    var next = level;
    var reason = "keep";
    var newStreak = streak || 0;
    if (accuracy < 0.7) {
      next = Math.max(1, level - 1);
      newStreak = 0;
      reason = "down";
    } else if (accuracy > 0.8 && !obviousLean) {
      newStreak = (streak || 0) + 1;
      if (newStreak >= 2) {
        next = Math.min(5, level + 1);
        newStreak = 0;
        reason = "up";
      } else {
        reason = "keep-good";
      }
    } else if (accuracy > 0.8 && obviousLean) {
      newStreak = 0;
      reason = "lean-block";
    } else {
      newStreak = 0;
      reason = "keep";
    }
    return { level: next, streak: newStreak, reason: reason };
  }

  return {
    referenceWeek0: referenceWeek0,
    normalize: normalize,
    baselineCobb: baselineCobb,
    project: project,
    assess: assess,
    forecast: forecast,
    nextLevel: nextLevel,
    leanFromShoulder: leanFromShoulder,
    round: round,
  };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SHSim;
