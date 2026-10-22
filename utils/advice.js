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

module.exports = { adviceText: adviceText };
