(function () {
  var LEVEL_NAME = ["", "连续减 3 或减 7", "倒着说月份", "颜色和字对不上", "划掉指定数字", "说一类词"];
  var MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  var WORDS = {
    蔬菜: ["白菜", "青菜", "菠菜", "番茄", "西红柿", "黄瓜", "茄子", "土豆", "萝卜", "胡萝卜", "豆角", "芹菜", "西兰花", "南瓜", "冬瓜", "韭菜", "莲藕", "玉米", "辣椒", "生菜", "洋葱", "蒜苗", "莴笋", "山药", "花菜", "苦瓜"],
    水果: ["苹果", "香蕉", "橘子", "橙子", "梨", "葡萄", "西瓜", "草莓", "桃", "桃子", "猕猴桃", "芒果", "菠萝", "柚子", "樱桃", "荔枝", "龙眼", "枣", "柿子", "哈密瓜", "蓝莓", "石榴"],
    动物: ["猫", "狗", "兔子", "老虎", "狮子", "大象", "鸟", "鱼", "马", "牛", "羊", "猪", "鸡", "鸭", "熊猫", "猴子", "熊", "鹿", "青蛙", "乌龟", "老鼠", "鹅"],
    家具: ["桌子", "椅子", "床", "沙发", "柜子", "衣柜", "书架", "凳子", "茶几", "台灯", "饭桌", "梳妆台"],
  };
  var EXS = [
    {
      name: "躺着 · 死虫式",
      hold: "手脚伸开后停住。腰尽量贴住，同时答题。",
      place: "手机放在头的上方，大约斜 30°。人要全身入镜。放好后先别再挪。",
    },
    {
      name: "跪着 · 鸟狗式",
      hold: "对侧的手和腿伸直后停住。背放平，同时答题。",
      place: "镜头放低，能看清肩膀到髋。放好后先别再挪。",
    },
    {
      name: "站着 · 弹力带抗旋转推举",
      hold: "双手把带子推到身前后停住。身体不要跟着转，同时答题。",
      place: "手机大约 1.2 米高，离人大约 2 米。人要全身入镜。放好后先别再挪。",
    },
  ];
  var CHEMO = [
    ["none", "没有化疗"],
    ["anthra", "蒽环类"],
    ["taxane", "紫杉类"],
    ["both", "蒽环加紫杉"],
    ["other", "其他"],
  ];
  var ACTIVITY = [
    ["rare", "很少活动"],
    ["light", "轻度家务"],
    ["often", "经常走动"],
    ["regular", "规律活动"],
  ];

  var db = SHStore.load();
  var page = "home";
  var blankFrom = "";
  var draft = null;
  var assessView = "form";
  var lastAssess = null;
  var pred = { adherence: 80, quality: 90, level: 3, week: 12, mech: false };
  var viewSessionId = null;
  var train = null;
  var pose = null;
  var camera = {
    timer: null,
    photo: null,
    stream: null,
    smooth: null,
    overMs: 0,
    coolUntil: 0,
    samples: [],
    thumbs: [],
    source: "simulation",
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function sameDay(a, b) {
    var da = new Date(a);
    var dbd = new Date(b);
    return da.getFullYear() === dbd.getFullYear() && da.getMonth() === dbd.getMonth() && da.getDate() === dbd.getDate();
  }
  function dayText(ts) {
    var d = new Date(ts || Date.now());
    return d.getMonth() + 1 + "月" + d.getDate() + "日 星期" + "日一二三四五六"[d.getDay()];
  }
  function clockText(ts) {
    var d = new Date(ts);
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return d.getMonth() + 1 + "月" + d.getDate() + "日 " + hh + ":" + mm;
  }
  function persist() {
    SHStore.save(db);
  }
  function gate(name) {
    if (!db.assessment && (name === "train" || name === "posture" || name === "result" || name === "predict")) return "blank";
    return name;
  }
  function go(name) {
    if (page === "train" && name !== "train") stopMonitor();
    if (name !== "result") viewSessionId = viewSessionId && name === "result" ? viewSessionId : name === "result" ? viewSessionId : null;
    if (name !== "result") viewSessionId = null;
    page = name;
    if (location.hash !== "#/" + name) location.hash = "#/" + name;
    render();
  }
  function render() {
    var shown = gate(page);
    document.getElementById("shell").dataset.page = shown;
    document.getElementById("app").innerHTML = views[shown]();
    binds[shown]();
    window.scrollTo(0, 0);
  }
  function openModal(html, bind) {
    var m = document.getElementById("modal");
    m.hidden = false;
    m.innerHTML = '<div class="modal-card">' + html + "</div>";
    bind(m);
  }
  function closeModal() {
    var m = document.getElementById("modal");
    m.hidden = true;
    m.innerHTML = "";
  }
  function on(root, sel, ev, fn) {
    var node = typeof sel === "string" ? root.querySelector(sel) : sel;
    if (node) node.addEventListener(ev, fn);
  }
  function bindGo(root) {
    root.querySelectorAll("[data-go]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dest = btn.getAttribute("data-go");
        if (dest === "posture") pose = freshPose("check");
        if (dest === "train") train = freshTrain();
        if (dest === "assess") {
          assessView = "form";
          draft = draftFrom(db.assessment);
        }
        go(dest);
      });
    });
  }
  function topbar(title, theme) {
    return (
      '<header class="topbar ' + theme + '"><button type="button" class="back" id="back" aria-label="返回">' +
      '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button><h1>" + esc(title) + '</h1><span class="top-spacer"></span></header>'
    );
  }
  function dock(active) {
    return (
      '<div class="dock"><div class="dock-pill">' +
      '<button type="button" data-go="home"' + (active === "home" ? ' class="on"' : "") + ">首页</button>" +
      '<button type="button" data-go="records"' + (active === "records" ? ' class="on"' : "") + ">记录</button>" +
      "</div></div>"
    );
  }

  function freshTrain() {
    return {
      phase: "guide",
      exercise: 0,
      qInExercise: 0,
      questions: [],
      started: 0,
      level: db.level || 1,
      chain: {},
      live: null,
      cameraFailed: false,
    };
  }
  function freshPose(mode) {
    return { mode: mode || "check", step: "intro", source: "", img: null, logical: null, points: [], result: null, refused: "", saved: false };
  }

  var views = {
    home: homeView,
    blank: blankView,
    assess: assessViewFn,
    train: trainView,
    result: resultView,
    posture: postureView,
    predict: predictView,
    records: recordsView,
  };
  var binds = {
    home: function () {
      bindGo(document.getElementById("app"));
    },
    blank: function () {
      on(document, "#back", "click", function () {
        go("home");
      });
    },
    assess: bindAssess,
    train: bindTrain,
    result: bindResult,
    posture: bindPosture,
    predict: bindPredict,
    records: bindRecords,
  };

  function homeView() {
    var doneToday = db.sessions.some(function (s) {
      return sameDay(s.at, Date.now());
    });
    var primary = !db.assessment
      ? '<button type="button" class="btn teal" data-go="assess">开始第一次评估</button>'
      : !doneToday
        ? '<button type="button" class="btn lime" data-go="train">开始今天的训练</button>'
        : '<button type="button" class="btn ink" data-go="result">看今天的结果</button>';
    var predictLink = db.assessment
      ? '<button type="button" class="linkish" data-go="predict">看看坚持练会怎样</button>'
      : "";
    return (
      '<div class="page">' +
      '<p class="wordmark">双行立衡</p>' +
      '<h2 class="home-title">今天</h2>' +
      '<p class="home-sub">' + esc(dayText()) + " · 乳腺癌术后居家康复</p>" +
      markSvg() +
      statusBlock() +
      '<div class="card today-card"><div class="today-kicker"><i></i>今天要做的事</div><div class="tiles">' +
      tile("assess", "评", "评估", "若不练会怎样", "assess") +
      tile("train", "练", "训练", "边做边答题", "train") +
      tile("posture", "姿", "姿势", "学姿势、自己查", "posture") +
      tile("result", "果", "结果", "做完再看", "result") +
      "</div></div>" +
      '<div style="height:14px"></div>' +
      primary +
      predictLink +
      '<p class="foot-quiet">仿真原型。记录只留在这台手机里。</p>' +
      "</div>" +
      dock("home")
    );
  }
  function tile(cls, han, name, sub, dest) {
    return (
      '<button type="button" class="tile ' + cls + '" data-go="' + dest + '"><span class="han">' + han +
      '</span><span class="name">' + name + '</span><span class="sub">' + sub + "</span></button>"
    );
  }
  function statusBlock() {
    if (!db.sessions.length) {
      return '<div class="status card"><p class="k">当天状态</p><p class="v">您未进行训练</p></div>';
    }
    var last = null;
    db.postures.forEach(function (p) {
      if (!p.refused && p.shoulderCm != null) last = p;
    });
    var done = db.sessions.some(function (s) {
      return sameDay(s.at, Date.now());
    });
    return (
      '<div class="status card"><p class="k">当天状态</p>' +
      '<p class="line">练到第 ' + db.level + " 级</p>" +
      '<p class="line">上次肩高差 ' + (last ? last.shoulderCm.toFixed(1) + " 厘米" : "还没有量过") + "</p>" +
      '<p class="line">' + (done ? "今日已完成" : "今日还没完成") + "</p></div>"
    );
  }
  function markSvg() {
    return (
      '<svg class="mark" viewBox="0 0 92 92" aria-hidden="true">' +
      '<circle cx="46" cy="46" r="44" fill="#E7EEE9"/>' +
      '<path d="M46 14 V78" stroke="#B7C4BC" stroke-width="2" stroke-dasharray="3 4"/>' +
      '<path d="M22 40 H70" stroke="#2197A9" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="22" cy="40" r="5" fill="#2197A9"/>' +
      '<circle cx="70" cy="40" r="5" fill="#32CD32"/>' +
      '<path d="M46 40 V68" stroke="#1F7A43" stroke-width="4" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function blankView() {
    return (
      '<div class="blank-page"><button type="button" class="back" id="back" aria-label="返回">' +
      '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button><p class="blank-msg">完成第一次评估后，这里会显示内容。</p></div>'
    );
  }

  function draftFrom(a) {
    if (!a) {
      return { side: "", months: null, weight: null, height: null, bmi: null, bmiManual: false, shoulder: null, chemoRegimen: "", chemoCycles: null, cognition: null, activity: "" };
    }
    return {
      side: a.side,
      months: a.months,
      weight: a.weight,
      height: a.height,
      bmi: a.bmi,
      bmiManual: true,
      shoulder: a.shoulder,
      chemoRegimen: a.chemoRegimen,
      chemoCycles: a.chemoCycles,
      cognition: a.cognition,
      activity: a.activity,
    };
  }
  function assessViewFn() {
    if (!draft) draft = draftFrom(db.assessment);
    if (assessView === "out" && lastAssess) return assessOut();
    return (
      '<div class="page">' + topbar("评估", "theme-assess") +
      "<h2 class=\"block\">若不练，背可能往哪边歪</h2>" +
      '<p class="lead">填完看一个大概范围。这是仿真推演，不是诊断。</p>' +
      '<div id="formErr"></div>' +
      '<div class="field"><div class="label">手术哪一侧</div><div class="choices" data-choice="side">' +
      choiceBtn("side", "left", "左侧") + choiceBtn("side", "right", "右侧") + "</div></div>" +
      stepper("months", "术后几个月", "个月", 1, 0, 120, 0, 1) +
      stepper("weight", "体重", "公斤", 1, 35, 120, 0, 55) +
      stepper("height", "身高（用来算体质指数，知道指数可跳过）", "厘米", 1, 140, 190, 0, 160) +
      stepper("bmi", "体质指数", "", 0.1, 14, 40, 1, 22) +
      stepper("shoulder", "两边肩膀高度差", "厘米", 0.1, 0, 6, 1, 0) +
      '<div class="field"><div class="label">化疗方案</div><div class="choices" data-choice="chemoRegimen">' +
      CHEMO.map(function (c) { return choiceBtn("chemoRegimen", c[0], c[1]); }).join("") +
      "</div></div>" +
      stepper("chemoCycles", "化疗周期", "个", 1, 0, 12, 0, 0) +
      stepper("cognition", "基线认知", "分", 1, 0, 30, 0, 27) +
      '<p class="hint">可填 0 到 30 的简易评分。记不清就填您记得的数。</p>' +
      '<div class="field"><div class="label">日常活动习惯</div><div class="choices" data-choice="activity">' +
      ACTIVITY.map(function (c) { return choiceBtn("activity", c[0], c[1]); }).join("") +
      "</div></div>" +
      '<button type="button" class="btn teal" id="runAssess">看三个月后的大概</button>' +
      '<button type="button" class="linkish" id="fillDemo">填入方案里的算例</button>' +
      "</div>"
    );
  }
  function choiceBtn(key, value, label) {
    var on = draft && draft[key] === value ? " on" : "";
    return '<button type="button" data-value="' + value + '" class="' + on + '">' + esc(label) + "</button>";
  }
  function stepper(key, label, unit, step, min, max, digits, start) {
    var val = draft ? draft[key] : null;
    var shown = val == null ? "<em>请填</em>" : "<b>" + Number(val).toFixed(digits) + "</b>";
    return (
      '<div class="field"><div class="label">' + label + "</div>" +
      '<div class="stepper" data-stepper="' + key + '" data-step="' + step + '" data-min="' + min + '" data-max="' + max + '" data-digits="' + digits + '" data-start="' + start + '">' +
      '<button type="button" data-dir="-1" aria-label="减少">－</button>' +
      '<div class="val">' + shown + (unit ? "<span>" + unit + "</span>" : "") + "</div>" +
      '<button type="button" data-dir="1" aria-label="增加">＋</button></div></div>'
    );
  }
  function paintDraft(root) {
    root.querySelectorAll("[data-stepper]").forEach(function (box) {
      var key = box.getAttribute("data-stepper");
      var digits = parseInt(box.getAttribute("data-digits"), 10);
      var val = draft[key];
      var unit = box.querySelector(".val span");
      var unitHtml = unit ? unit.outerHTML : "";
      box.querySelector(".val").innerHTML = (val == null ? "<em>请填</em>" : "<b>" + Number(val).toFixed(digits) + "</b>") + unitHtml;
    });
    root.querySelectorAll("[data-choice]").forEach(function (group) {
      var key = group.getAttribute("data-choice");
      group.querySelectorAll("button").forEach(function (btn) {
        btn.classList.toggle("on", btn.getAttribute("data-value") === draft[key]);
      });
    });
  }
  function recomputeBmi() {
    if (draft.bmiManual) return;
    if (draft.weight && draft.height) {
      var m = draft.height / 100;
      draft.bmi = Math.round((draft.weight / (m * m)) * 10) / 10;
    }
  }
  function bindAssess() {
    var root = document.getElementById("app");
    on(root, "#back", "click", function () {
      if (assessView === "out") {
        assessView = "form";
        render();
      } else go("home");
    });
    if (assessView === "out") {
      bindGo(root);
      return;
    }
    root.querySelectorAll("[data-stepper] button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var box = btn.parentNode;
        var key = box.getAttribute("data-stepper");
        var step = parseFloat(box.getAttribute("data-step"));
        var min = parseFloat(box.getAttribute("data-min"));
        var max = parseFloat(box.getAttribute("data-max"));
        var digits = parseInt(box.getAttribute("data-digits"), 10);
        var cur = draft[key];
        if (cur == null) cur = parseFloat(box.getAttribute("data-start"));
        else cur = cur + parseInt(btn.getAttribute("data-dir"), 10) * step;
        cur = Math.max(min, Math.min(max, cur));
        draft[key] = parseFloat(cur.toFixed(digits));
        if (key === "bmi") draft.bmiManual = true;
        if (key === "weight" || key === "height") {
          draft.bmiManual = false;
          recomputeBmi();
        }
        paintDraft(root);
      });
    });
    root.querySelectorAll("[data-choice] button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.parentNode.getAttribute("data-choice");
        draft[key] = btn.getAttribute("data-value");
        if (key === "chemoRegimen" && draft.chemoRegimen === "none") draft.chemoCycles = 0;
        if (key === "chemoRegimen" && draft.chemoRegimen !== "none" && !draft.chemoCycles) draft.chemoCycles = 4;
        paintDraft(root);
      });
    });
    on(root, "#fillDemo", "click", function () {
      draft = {
        side: "left", months: 4, weight: 58, height: 159, bmi: 23, bmiManual: true,
        shoulder: 1.6, chemoRegimen: "both", chemoCycles: 4, cognition: 27, activity: "light",
      };
      paintDraft(root);
    });
    on(root, "#runAssess", "click", function () {
      var missing = [];
      if (!draft.side) missing.push("手术哪一侧");
      if (draft.months == null) missing.push("术后几个月");
      if (draft.weight == null) missing.push("体重");
      if (draft.bmi == null) missing.push("体质指数");
      if (draft.shoulder == null) missing.push("肩膀高度差");
      if (!draft.chemoRegimen) missing.push("化疗方案");
      if (draft.chemoCycles == null) missing.push("化疗周期");
      if (draft.cognition == null) missing.push("基线认知");
      if (!draft.activity) missing.push("日常活动");
      var err = root.querySelector("#formErr");
      if (missing.length) {
        err.innerHTML = '<div class="err">还差：' + missing.join("、") + "</div>";
        return;
      }
      var saved = {
        side: draft.side, months: draft.months, weight: draft.weight, height: draft.height,
        bmi: draft.bmi, shoulder: draft.shoulder, chemoRegimen: draft.chemoRegimen,
        chemoCycles: draft.chemoCycles, cognition: draft.cognition, activity: draft.activity, at: Date.now(),
      };
      db.assessment = saved;
      persist();
      lastAssess = SHSim.assess(saved);
      assessView = "out";
      render();
    });
  }
  function assessOut() {
    var a = lastAssess;
    var side = a.affected === "左" ? "左侧" : "右侧";
    return (
      '<div class="page">' + topbar("评估结果", "theme-assess") +
      '<p class="k" style="color:#757575;margin:0">风险</p>' +
      '<p class="risk">' + a.risk + "</p>" +
      '<p class="lead" style="color:#212121;font-size:20px">' + esc(a.direction) + "</p>" +
      "<p>现在弯曲角度大约 <b>" + a.cobb0.toFixed(1) + "°</b>。手术在" + side + "。</p>" +
      "<p>若不干预，3 个月后：</p>" +
      '<p class="range">弯曲角度 ' + a.cobbRange[0].toFixed(1) + "° – " + a.cobbRange[1].toFixed(1) + "°</p>" +
      '<p class="range">肩高差 ' + a.shoulderRange[0].toFixed(1) + " – " + a.shoulderRange[1].toFixed(1) + " 厘米</p>" +
      '<div class="disclaimer">这是仿真推演，不是诊断。<small>只给护理评估作参考，不能据此给这个人下结论。</small></div>' +
      '<div style="height:14px"></div>' +
      '<button type="button" class="btn purple" data-go="predict">看看坚持练会怎样</button>' +
      '<button type="button" class="btn ghost" data-go="home">回到今天</button></div>'
    );
  }

  function predictView() {
    var a = db.assessment;
    return (
      '<div class="page">' + topbar("坚持练会怎样", "theme-predict") +
      '<p class="lead">按您评估里的情况来推。改下面的数，曲线马上重算。</p>' +
      '<div class="card" style="margin-bottom:12px"><p style="margin:0">手术' + (a.side === "right" ? "右侧" : "左侧") +
      " · 术后 " + a.months + " 个月 · 肩高差 " + Number(a.shoulder).toFixed(1) + " 厘米 · 体质指数 " + a.bmi +
      " · 化疗 " + a.chemoCycles + " 个周期</p></div>" +
      slider("adherence", "完成得勤不勤", pred.adherence, "%") +
      slider("quality", "动作做得怎样", pred.quality, "%") +
      '<div class="field"><div class="label">题目进到哪一级</div><div class="weeks" id="levels">' +
      [1, 2, 3, 4, 5].map(function (n) {
        return '<button type="button" data-level="' + n + '"' + (pred.level === n ? ' class="on"' : "") + ">" + n + "</button>";
      }).join("") + "</div><p class=\"hint\">第 " + pred.level + " 级：" + LEVEL_NAME[pred.level] + "</p></div>" +
      '<div class="field"><div class="label">看到第几周</div><div class="weeks" id="weeks">' +
      [8, 9, 10, 11, 12].map(function (n) {
        return '<button type="button" data-week="' + n + '"' + (pred.week === n ? ' class="on"' : "") + ">" + n + "</button>";
      }).join("") + "</div></div>" +
      '<canvas class="chart" id="cobbChart"></canvas>' +
      '<div class="legend"><span><i style="background:#8A8494"></i>不练</span><span><i style="background:#A9C3D4"></i>只练动作</span><span><i style="background:#3E6F8A"></i>边做边答题</span></div>' +
      '<div id="forecastOut"></div>' +
      '<button type="button" class="btn ghost small" id="toggleMech" style="margin-top:12px">给讲解用的机制图</button>' +
      '<div class="mech" id="mechBox"' + (pred.mech ? "" : " hidden") + '><canvas class="chart" id="mechChart"></canvas>' +
      '<div class="legend"><span><i style="background:#5E516C"></i>姿势越来越不用刻意想</span><span><i style="background:#7FA3B8"></i>资源不够用的比例</span></div>' +
      '<p class="hint">第 0 周资源池按方案算例：总量 48。这张图是讲机制用的，不是给您下的结论。</p></div>' +
      '<div class="disclaimer purple">这是仿真示意，不能用来给这个人下结论。<small>体像和生活方便程度是 0 到 100 的仿真指数，不是量表原分。100 表示更自在、生活更方便。</small></div></div>'
    );
  }
  function slider(key, label, value, unit) {
    return (
      '<div class="slider"><div class="row"><span>' + label + '</span><b id="val-' + key + '">' + value + unit + "</b></div>" +
      '<input type="range" id="sl-' + key + '" min="0" max="100" step="5" value="' + value + '"></div>'
    );
  }
  function forecastInput() {
    var a = db.assessment;
    return {
      side: a.side, months: a.months, weight: a.weight, bmi: a.bmi, shoulder: a.shoulder,
      chemoRegimen: a.chemoRegimen, chemoCycles: a.chemoCycles, cognition: a.cognition, activity: a.activity,
      adherence: pred.adherence, quality: pred.quality, level: pred.level,
    };
  }
  function fmtBand(pair, suffix) {
    return pair[0].toFixed(1) + " – " + pair[1].toFixed(1) + (suffix || "");
  }
  function paintForecast() {
    var fc = SHSim.forecast(forecastInput(), pred.week);
    var root = document.getElementById("forecastOut");
    if (!root) return;
    var names = [["none", "不练"], ["single", "只练动作"], ["dual", "边做边答题"]];
    root.innerHTML = '<h2 class="block" style="font-size:24px;margin-top:16px">第 ' + pred.week + " 周，大概在这些范围</h2>" +
      names.map(function (n) {
        var row = fc.at[n[0]];
        return (
          '<div class="out-card' + (n[0] === "dual" ? " dual" : "") + '"><h3>' + n[1] + "</h3>" +
          "<p>弯曲角度 " + fmtBand(row.cobb, "°") + "</p>" +
          "<p>两边肌肉更对称的程度 " + fmtBand(row.sym, "") + "</p>" +
          "<p>肩高差 " + fmtBand(row.shoulder, " 厘米") + "</p>" +
          "<p>侧歪角度 " + fmtBand(row.lean, "°") + "</p>" +
          "<p>身体自在感 " + fmtBand(row.body, "") + "</p>" +
          "<p>生活方便程度 " + fmtBand(row.qol, "") + "</p></div>"
        );
      }).join("");
    var chart = document.getElementById("cobbChart");
    if (chart) SHCharts.drawCobb(chart, fc.curves, pred.week);
    if (pred.mech) {
      var mech = document.getElementById("mechChart");
      if (mech) SHCharts.drawMech(mech, fc.curves.dual);
    }
    window.__lastForecast = fc;
  }
  function bindPredict() {
    var root = document.getElementById("app");
    on(root, "#back", "click", function () { go("home"); });
    ["adherence", "quality"].forEach(function (key) {
      on(root, "#sl-" + key, "input", function (ev) {
        pred[key] = parseInt(ev.target.value, 10);
        root.querySelector("#val-" + key).textContent = pred[key] + "%";
        paintForecast();
      });
    });
    root.querySelectorAll("#levels button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        pred.level = parseInt(btn.getAttribute("data-level"), 10);
        root.querySelectorAll("#levels button").forEach(function (b) { b.classList.toggle("on", b === btn); });
        root.querySelector(".hint").textContent = "第 " + pred.level + " 级：" + LEVEL_NAME[pred.level];
        paintForecast();
      });
    });
    root.querySelectorAll("#weeks button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        pred.week = parseInt(btn.getAttribute("data-week"), 10);
        root.querySelectorAll("#weeks button").forEach(function (b) { b.classList.toggle("on", b === btn); });
        paintForecast();
      });
    });
    on(root, "#toggleMech", "click", function () {
      pred.mech = !pred.mech;
      var box = root.querySelector("#mechBox");
      box.hidden = !pred.mech;
      paintForecast();
    });
    paintForecast();
    requestAnimationFrame(paintForecast);
  }

  function recordsView() {
    var sessions = db.sessions.slice().reverse().map(function (s) {
      return (
        '<button type="button" class="rec" data-session="' + s.id + '"><b>' + esc(clockText(s.at)) + " · 第 " + s.level + " 级</b>" +
        "<span>正确率 " + Math.round(s.accuracy * 100) + "% · " + esc(s.adviceTitle) + "</span></button>"
      );
    }).join("");
    var poses = db.postures.slice().reverse().map(function (p) {
      var line = p.refused ? "没给数字：" + p.refused : "肩高差 " + Number(p.shoulderCm).toFixed(1) + " 厘米 · 侧歪 " + Math.abs(p.lean).toFixed(1) + "°";
      return '<div class="rec"><b>' + esc(clockText(p.at)) + (p.sample ? " · 示意图" : "") + "</b><span>" + esc(line) + "</span></div>";
    }).join("");
    return (
      '<div class="page">' +
      '<p class="wordmark">记录</p><h2 class="home-title" style="font-size:34px">都在这台手机里</h2>' +
      '<p class="lead">答题和姿势只存在这台手机里，不上传、不经过服务器。</p>' +
      '<h3 class="section-label">答题记录</h3>' +
      (sessions || '<p class="lead">还没有答题记录。</p>') +
      '<h3 class="section-label">姿势记录</h3>' +
      (poses || '<p class="lead">还没有姿势记录。</p>') +
      '<button type="button" class="btn ghost" id="wipe">清空这台手机上的记录</button></div>' + dock("records")
    );
  }
  function bindRecords() {
    var root = document.getElementById("app");
    bindGo(root);
    root.querySelectorAll("[data-session]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewSessionId = btn.getAttribute("data-session");
        page = "result";
        location.hash = "#/result";
        render();
      });
    });
    on(root, "#wipe", "click", function () {
      openModal(
        "<p>清空后，评估、训练和姿势记录都会从这台手机消失。</p>" +
          '<button type="button" class="btn ghost" id="no">再想想</button><button type="button" class="btn ink" id="yes">清空</button>',
        function (m) {
          on(m, "#no", "click", closeModal);
          on(m, "#yes", "click", function () {
            db = SHStore.empty();
            persist();
            closeModal();
            draft = null;
            go("home");
          });
        }
      );
    });
  }

  function resultView() {
    if (!db.sessions.length) {
      return '<div class="page">' + topbar("结果", "theme-train") + '<div class="status card"><p class="v">您未进行训练</p></div></div>';
    }
    var session = null;
    if (viewSessionId) {
      db.sessions.forEach(function (s) { if (s.id === viewSessionId) session = s; });
    }
    if (!session) session = db.sessions[db.sessions.length - 1];
    var rows = (session.questions || []).map(function (q) {
      var lean = q.leanMean == null ? "这段没看清，没有算进去" : "歪了 " + q.leanMean.toFixed(1) + "°";
      var over = q.leanMean != null && q.leanMean > (session.threshold || 5);
      return '<div>第 ' + q.n + " 题 · 第 " + q.level + " 级 · " + (q.correct ? "答对" : "答错") + " · " + lean +
        (over ? ' · <span class="over">过了界限</span>' : "") + "</div>";
    }).join("");
    var photoLine = session.postureSource === "camera"
      ? "训练时悄悄记了 " + session.photoCount + " 张，没有打断您。照片留在这台手机里，这里不展示。"
      : "这次没有打开摄像头。图上的歪斜是仿真示意，用来把流程走通。";
    return (
      '<div class="page">' + topbar("训练结果", "theme-train") +
      '<p class="lead">' + esc(clockText(session.at)) + " · 第 " + session.level + " 级 · " + LEVEL_NAME[session.level] + "</p>" +
      '<div class="pair"><div class="card"><span>正确率</span><b>' + Math.round(session.accuracy * 100) + '%</b></div>' +
      '<div class="card"><span>反应时间</span><b>' + (session.meanRt / 1000).toFixed(1) + " 秒</b></div></div>" +
      '<h3 class="section-label">题目难的时候，身子歪了多少</h3>' +
      '<canvas class="chart" id="sessionChart"></canvas>' +
      '<p class="hint">绿线是歪了多少。红虚线是界限。浅红块是过了界限的时段。</p>' +
      '<div class="q-list">' + rows + "</div>" +
      '<div class="advice"><strong>' + esc(session.adviceTitle) + "</strong><p>" + esc(session.adviceDetail) + "</p></div>" +
      '<p class="hint">' + photoLine + "</p>" +
      '<p class="hint">界限暂定为侧歪 ' + (session.threshold || 5) + "°，是假设参数，不是诊断标准。</p>" +
      '<button type="button" class="btn green" id="toPose">去做姿势对照</button>' +
      '<button type="button" class="btn ghost" data-go="home">回到今天</button></div>'
    );
  }
  function bindResult() {
    var root = document.getElementById("app");
    on(root, "#back", "click", function () { go("home"); });
    bindGo(root);
    on(root, "#toPose", "click", function () {
      pose = freshPose("review");
      go("posture");
    });
    var canvas = root.querySelector("#sessionChart");
    if (!canvas) return;
    var session = null;
    if (viewSessionId) db.sessions.forEach(function (s) { if (s.id === viewSessionId) session = s; });
    if (!session) session = db.sessions[db.sessions.length - 1];
    SHCharts.drawSession(canvas, session);
    requestAnimationFrame(function () { SHCharts.drawSession(canvas, session); });
  }

  function postureView() {
    if (!pose) pose = freshPose("check");
    var intro = pose.mode === "review" ? "训练做完了，可以看一次自己的姿势。" : "平时也可以自己查。站在地上固定标记处，距离、高度、朝向都不要变。";
    var steps = '<div class="pose-steps"><span>拍照</span><span>对比</span><span>发现变化</span><span>照镜子调回来</span></div>';
    var std =
      '<svg class="std" viewBox="0 0 360 140" aria-hidden="true"><rect width="360" height="140" rx="16" fill="#fff"/>' +
      '<path d="M180 16 V124" stroke="#D5DDD8" stroke-dasharray="3 4"/>' +
      '<circle cx="180" cy="36" r="14" fill="none" stroke="#1F7A43" stroke-width="4"/>' +
      '<path d="M110 62 H250" stroke="#1F7A43" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M180 50 V100" stroke="#1F7A43" stroke-width="4"/>' +
      '<path d="M150 108 H210" stroke="#1F7A43" stroke-width="4" stroke-linecap="round"/>' +
      '<text x="180" y="132" text-anchor="middle" font-size="13" fill="#757575">对照：两边肩膀一样高，身子沿着中间的线</text></svg>';
    if (pose.step === "intro") {
      return (
        '<div class="page">' + topbar("姿势", "theme-posture") +
        "<h2 class=\"block\">和自己的第一次比</h2><p class=\"lead\">" + intro + "</p>" + std + steps +
        '<div class="place" style="background:#E7F5EC;color:#145C32">人要全身入镜。肩膀和髋都要露出来。看不清就不会给数字。</div>' +
        '<div style="height:12px"></div>' +
        '<button type="button" class="btn green" id="shoot">拍一张</button>' +
        '<button type="button" class="btn ghost" id="album">从相册选一张</button>' +
        '<button type="button" class="linkish" id="sample">用示意图练手（不记入您的记录）</button>' +
        '<input id="camFile" type="file" accept="image/*" capture="environment" hidden>' +
        '<input id="libFile" type="file" accept="image/*" hidden></div>'
      );
    }
    if (pose.step === "mark") {
      var names = ["左肩", "右肩", "左髋", "右髋"];
      var next = pose.points.length < 4 ? "请点" + names[pose.points.length] : "四个点齐了";
      var dots = [0, 1, 2, 3].map(function (i) {
        return '<b class="' + (i < pose.points.length ? "on" : "") + '"></b>';
      }).join("");
      var report = pose.result && pose.result.ok ? poseReportInner(pose.result, true) : "";
      return (
        '<div class="page">' + topbar("点四个点", "theme-posture") +
        '<p class="point-now" id="nextPoint">' + next + "</p>" +
        '<div class="dots">' + dots + "</div>" +
        '<div class="stage"><canvas id="shot"></canvas></div>' +
        '<div style="height:10px"></div>' +
        '<button type="button" class="btn ghost" id="undo">撤销上一个点</button>' +
        '<button type="button" class="btn ghost" id="unclear">肩膀或髋看不清</button>' +
        '<div id="poseReport">' + report + "</div></div>"
      );
    }
    return (
      '<div class="page">' + topbar("姿势", "theme-posture") +
      '<div class="card"><p class="v" style="font-size:28px;font-weight:800;margin:0">这次先不给数字</p>' +
      "<p>" + esc(pose.refused) + "</p></div>" +
      '<button type="button" class="btn green" id="again">重拍</button>' +
      '<button type="button" class="btn ghost" data-go="home">回到今天</button></div>'
    );
  }
  function poseReportInner(m, withSave) {
    var base = db.baseline;
    var text = SHPose.describe(m, pose.source === "sample" ? null : base);
    var shCls = m.shoulderOver ? "num-big over" : "num-big";
    var lnCls = m.leanOver ? "num-big over" : "num-big";
    var saveBtn = "";
    if (pose.source === "sample") {
      text = { title: "这是示意图", body: "点对了就能看到数字。示意图不记入您的记录。和自己比，要拍您自己的照片。" };
      saveBtn = "";
    } else if (withSave && !pose.saved) {
      saveBtn = '<button type="button" class="btn green" id="savePose">记下来</button>';
    } else if (pose.saved) {
      saveBtn = "<p class=\"hint\">已经记在这台手机里。</p>";
    }
    var compare = pose.source === "sample" ? "" : "<p>" + esc(text.body) + "</p>";
    return (
      '<div class="card" style="margin-top:12px"><p class="k" style="color:#757575">' + esc(text.title) + "</p>" +
      '<p class="' + shCls + '">' + m.shoulderCm.toFixed(1) + ' 厘米</p><p>两边肩膀高度差 · ' + esc(m.higher) + "</p>" +
      '<p class="' + lnCls + '">' + Math.abs(m.lean).toFixed(1) + "°</p><p>身子侧歪的角度</p>" +
      compare +
      '<p class="hint">按肩宽 38 厘米换算，只和您第一次比，不追求绝对准。肩高差 ' + SHPose.LIMITS.shoulderCm +
      " 厘米、侧歪 " + SHPose.LIMITS.leanDeg + "° 是假设界限，过了才用红色标出。</p></div>" +
      saveBtn +
      '<button type="button" class="btn ghost" id="again">再拍一张</button>'
    );
  }
  function bindPosture() {
    var root = document.getElementById("app");
    on(root, "#back", "click", function () {
      if (pose.step === "intro") go("home");
      else {
        pose.step = "intro";
        pose.points = [];
        pose.result = null;
        render();
      }
    });
    bindGo(root);
    on(root, "#shoot", "click", function () { root.querySelector("#camFile").click(); });
    on(root, "#album", "click", function () { root.querySelector("#libFile").click(); });
    on(root, "#sample", "click", function () {
      pose.source = "sample";
      pose.step = "mark";
      pose.points = [];
      pose.result = null;
      pose.img = null;
      render();
    });
    ["#camFile", "#libFile"].forEach(function (sel) {
      var input = root.querySelector(sel);
      if (!input) return;
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            if (SHPose.meanLuminance(img) < 28) {
              pose.step = "refused";
              pose.refused = "这张太暗，肩膀或髋看不清。这次先不给数字，请重拍一张。";
              saveRefusal(pose.refused);
              render();
              return;
            }
            pose.source = "photo";
            pose.img = img;
            pose.points = [];
            pose.result = null;
            pose.saved = false;
            pose.step = "mark";
            render();
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    });
    on(root, "#unclear", "click", function () {
      pose.step = "refused";
      pose.refused = "肩膀或髋看不清。这次先不给数字，请重拍一张，让两边肩膀和髋都露出来。";
      if (pose.source !== "sample") saveRefusal(pose.refused);
      render();
    });
    on(root, "#again", "click", function () {
      pose.step = "intro";
      pose.points = [];
      pose.result = null;
      pose.img = null;
      render();
    });
    on(root, "#undo", "click", function () {
      pose.points.pop();
      pose.result = null;
      paintPoseCanvas();
      refreshPointLabel();
      var report = root.querySelector("#poseReport");
      if (report) report.innerHTML = "";
    });
    on(root, "#savePose", "click", savePose);
    var canvas = root.querySelector("#shot");
    if (canvas) {
      paintPoseCanvas();
      canvas.addEventListener("pointerdown", function (ev) {
        if (pose.points.length >= 4) return;
        var rect = canvas.getBoundingClientRect();
        var x = ((ev.clientX - rect.left) / rect.width) * pose.logical.w;
        var y = ((ev.clientY - rect.top) / rect.height) * pose.logical.h;
        pose.points.push({ x: x, y: y });
        if (pose.points.length === 4) {
          pose.result = SHPose.measure(pose.points, { width: pose.logical.w, height: pose.logical.h });
          if (!pose.result.ok) {
            pose.step = "refused";
            pose.refused = pose.result.reason;
            if (pose.source !== "sample") saveRefusal(pose.refused);
            render();
            return;
          }
        }
        paintPoseCanvas();
        refreshPointLabel();
        var box = root.querySelector("#poseReport");
        if (box) box.innerHTML = pose.result && pose.result.ok ? poseReportInner(pose.result, true) : "";
        on(root, "#savePose", "click", savePose);
        on(root, "#again", "click", function () {
          pose.step = "intro";
          pose.points = [];
          pose.result = null;
          render();
        });
      });
    }
  }
  function refreshPointLabel() {
    var names = ["左肩", "右肩", "左髋", "右髋"];
    var el = document.getElementById("nextPoint");
    if (el) el.textContent = pose.points.length < 4 ? "请点" + names[pose.points.length] : "四个点齐了";
    document.querySelectorAll(".dots b").forEach(function (b, i) {
      b.classList.toggle("on", i < pose.points.length);
    });
  }
  function paintPoseCanvas() {
    var canvas = document.getElementById("shot");
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var lw, lh, draw;
    if (pose.source === "sample") {
      var meta = SHPose.drawSample(canvas);
      pose.logical = { w: meta.width, h: meta.height };
      drawPoints(canvas, meta.width, meta.height);
      return;
    }
    var img = pose.img;
    var maxW = 360;
    var maxH = 480;
    var scale = Math.min(maxW / img.width, maxH / img.height, 1);
    lw = Math.round(img.width * scale);
    lh = Math.round(img.height * scale);
    pose.logical = { w: lw, h: lh };
    canvas.width = lw * dpr;
    canvas.height = lh * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.maxWidth = lw + "px";
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(img, 0, 0, lw, lh);
    drawPoints(canvas, lw, lh);
  }
  function drawPoints(canvas, lw, lh) {
    var dpr = window.devicePixelRatio || 1;
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ["#2197A9", "#32CD32", "#607D8B", "#6E5A7B"];
    pose.points.forEach(function (p, i) {
      g.beginPath();
      g.fillStyle = colors[i];
      g.arc(p.x, p.y, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.font = "700 12px Microsoft YaHei, sans-serif";
      g.textAlign = "center";
      g.fillText(String(i + 1), p.x, p.y + 4);
    });
    if (pose.points.length === 4) {
      g.strokeStyle = "#1F7A43";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(pose.points[0].x, pose.points[0].y);
      g.lineTo(pose.points[1].x, pose.points[1].y);
      g.moveTo(pose.points[2].x, pose.points[2].y);
      g.lineTo(pose.points[3].x, pose.points[3].y);
      g.stroke();
    }
  }
  function saveRefusal(reason) {
    db.postures.push({ id: "p" + Date.now(), at: Date.now(), refused: reason, mode: pose.mode });
    persist();
  }
  function savePose() {
    if (!pose.result || !pose.result.ok || pose.saved || pose.source === "sample") return;
    var m = pose.result;
    var rec = {
      id: "p" + Date.now(),
      at: Date.now(),
      mode: pose.mode,
      shoulderCm: Math.round(m.shoulderCm * 10) / 10,
      lean: Math.round(m.lean * 10) / 10,
      higher: m.higher,
      shoulderOver: m.shoulderOver,
      leanOver: m.leanOver,
    };
    if (!db.baseline) db.baseline = { shoulderCm: rec.shoulderCm, lean: rec.lean, at: rec.at };
    db.postures.push(rec);
    pose.saved = true;
    persist();
    var box = document.getElementById("poseReport");
    if (box) box.innerHTML = poseReportInner(m, true);
    on(document.getElementById("app"), "#again", "click", function () {
      pose.step = "intro";
      pose.points = [];
      pose.result = null;
      render();
    });
  }

  function trainView() {
    if (!train) train = freshTrain();
    if (train.phase === "guide") {
      return (
        '<div class="page">' + topbar("训练", "theme-train") +
        "<h2 class=\"block\">先把手机放好</h2>" +
        '<p class="lead">动作按顺序来：躺着死虫式，跪着鸟狗式，站着弹力带抗旋转推举。只在动作停住时出题。</p>' +
        '<div class="card"><p><b>站着</b><br>大约 1.2 米高，离人大约 2 米。</p>' +
        "<p><b>跪着</b><br>镜头放低，看清肩膀到髋。</p>" +
        "<p><b>躺着</b><br>放在头上方，大约斜 30°。</p>" +
        "<p style=\"margin-bottom:0\"><b>人都要全身入镜。</b>训练时不会弹出画面，也不用停下来看自己。</p></div>" +
        '<p class="lead">今天是第 ' + train.level + " 级：" + LEVEL_NAME[train.level] + "</p>" +
        '<p class="place" id="camNote">打开摄像头后，每 8 秒悄悄记一张。</p>' +
        '<div style="height:12px"></div>' +
        '<button type="button" class="btn lime" id="startCam">打开摄像头，开始训练</button>' +
        '<button type="button" class="btn ghost" id="startSim">这台手机现在不方便开摄像头</button></div>'
      );
    }
    var ex = EXS[train.exercise];
    if (train.phase === "setup") {
      var note = camera.source === "camera"
        ? "摄像头已开。答题时不会弹出画面。"
        : train.cameraFailed
          ? "摄像头没有打开。这次姿势用仿真，答题照常。"
          : "这次不拍照。姿势曲线用仿真，方便把流程走通。";
      return (
        '<div class="page">' + topbar(ex.name, "theme-train") +
        '<p class="q-progress">第 ' + (train.exercise + 1) + " 个动作，共 3 个</p>" +
        poseArt(train.exercise) +
        '<div class="card"><p class="q-lead">' + esc(ex.hold) + "</p><p>" + esc(ex.place) + "</p></div>" +
        '<p class="hint" id="camNote">' + note + "</p>" +
        '<button type="button" class="btn lime" id="hold">我停住了，开始答题</button></div>'
      );
    }
    var q = train.live;
    return (
      '<div class="page">' + topbar(ex.name, "theme-train") +
      '<p class="q-progress">第 ' + q.n + " 题，共 6 题 · 第 " + train.level + " 级</p>" +
      '<p class="q-hold">' + esc(ex.hold) + "</p>" +
      '<div id="qBox">' + q.html + "</div></div>"
    );
  }
  function poseArt(i) {
    var paths = [
      "M30 70 H250 M40 70 V40 M70 70 V48 M250 40 A20 20 0 1 1 250 78",
      "M40 90 H120 L180 40 M120 70 L200 70 M150 40 L210 20",
      "M70 100 V40 M70 55 H150 M110 18 A16 16 0 1 1 110 50 M40 100 H190",
    ];
    return '<svg class="setup-art" viewBox="0 0 280 120"><rect width="280" height="120" rx="16" fill="#E7F8E4"/><path d="' + paths[i] + '" fill="none" stroke="#145214" stroke-width="4" stroke-linecap="round"/></svg>';
  }
  function bindTrain() {
    var root = document.getElementById("app");
    on(root, "#back", "click", requestLeave);
    on(root, "#startCam", "click", function () { beginSession(true); });
    on(root, "#startSim", "click", function () { beginSession(false); });
    on(root, "#hold", "click", function () {
      train.qInExercise = 0;
      train.chain = {};
      askNext();
    });
    if (train && train.phase === "ask" && train.live && train.live.bind) {
      train.live.bind(root.querySelector("#qBox"), function (correct) {
        sampleOnce();
        var q = train.live;
        q.end = Date.now() - train.started;
        q.rt = q.end - q.start;
        q.correct = !!correct;
        delete q.html;
        delete q.bind;
        delete q._answer;
        train.questions.push(q);
        train.live = null;
        train.qInExercise += 1;
        if (train.qInExercise < 2) askNext();
        else {
          train.exercise += 1;
          if (train.exercise < 3) {
            train.phase = "setup";
            render();
          } else finishTrain();
        }
      });
    }
  }
  function beginSession(wantCamera) {
    train.started = Date.now();
    train.phase = "setup";
    train.exercise = 0;
    startMonitor(wantCamera).then(function () {
      if (camera.source !== "camera" && wantCamera) train.cameraFailed = true;
      if (page === "train") render();
    });
    render();
  }
  function requestLeave() {
    if (!train || train.phase === "guide") {
      train = null;
      stopMonitor();
      go("home");
      return;
    }
    openModal(
      "<p>现在离开的话，这次不算做完，也不会出结果。</p>" +
        '<button type="button" class="btn lime" id="stay">留下</button><button type="button" class="btn ghost" id="leave">离开</button>',
      function (m) {
        on(m, "#stay", "click", closeModal);
        on(m, "#leave", "click", function () {
          closeModal();
          train = null;
          stopMonitor();
          go("home");
        });
      }
    );
  }
  function askNext() {
    var q = makeQuestion(train.level, train.chain);
    q.n = train.questions.length + 1;
    q.level = train.level;
    q.difficulty = train.level;
    q.start = Date.now() - train.started;
    train.live = q;
    train.phase = "ask";
    sampleOnce();
    render();
  }
  function makeQuestion(level, chain) {
    if (level === 1) return makeSub(chain);
    if (level === 2) return makeMonth(chain);
    if (level === 3) return makeStroop();
    if (level === 4) return makeCancel();
    return makeFluency();
  }
  function choiceQuestion(prompt, options, correctValue, giant) {
    var q = {
      type: prompt,
      prompt: prompt,
      html:
        (giant ? '<div class="card">' + giant + "</div>" : "") +
        '<p class="q-lead">' + prompt + '</p><div class="answers">' +
        options.map(function (op) {
          return '<button type="button" data-v="' + esc(op) + '">' + esc(op) + "</button>";
        }).join("") +
        "</div>",
    };
    q.bind = function (box, done) {
      var locked = false;
      q._answer = function (forceCorrect) {
        if (locked) return;
        locked = true;
        done(forceCorrect);
      };
      box.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (locked) return;
          locked = true;
          done(btn.getAttribute("data-v") === String(correctValue));
        });
      });
    };
    return q;
  }
  function makeSub(chain) {
    if (!chain.step) {
      chain.step = Math.random() < 0.5 ? 3 : 7;
      var starts = chain.step === 7 ? [100, 93, 86, 79] : [90, 81, 72, 63];
      chain.value = starts[Math.floor(Math.random() * starts.length)];
    }
    var from = chain.value;
    var correct = from - chain.step;
    chain.value = correct;
    var opts = shuffle([correct, correct + chain.step, Math.max(0, correct - chain.step)].filter(function (n, i, a) {
      return a.indexOf(n) === i;
    }));
    return choiceQuestion("从 " + from + " 连续减 " + chain.step + "。下一个数是？", opts, correct, '<div class="q-giant">' + from + "</div>");
  }
  function makeMonth(chain) {
    if (chain.month == null) chain.month = Math.floor(Math.random() * 12);
    var cur = chain.month;
    var prev = (cur + 11) % 12;
    chain.month = prev;
    var opts = shuffle([prev, (prev + 1) % 12, (prev + 2) % 12, (prev + 10) % 12].filter(function (n, i, a) {
      return a.indexOf(n) === i;
    })).slice(0, 4);
    if (opts.indexOf(prev) < 0) opts[0] = prev;
    return choiceQuestion("倒着说。" + MONTHS[cur] + "的前一个月是？", opts.map(function (n) { return MONTHS[n]; }), MONTHS[prev], '<div class="q-giant">' + MONTHS[cur] + "</div>");
  }
  function makeStroop() {
    var colors = [
      { name: "红", hex: "#D32F2F" },
      { name: "黄", hex: "#C47D00" },
      { name: "蓝", hex: "#1565C0" },
      { name: "绿", hex: "#1B7A32" },
    ];
    var word = colors[Math.floor(Math.random() * 4)];
    var ink = colors[Math.floor(Math.random() * 4)];
    while (ink.name === word.name) ink = colors[Math.floor(Math.random() * 4)];
    var giant = '<div class="q-giant" style="color:' + ink.hex + '">' + word.name + "</div>";
    return choiceQuestion("看颜色，不要读字。这是什么颜色？", colors.map(function (c) { return c.name; }), ink.name, giant);
  }
  function makeCancel() {
    var target = String(2 + Math.floor(Math.random() * 7));
    var cells = [];
    for (var i = 0; i < 12; i++) cells.push(String(Math.floor(Math.random() * 10)));
    var spots = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).slice(0, 4);
    cells.forEach(function (c, idx) {
      if (spots.indexOf(idx) >= 0) cells[idx] = target;
      else if (cells[idx] === target) cells[idx] = String((parseInt(target, 10) + 1) % 10);
    });
    var q = {
      type: "划掉",
      prompt: "划掉所有的 " + target,
      html:
        '<p class="q-lead">划掉所有的「' + target + '」</p><div class="num-grid">' +
        cells.map(function (c, idx) {
          return '<button type="button" data-i="' + idx + '">' + c + "</button>";
        }).join("") +
        '</div><div style="height:10px"></div><button type="button" class="btn lime" id="cancelDone">划完了</button>',
    };
    q.bind = function (box, done) {
      var marked = {};
      var locked = false;
      q._answer = function (forceCorrect) {
        if (locked) return;
        locked = true;
        done(forceCorrect);
      };
      box.querySelectorAll(".num-grid button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var i = btn.getAttribute("data-i");
          marked[i] = !marked[i];
          btn.classList.toggle("struck", marked[i]);
        });
      });
      box.querySelector("#cancelDone").addEventListener("click", function () {
        if (locked) return;
        locked = true;
        var ok = true;
        cells.forEach(function (c, idx) {
          var hit = !!marked[idx];
          if ((c === target && !hit) || (c !== target && hit)) ok = false;
        });
        done(ok);
      });
    };
    return q;
  }
  function makeFluency() {
    var cats = Object.keys(WORDS);
    var cat = cats[Math.floor(Math.random() * cats.length)];
    var q = {
      type: "说一类词",
      prompt: "说" + cat,
      html:
        '<p class="q-lead">说一类词</p><div class="card"><div class="q-giant" style="font-size:48px">' + cat + "</div></div>" +
        '<p class="hint">每说出一个，写下来再记下。至少 3 个。说完按下面的按钮。</p>' +
        '<div class="word-box"><input id="word" maxlength="8" placeholder="一个词"><button type="button" class="btn lime" id="addWord" style="width:120px">记下</button></div>' +
        '<div class="chips" id="wordList"></div><button type="button" class="btn lime" id="wordDone">说完了</button>',
    };
    q.bind = function (box, done) {
      var words = [];
      var locked = false;
      q._answer = function (forceCorrect) {
        if (locked) return;
        locked = true;
        done(forceCorrect);
      };
      function paint() {
        box.querySelector("#wordList").innerHTML = words.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("");
      }
      box.querySelector("#addWord").addEventListener("click", function () {
        var input = box.querySelector("#word");
        var w = input.value.replace(/\s/g, "");
        if (!w) return;
        words.push(w);
        input.value = "";
        paint();
      });
      var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Rec) {
        var hear = document.createElement("button");
        hear.type = "button";
        hear.className = "btn ghost small";
        hear.textContent = "用说话填到格子里";
        hear.style.marginTop = "8px";
        box.querySelector(".word-box").after(hear);
        hear.addEventListener("click", function () {
          var rec = new Rec();
          rec.lang = "zh-CN";
          rec.onresult = function (e) {
            box.querySelector("#word").value = e.results[0][0].transcript.replace(/\s/g, "");
          };
          rec.start();
        });
      }
      box.querySelector("#wordDone").addEventListener("click", function () {
        if (locked) return;
        locked = true;
        var valid = 0;
        words.forEach(function (w) {
          if (WORDS[cat].indexOf(w) >= 0) valid += 1;
        });
        done(valid >= 3);
      });
    };
    return q;
  }

  function startMonitor(wantCamera) {
    stopMonitor();
    camera.samples = [];
    camera.thumbs = [];
    camera.smooth = null;
    camera.overMs = 0;
    camera.coolUntil = 0;
    camera.source = "simulation";
    function loop() {
      camera.timer = setInterval(sampleOnce, 500);
    }
    if (!wantCamera || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      loop();
      return Promise.resolve();
    }
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(function (stream) {
        camera.stream = stream;
        camera.source = "camera";
        var video = document.getElementById("camVideo");
        video.srcObject = stream;
        return video.play();
      })
      .then(function () {
        loop();
        camera.photo = setInterval(snap, 8000);
      })
      .catch(function () {
        camera.source = "simulation";
        loop();
      });
  }
  function stopMonitor() {
    if (camera.timer) clearInterval(camera.timer);
    if (camera.photo) clearInterval(camera.photo);
    camera.timer = null;
    camera.photo = null;
    if (camera.stream) {
      camera.stream.getTracks().forEach(function (t) { t.stop(); });
      camera.stream = null;
    }
    var video = document.getElementById("camVideo");
    if (video) video.srcObject = null;
  }
  function sampleOnce() {
    if (!train || !train.started) return;
    var t = Date.now() - train.started;
    var lean = null;
    var valid = false;
    if (camera.source === "camera") {
      var raw = SHPose.estimateLean(document.getElementById("camVideo"));
      if (raw != null && isFinite(raw)) {
        camera.smooth = camera.smooth == null ? raw : camera.smooth * 0.55 + raw * 0.45;
        lean = Math.abs(camera.smooth);
        valid = true;
      }
    } else {
      lean = simulatedLean(t);
      valid = true;
    }
    camera.samples.push({ t: t, lean: valid ? lean : null, valid: valid });
    if (valid && lean > SHPose.LIMITS.leanDeg) {
      camera.overMs += 500;
      if (camera.overMs >= SHPose.LIMITS.holdMs && Date.now() > camera.coolUntil) {
        if (navigator.vibrate) navigator.vibrate(180);
        window.__lastBuzz = Date.now();
        camera.coolUntil = Date.now() + 8000;
        camera.overMs = 0;
      }
    } else camera.overMs = 0;
  }
  function simulatedLean(t) {
    var lean = 1.3 + 0.15 * Math.sin(t / 700);
    var q = train && train.live;
    if (q && t >= q.start) {
      var add = [0.9, 1.8, 4.6, 5.6, 6.4][q.level - 1] || 1;
      var u = Math.min(1, (t - q.start) / 2200);
      lean += add * u;
    }
    return Math.max(0, lean);
  }
  function snap() {
    var video = document.getElementById("camVideo");
    if (!video || !video.videoWidth || !train) return;
    var c = document.createElement("canvas");
    c.width = 120;
    c.height = 160;
    c.getContext("2d").drawImage(video, 0, 0, 120, 160);
    camera.thumbs.push({ t: Date.now() - train.started, url: c.toDataURL("image/jpeg", 0.55) });
  }
  function avg(arr) {
    if (!arr.length) return null;
    var s = 0;
    arr.forEach(function (x) { s += x.lean; });
    return s / arr.length;
  }
  function finishTrain() {
    var samples = camera.samples.slice();
    var thumbs = camera.thumbs.slice();
    var source = camera.source;
    stopMonitor();
    var questions = train.questions.map(function (q) {
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
      var over = s.valid && s.lean > SHPose.LIMITS.leanDeg;
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
      var hit = null;
      questions.forEach(function (q) {
        if (mid >= q.start && mid <= q.end) hit = q;
      });
      sp.questionN = hit ? hit.n : null;
      sp.level = hit ? hit.level : null;
    });
    var correctN = questions.filter(function (q) { return q.correct; }).length;
    var accuracy = questions.length ? correctN / questions.length : 0;
    var meanRt = questions.length ? questions.reduce(function (s, q) { return s + q.rt; }, 0) / questions.length : 0;
    var obvious = spans.some(function (sp) { return sp.long; }) || questions.some(function (q) {
      return q.leanMean != null && q.leanMean > SHPose.LIMITS.leanDeg;
    });
    var rule = SHSim.nextLevel(train.level, accuracy, db.streak, obvious);
    var advice = adviceText(train.level, rule, accuracy, obvious);
    var session = {
      id: "s" + Date.now(),
      at: Date.now(),
      level: train.level,
      accuracy: accuracy,
      meanRt: meanRt,
      obviousLean: obvious,
      adviceTitle: advice.title,
      adviceDetail: advice.detail,
      nextLevel: rule.level,
      postureSource: source,
      threshold: SHPose.LIMITS.leanDeg,
      samples: samples,
      questions: questions,
      overSpans: spans,
      photoCount: thumbs.length,
      thumbs: thumbs,
    };
    db.sessions.push(session);
    db.level = rule.level;
    db.streak = rule.streak;
    persist();
    viewSessionId = session.id;
    train = null;
    page = "result";
    location.hash = "#/result";
    render();
  }
  function adviceText(level, rule, accuracy, obvious) {
    var pct = Math.round(accuracy * 100);
    if (rule.reason === "down") {
      if (rule.level === level) {
        return { title: "下次建议：维持", detail: "这次正确率 " + pct + "%，低于 70%。已经是第 1 级，下次还是这一级。" };
      }
      return { title: "下次建议：降一级", detail: "这次正确率 " + pct + "%，低于 70%。下次先降到第 " + rule.level + " 级。这一级要到下次训练才用。" };
    }
    if (rule.reason === "up") {
      if (rule.level === level) {
        return { title: "下次建议：维持", detail: "连续两次正确率都超过 80%，而且身子没有一直明显歪着。已经是第 5 级，下次还是这一级。" };
      }
      return { title: "下次建议：升一级", detail: "连续两次正确率都超过 80%，而且身子没有一直明显歪着。下次升到第 " + rule.level + " 级。" };
    }
    if (rule.reason === "lean-block") {
      return { title: "下次建议：维持", detail: "这次正确率 " + pct + "%，已经超过 80%。可是答题时身子还明显歪着，所以即使答对了，这次也不升级。下次还是第 " + level + " 级。" };
    }
    if (rule.reason === "keep-good") {
      return { title: "下次建议：维持", detail: "这次正确率 " + pct + "%，超过 80%。还需要再有一次同样稳，下次才升一级。下次还是第 " + level + " 级。" };
    }
    return { title: "下次建议：维持", detail: "这次正确率 " + pct + "%。没有到升一级或降一级的标准，下次还是第 " + level + " 级。" + (obvious ? "答题时身子有一会儿过了界限。" : "") };
  }

  window.addEventListener("hashchange", function () {
    var name = (location.hash || "#/home").replace("#/", "") || "home";
    if (views[name] && name !== page) {
      if (page === "train") stopMonitor();
      page = name;
      render();
    }
  });

  window.__SH = {
    go: go,
    db: function () { return db; },
    page: function () { return gate(page); },
    camera: function () { return camera.source; },
    buzz: function () { return window.__lastBuzz || 0; },
    answer: function (ok) {
      if (train && train.live && train.live._answer) train.live._answer(!!ok);
    },
    setLevel: function (n) {
      db.level = n;
      persist();
    },
  };

  if (!draft) draft = draftFrom(db.assessment);
  var start = (location.hash || "#/home").replace("#/", "") || "home";
  page = views[start] ? start : "home";
  render();
})();
