var store = require("../../utils/store.js");

Page({
  onShow: function () {
    if (typeof this.getTabBar === "function" && this.getTabBar()) this.getTabBar().setData({ selected: 1 });
  },
  goSessions: function () {
    wx.navigateTo({ url: "/pages/session-log/session-log" });
  },
  goPostures: function () {
    wx.navigateTo({ url: "/pages/posture-log/posture-log" });
  },
  wipe: function () {
    wx.showModal({
      title: "清空记录",
      content: "清空后，评估、训练和姿势记录都会从这台手机消失。",
      confirmText: "清空",
      cancelText: "再想想",
      success: function (res) {
        if (!res.confirm) return;
        store.save(store.empty());
        wx.switchTab({ url: "/pages/home/home" });
      },
    });
  },
});
