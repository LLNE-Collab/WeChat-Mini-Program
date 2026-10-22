var store = require("../../utils/store.js");

Page({
  data: { list: [] },
  onShow: function () {
    var db = store.load();
    var list = db.postures.map(function (p, i) {
      return {
        id: p.id,
        n: i + 1,
        when: store.clockText(p.at),
        line: p.refused
          ? "没给数字：" + p.refused
          : "肩高差 " + Number(p.shoulderCm).toFixed(1) + " 厘米 · 侧歪 " + Math.abs(p.lean).toFixed(1) + "°",
      };
    });
    list.reverse();
    this.setData({ list: list });
  },
});
