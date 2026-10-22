function indexForRoute(list) {
  var pages = getCurrentPages();
  var route = pages.length ? pages[pages.length - 1].route : "";
  for (var i = 0; i < list.length; i++) {
    if (list[i].pagePath.replace(/^\//, "") === route) return i;
  }
  return 0;
}

Component({
  data: {
    selected: 0,
    animate: false,
    list: [
      { pagePath: "/pages/home/home", text: "首页", icon: "/assets/tab-home.png", iconOn: "/assets/tab-home-on.png" },
      { pagePath: "/pages/records/records", text: "我的", icon: "/assets/tab-mine.png", iconOn: "/assets/tab-mine-on.png" },
    ],
  },
  lifetimes: {
    created: function () {
      this.data.selected = indexForRoute(this.data.list);
    },
    ready: function () {
      var self = this;
      setTimeout(function () {
        self.setData({ animate: true });
      }, 80);
    },
  },
  pageLifetimes: {
    show: function () {
      var index = indexForRoute(this.data.list);
      if (index !== this.data.selected) this.setData({ selected: index });
    },
  },
  methods: {
    switchTab: function (e) {
      var path = e.currentTarget.dataset.path;
      var index = Number(e.currentTarget.dataset.index);
      if (index === this.data.selected) return;
      this.setData({ selected: index });
      wx.switchTab({ url: path });
    },
  },
});
