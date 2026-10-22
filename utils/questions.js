var LEVEL_NAME = ["", "连续减 3 或减 7", "倒着说月份", "颜色和字对不上", "划掉指定数字", "说一类词"];
var MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
var WORDS = {
  蔬菜: ["白菜", "青菜", "菠菜", "番茄", "西红柿", "黄瓜", "茄子", "土豆", "萝卜", "胡萝卜", "豆角", "芹菜", "西兰花", "南瓜", "冬瓜", "韭菜", "莲藕", "玉米", "辣椒", "生菜", "洋葱", "蒜苗", "莴笋", "山药", "花菜", "苦瓜"],
  水果: ["苹果", "香蕉", "橘子", "橙子", "梨", "葡萄", "西瓜", "草莓", "桃", "桃子", "猕猴桃", "芒果", "菠萝", "柚子", "樱桃", "荔枝", "龙眼", "枣", "柿子", "哈密瓜", "蓝莓", "石榴"],
  动物: ["猫", "狗", "兔子", "老虎", "狮子", "大象", "鸟", "鱼", "马", "牛", "羊", "猪", "鸡", "鸭", "熊猫", "猴子", "熊", "鹿", "青蛙", "乌龟", "老鼠", "鹅"],
  家具: ["桌子", "椅子", "床", "沙发", "柜子", "衣柜", "书架", "凳子", "茶几", "台灯", "饭桌", "梳妆台"],
};

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

function choice(prompt, giant, options, correct, color) {
  return {
    type: "choice",
    prompt: prompt,
    giant: giant || "",
    giantColor: color || "#102910",
    options: options.map(function (op) { return { text: String(op) }; }),
    correct: String(correct),
  };
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
  return choice("从 " + from + " 连续减 " + chain.step + "。下一个数是？", String(from), opts, correct);
}

function makeMonth(chain) {
  if (chain.month == null) chain.month = Math.floor(Math.random() * 12);
  var cur = chain.month;
  var prev = (cur + 11) % 12;
  chain.month = prev;
  var idxs = shuffle([prev, (prev + 1) % 12, (prev + 2) % 12, (prev + 10) % 12].filter(function (n, i, a) {
    return a.indexOf(n) === i;
  }));
  if (idxs.indexOf(prev) < 0) idxs[0] = prev;
  return choice("倒着说。" + MONTHS[cur] + "的前一个月是？", MONTHS[cur], idxs.map(function (n) { return MONTHS[n]; }), MONTHS[prev]);
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
  return choice("看颜色，不要读字。这是什么颜色？", word.name, colors.map(function (c) { return c.name; }), ink.name, ink.hex);
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
  return {
    type: "grid",
    prompt: "划掉所有的「" + target + "」",
    giant: "",
    cells: cells.map(function (n, i) { return { n: n, i: i, struck: false }; }),
    target: target,
  };
}

function makeFluency() {
  var cats = Object.keys(WORDS);
  var cat = cats[Math.floor(Math.random() * cats.length)];
  return { type: "words", prompt: "说一类词", giant: cat, category: cat, giantColor: "#102910" };
}

function makeQuestion(level, chain) {
  if (level === 1) return makeSub(chain);
  if (level === 2) return makeMonth(chain);
  if (level === 3) return makeStroop();
  if (level === 4) return makeCancel();
  return makeFluency();
}

function wordOk(cat, list) {
  var dict = WORDS[cat] || [];
  var valid = 0;
  list.forEach(function (w) {
    if (dict.indexOf(w) >= 0) valid += 1;
  });
  return valid >= 3;
}

module.exports = { LEVEL_NAME: LEVEL_NAME, makeQuestion: makeQuestion, wordOk: wordOk };
