if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const sqliteUtil = {
    dbName: "Smart_Ruler",
    // 数据库名称
    dbPath: "_downloads/Smart_Ruler.db",
    // 数据库地址,推荐以下划线为开头   _doc/xxx.db
    copyDatabase() {
      if (typeof plus === "undefined") {
        formatAppLog("warn", "at api/sqlite.js:7", "plus API 不可用，请在App中运行");
        return;
      }
      plus.io.resolveLocalFileSystemURL("/static/_db/test.db", function(entry) {
        plus.io.resolveLocalFileSystemURL("_doc", function(root) {
          entry.copyTo(root, "test.db", function() {
            formatAppLog("log", "at api/sqlite.js:14", "拷贝成功");
          }, function(err) {
            formatAppLog("log", "at api/sqlite.js:16", "拷贝失败", err);
          });
        }, function(err) {
          formatAppLog("log", "at api/sqlite.js:19", "获取 _doc 失败", err);
        });
      }, function(err) {
        formatAppLog("log", "at api/sqlite.js:22", "找不到数据库文件", err);
      });
    },
    // 判断数据库是否打开
    isOpen() {
      var open = plus.sqlite.isOpenDatabase({
        name: this.dbName,
        // 数据库名称
        path: this.dbPath
        // 数据库地址
      });
      return open;
    },
    // 创建数据库 或 有该数据库就打开
    openSqlite() {
      return new Promise((resolve, reject) => {
        plus.sqlite.openDatabase({
          name: this.dbName,
          path: this.dbPath,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    },
    // 关闭数据库
    closeSqlite() {
      return new Promise((resolve, reject) => {
        plus.sqlite.closeDatabase({
          name: this.dbName,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    },
    // 数据库建表 sql:'CREATE TABLE IF NOT EXISTS dbTable("id" varchar(50),"name" TEXT) 
    // 创建 CREATE TABLE IF NOT EXISTS 、 dbTable 是表名，不能用数字开头、括号里是表格的表头
    createTable(dbTable, data) {
      return new Promise((resolve, reject) => {
        plus.sqlite.executeSql({
          name: this.dbName,
          sql: `CREATE TABLE IF NOT EXISTS ${dbTable}(${data})`,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    },
    // 数据库删表 sql:'DROP TABLE dbTable'
    dropTable(dbTable) {
      return new Promise((resolve, reject) => {
        plus.sqlite.executeSql({
          name: this.dbName,
          sql: `DROP TABLE ${dbTable}`,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    },
    // 向表格里添加数据 sql:'INSERT INTO dbTable VALUES('x','x','x')'   对应新增
    // 或者 sql:'INSERT INTO dbTable ('x','x','x') VALUES('x','x','x')'   具体新增
    // 插入 INSERT INTO  、 dbTable 是表名、根据表头列名插入列值
    insertTableData(dbTable, data, condition) {
      if (dbTable !== void 0 && data !== void 0) {
        var bol = JSON.stringify(data) == "{}";
        if (!bol) {
          if (condition == void 0) {
            var sql = `INSERT INTO ${dbTable} VALUES('${data}')`;
          } else {
            var sql = `INSERT INTO ${dbTable} (${condition}) VALUES(${data})`;
          }
          return new Promise((resolve, reject) => {
            plus.sqlite.executeSql({
              name: this.dbName,
              sql,
              success(e) {
                resolve(e);
              },
              fail(e) {
                reject(e);
              }
            });
          });
        } else {
          return new Promise((resolve, reject) => {
            reject("错误添加");
          });
        }
      } else {
        return new Promise((resolve, reject) => {
          reject("错误添加");
        });
      }
    },
    // 根据条件向表格里添加数据  有数据更新、无数据插入
    // (建表时需要设置主键) 例如 --- "roomid" varchar(50) PRIMARY KEY
    insertOrReplaceData(dbTable, data, condition) {
      if (dbTable !== void 0 && data !== void 0) {
        if (condition == void 0) {
          var sql = `INSERT OR REPLACE INTO ${dbTable} VALUES('${data}')`;
        } else {
          var sql = `INSERT OR REPLACE INTO ${dbTable} (${condition}) VALUES(${data})`;
        }
        return new Promise((resolve, reject) => {
          plus.sqlite.executeSql({
            name: this.dbName,
            sql,
            success(e) {
              resolve(e);
            },
            fail(e) {
              reject(e);
            }
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          reject("错误添加");
        });
      }
    },
    // 查询获取数据库里的数据 sql:'SELECT * FROM dbTable WHERE lname = 'lvalue''
    // 查询 SELECT * FROM 、 dbTable 是表名、 WHERE 查找条件 lname,lvalue 是查询条件的列名和列值
    /**
     * 通用分页查询方法
     * @param {string} dbTable 表名
     * @param {object} conditions 查询条件对象，如：{title: '衡阳项目', inspector: '张三'}
     * @param {number} page 当前页码，从1开始
     * @param {number} pageSize 每页数量
     */
    selectTableData(dbTable, conditions = {}) {
      if (!dbTable) {
        return Promise.reject("错误查询：表名不能为空");
      }
      let whereClauses = [];
      for (const key in conditions) {
        if (conditions[key]) {
          whereClauses.push(`${key} = '${conditions[key]}'`);
        }
      }
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const sql = `SELECT * FROM ${dbTable} ${whereSql}`;
      return new Promise((resolve, reject) => {
        plus.sqlite.selectSql({
          name: this.dbName,
          sql,
          success(res) {
            resolve(res);
          },
          fail(err) {
            formatAppLog("error", "at api/sqlite.js:205", "查询失败", err);
            reject(err);
          }
        });
      });
    },
    selectTableDataByPage(dbTable, page = 1, pageSize = 5) {
      const offset = (page - 1) * pageSize;
      const sql = `SELECT * FROM ${dbTable} LIMIT ${pageSize} OFFSET ${offset}`;
      return new Promise((resolve, reject) => {
        plus.sqlite.selectSql({
          name: this.dbName,
          sql,
          success: resolve,
          fail: reject
        });
      });
    },
    // 删除表
    deleteTable(dbTable) {
      return new Promise((resolve, reject) => {
        plus.sqlite.executeSql({
          name: this.dbName,
          sql: `DROP TABLE ${dbTable}`,
          success: resolve,
          fail: reject
        });
      });
    },
    // 删除表里的数据 sql:'DELETE FROM dbTable WHERE lname = 'lvalue''
    // 删除 DELETE FROM 、 dbTable 是表名、 WHERE 查找条件 lname,lvalue 是查询条件的列名和列值
    deleteTableData(table, conditions = {}) {
      if (!table) {
        return Promise.reject("表名不能为空");
      }
      let sql = `DELETE FROM ${table}`;
      const conditionKeys = Object.keys(conditions);
      if (conditionKeys.length > 0) {
        const whereClause = conditionKeys.map((key) => {
          const val = conditions[key];
          const safeVal = typeof val === "number" ? val : `'${val}'`;
          return `${key} = ${safeVal}`;
        }).join(" AND ");
        sql += ` WHERE ${whereClause}`;
      }
      return new Promise((resolve, reject) => {
        plus.sqlite.executeSql({
          name: this.dbName,
          sql,
          success(res) {
            resolve(res);
          },
          fail(err) {
            reject(err);
          }
        });
      });
    },
    // 修改数据表里的数据 sql:"UPDATE dbTable SET 列名 = '列值',列名 = '列值' WHERE lname = 'lvalue'"
    // 修改 UPDATE 、 dbTable 是表名, data: 要修改的列名=修改后列值, lname,lvalue 是查询条件的列名和列值
    updateTableData(dbTable, data, lname, lvalue) {
      if (lname == void 0) {
        var sql = `UPDATE ${dbTable} SET ${data}`;
      } else {
        var sql = `UPDATE ${dbTable} SET ${data} WHERE ${lname} = '${lvalue}'`;
      }
      return new Promise((resolve, reject) => {
        plus.sqlite.executeSql({
          name: this.dbName,
          sql,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    },
    // 获取指定数据条数  sql:"SELECT * FROM dbTable ORDER BY 'id' DESC LIMIT 15 OFFSET 'num'"
    // dbTable 表名, ORDER BY 代表排序默认正序, id 是排序的条件 DESC 代表倒序，从最后一条数据开始拿
    // LIMIT 15 OFFSET '${num}',这句的意思是跳过 num 条拿 15 条数据, num 为跳过多少条数据是动态值
    // 例 初始num设为0，就从最后的数据开始拿15条，下次不拿刚获取的数据，所以可以让num为15，这样就能一步一步的拿完所有的数据
    pullSQL(dbTable, id, num) {
      return new Promise((resolve, reject) => {
        plus.sqlite.selectSql({
          name: this.dbName,
          sql: `SELECT * FROM ${dbTable} ORDER BY '${id}' DESC LIMIT 15 OFFSET '${num}'`,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    }
  };
  class BLEManager {
    constructor() {
      this.state = {
        deviceId: "",
        serviceId: "",
        serviceId2: "",
        // 第二个服务ID
        pzdCharacteristicId: "",
        // 平整度特征值ID
        pdCharacteristicId: "",
        // 坡度特征值ID
        connected: false,
        notifyEnabled: false
      };
    }
    // 获取状态
    getState() {
      return this.state;
    }
    // 设置设备ID
    setDeviceId(deviceId) {
      this.state.deviceId = deviceId;
    }
    // 设置第一个服务ID（平整度）
    setServiceId(serviceId) {
      this.state.serviceId = serviceId;
    }
    // 设置第二个服务ID（坡度）
    setServiceId2(serviceId) {
      this.state.serviceId2 = serviceId;
    }
    // 设置平整度特征值ID
    setPzdCharacteristicId(characteristicId) {
      this.state.pzdCharacteristicId = characteristicId;
    }
    // 设置坡度特征值ID
    setPdCharacteristicId(characteristicId) {
      this.state.pdCharacteristicId = characteristicId;
    }
    // 设置连接状态
    setConnected(connected) {
      this.state.connected = connected;
    }
    // 设置通知状态
    setNotifyEnabled(enabled) {
      this.state.notifyEnabled = enabled;
    }
    // 清除所有状态
    clear() {
      this.state = {
        deviceId: "",
        serviceId: "",
        serviceId2: "",
        pzdCharacteristicId: "",
        pdCharacteristicId: "",
        connected: false,
        notifyEnabled: false
      };
    }
  }
  const bleManager = new BLEManager();
  const _imports_0$3 = "/static/image/blu.png";
  const _imports_1$2 = "/static/image/next.png";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$c = {
    data() {
      return {
        projects: [],
        page: 1,
        pageSize: 10,
        hasMore: true,
        pressedIndex: -1,
        isDeleting: false,
        isLoading: false,
        isLoadingMore: false,
        deviceInfo: null
      };
    },
    onNavigationBarButtonTap(e) {
      uni.navigateTo({
        url: "/pages/about/about"
      });
    },
    async onLoad(options) {
      await this.waitForDatabase();
      await this.resetAndLoad();
    },
    onShow() {
      const bleState = bleManager.getState();
      if (bleState.connected && bleState.deviceId) {
        uni.getBluetoothDevices({
          success: (res) => {
            const device = res.devices.find((d) => d.deviceId === bleState.deviceId);
            if (device) {
              this.deviceInfo = {
                name: device.name || device.localName || "未知设备",
                deviceId: device.deviceId
              };
            }
          }
        });
      } else {
        this.deviceInfo = null;
      }
      const app = getApp();
      if (app && app.globalData && app.globalData.dbInitialized) {
        this.resetAndLoad();
      }
    },
    methods: {
      // 新增：重置并加载数据的方法
      async resetAndLoad() {
        if (this.isLoading)
          return;
        this.projects = [];
        this.page = 1;
        this.hasMore = true;
        await this.loaddata();
      },
      // 等待数据库初始化
      waitForDatabase() {
        return new Promise((resolve) => {
          const checkDB = () => {
            const app = getApp();
            if (app && app.globalData && app.globalData.dbInitialized) {
              resolve();
            } else {
              setTimeout(checkDB, 100);
            }
          };
          checkDB();
        });
      },
      //跳转蓝牙设备
      connectDevice() {
        uni.navigateTo({
          url: "/pages/device/device"
        });
      },
      //创建项目
      createProject() {
        uni.navigateTo({
          url: "/pages/newProject/newProject"
        });
      },
      //查看项目
      inProject(s) {
        uni.showToast({
          title: s.title,
          icon: "none"
        });
        uni.navigateTo({
          url: `/pages/inProject/inProject?id=${s.id}`
        });
      },
      //查询数据库
      selectTableDataByPage() {
        return new Promise((resolve, reject) => {
          sqliteUtil.selectTableDataByPage("project", this.page, this.pageSize).then((res) => {
            resolve(res);
          }).catch((error) => {
            reject(error);
          });
        });
      },
      async loaddata() {
        const app = getApp();
        if (!app || !app.globalData || !app.globalData.dbInitialized) {
          formatAppLog("log", "at pages/index/index.vue:190", "数据库未初始化，跳过加载");
          return;
        }
        if (this.isLoading) {
          formatAppLog("log", "at pages/index/index.vue:195", "正在加载中，跳过重复加载");
          return;
        }
        this.isLoading = true;
        try {
          formatAppLog("log", "at pages/index/index.vue:201", "加载第", this.page, "页，每页", this.pageSize, "条");
          const res = await this.selectTableDataByPage();
          if (this.page === 1) {
            this.projects = res;
          } else {
            this.projects = [...this.projects, ...res];
          }
          this.hasMore = res.length >= this.pageSize;
        } catch (error) {
          formatAppLog("error", "at pages/index/index.vue:216", "数据载入失败：", error);
          uni.showToast({
            title: "数据载入失败",
            icon: "none"
          });
        } finally {
          this.isLoading = false;
        }
      },
      async loadMore() {
        if (!this.hasMore || this.isLoading || this.isLoadingMore)
          return;
        this.isLoadingMore = true;
        try {
          this.page++;
          await this.loaddata();
        } finally {
          this.isLoadingMore = false;
        }
      },
      // 新增：处理长按事件
      handleLongPress(item, index) {
        uni.vibrateShort({
          success: () => {
            this.pressedIndex = index;
            this.confirmDelete(item, index);
          }
        });
      },
      confirmDelete(item, index) {
        if (this.isDeleting)
          return;
        uni.showModal({
          title: "删除项目",
          content: `确定要删除项目「${this.formatProjectTitle(item)}」吗？
删除后数据将无法恢复。`,
          confirmText: "删除",
          cancelText: "取消",
          confirmColor: "#e64340",
          success: async (res) => {
            if (res.confirm) {
              await this.deleteProject(item.id, index);
            }
            this.pressedIndex = -1;
          },
          fail: () => {
            this.pressedIndex = -1;
          }
        });
      },
      async deleteProject(id, index) {
        if (this.isDeleting)
          return;
        this.isDeleting = true;
        uni.showLoading({
          title: "正在删除...",
          mask: true
        });
        try {
          await sqliteUtil.deleteTableData("wall_data", { "project_id": id });
          await sqliteUtil.deleteTableData("sections", { "project_id": id });
          await sqliteUtil.deleteTableData("warning_settings", { "project_id": id });
          await sqliteUtil.deleteTableData("project", { "id": id });
          this.projects.splice(index, 1);
          uni.showToast({
            title: "删除成功",
            icon: "success"
          });
        } catch (err) {
          formatAppLog("error", "at pages/index/index.vue:291", "删除失败", err);
          uni.showToast({
            title: "删除失败",
            icon: "none",
            duration: 2e3
          });
        } finally {
          uni.hideLoading();
          this.isDeleting = false;
        }
      },
      formatProjectTitle(item) {
        let result = item.title || "";
        if (item.building)
          result += "-" + item.building;
        if (item.unit)
          result += "-" + item.unit;
        if (item.floor)
          result += "-" + item.floor;
        if (item.room_number)
          result += "-" + item.room_number;
        return result;
      }
    }
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "main" }, [
      vue.createElementVNode("view", { class: "container" }, [
        vue.createCommentVNode(" 顶部标题 "),
        vue.createElementVNode("view", { class: "title-bar" }, [
          vue.createElementVNode("text", { class: "title" }, "我的设备")
        ]),
        vue.createCommentVNode(" 我的设备卡片 "),
        vue.createElementVNode("view", {
          class: "device-card",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.connectDevice && $options.connectDevice(...args))
        }, [
          vue.createElementVNode("image", {
            src: _imports_0$3,
            class: "device-icon",
            mode: "aspectFit"
          }),
          vue.createElementVNode("view", { class: "device-info" }, [
            vue.createElementVNode("view", null, [
              vue.createElementVNode("text", { class: "device-title" }, "我的设备")
            ]),
            vue.createElementVNode("view", null, [
              vue.createElementVNode(
                "text",
                { class: "device-subtitle" },
                vue.toDisplayString($data.deviceInfo ? $data.deviceInfo.name : "未连接到设备，请链接设备"),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("image", {
            src: _imports_1$2,
            class: "arrow-icon",
            mode: "aspectFit"
          })
        ]),
        vue.createCommentVNode(" 我的项目标题 "),
        vue.createElementVNode("view", { class: "myproject" }, [
          vue.createElementVNode("text", { class: "section-title" }, "我的项目"),
          vue.createElementVNode("text", { class: "section-subtitle" }, "长按可删除项目")
        ]),
        vue.createElementVNode(
          "scroll-view",
          {
            "scroll-y": "true",
            class: "scroll-area",
            onScrolltolower: _cache[1] || (_cache[1] = (...args) => $options.loadMore && $options.loadMore(...args))
          },
          [
            vue.createElementVNode("view", { class: "project-list" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.projects, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: vue.normalizeClass(["project-item", { "project-item-pressed": $data.pressedIndex === index }]),
                    key: index,
                    onLongpress: ($event) => $options.handleLongPress(item, index),
                    onClick: ($event) => $options.inProject(item)
                  }, [
                    vue.createElementVNode("image", {
                      src: item.icon,
                      class: "project-icon",
                      mode: "aspectFit"
                    }, null, 8, ["src"]),
                    vue.createElementVNode("view", { class: "project-content" }, [
                      vue.createElementVNode("view", { class: "project-title-box" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "project-title" },
                          vue.toDisplayString($options.formatProjectTitle(item)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "project-address-box" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "project-address" },
                          vue.toDisplayString(item.address),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "project-date-box" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "project-date" },
                          vue.toDisplayString(item.date),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "project-type-box" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "project-type" },
                          "项目类型：" + vue.toDisplayString(item.type_tag),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "project-status" },
                          "验收类型：" + vue.toDisplayString(item.project_status),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "project-type-box" }, [
                        vue.createElementVNode("view", null, [
                          vue.createTextVNode("验收状态："),
                          vue.createElementVNode(
                            "text",
                            {
                              class: vue.normalizeClass(["project-inspection", { "green-text": item.inspection_status === "已验收", "gray-text": item.inspection_status !== "已验收" }])
                            },
                            vue.toDisplayString(item.inspection_status),
                            3
                            /* TEXT, CLASS */
                          )
                        ]),
                        item.inspection_status === "已验收" ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 0,
                            class: "project-inspector"
                          },
                          "项目质检员：" + vue.toDisplayString(item.inspector),
                          1
                          /* TEXT */
                        )) : vue.createCommentVNode("v-if", true)
                      ])
                    ]),
                    vue.createElementVNode("image", {
                      src: _imports_1$2,
                      class: "arrow-icon",
                      mode: "aspectFit"
                    })
                  ], 42, ["onLongpress", "onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ],
          32
          /* NEED_HYDRATION */
        ),
        vue.createCommentVNode(" 项目列表 "),
        vue.createCommentVNode(" 新建项目按钮 "),
        vue.createElementVNode("view", { class: "footer" }, [
          vue.createElementVNode("button", {
            class: "new-project-btn",
            onClick: _cache[2] || (_cache[2] = (...args) => $options.createProject && $options.createProject(...args))
          }, "新建项目")
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__file", "D:/nhuProject/智能靠尺/pages/index/index.vue"]]);
  const _sfc_main$b = {
    data() {
      return {
        devices: [],
        connectedDeviceId: null,
        scanning: false,
        hasListener: false,
        statusCheckTimer: null
      };
    },
    onLoad() {
      this.initBluetooth();
      this.syncConnectedStatus();
      this.startStatusCheck();
    },
    methods: {
      async initBluetooth() {
        try {
          await this.checkBluetoothPermission();
          await this.openBluetoothAdapter();
          await this.getConnectedDevices();
          this.startBluetoothDiscovery();
        } catch (error) {
          formatAppLog("error", "at pages/device/device.vue:58", "蓝牙初始化失败:", error);
        }
      },
      async getConnectedDevices() {
        return new Promise((resolve, reject) => {
          uni.getBluetoothDevices({
            success: (res) => {
              const bleState = bleManager.getState();
              if (bleState.deviceId) {
                const connectedDevice = res.devices.find((device) => device.deviceId === bleState.deviceId);
                if (connectedDevice) {
                  this.connectedDeviceId = connectedDevice.deviceId;
                  this.updateDeviceStatus(connectedDevice.deviceId, "已连接");
                } else {
                  bleManager.clear();
                  this.connectedDeviceId = null;
                }
              }
              resolve();
            },
            fail: (err) => {
              formatAppLog("error", "at pages/device/device.vue:80", "获取蓝牙设备列表失败:", err);
              reject(err);
            }
          });
        });
      },
      async checkBluetoothPermission() {
        return new Promise((resolve, reject) => {
          if (uni.getSystemInfoSync().platform === "android") {
            const permissions = [
              "android.permission.BLUETOOTH_ADMIN",
              "android.permission.BLUETOOTH",
              "android.permission.ACCESS_FINE_LOCATION",
              "android.permission.ACCESS_COARSE_LOCATION"
            ];
            plus.android.requestPermissions(
              permissions,
              function(resultObj) {
                if (resultObj.granted.length === permissions.length) {
                  resolve();
                } else {
                  uni.showModal({
                    title: "提示",
                    content: "请授予蓝牙和位置权限以搜索设备",
                    showCancel: false
                  });
                  reject(new Error("Permission denied"));
                }
              },
              function(error) {
                formatAppLog("error", "at pages/device/device.vue:112", "Request permissions error:", error);
                reject(error);
              }
            );
          } else {
            resolve();
          }
        });
      },
      async openBluetoothAdapter() {
        return new Promise((resolve, reject) => {
          uni.openBluetoothAdapter({
            success: (res) => {
              formatAppLog("log", "at pages/device/device.vue:126", "蓝牙适配器初始化成功");
              resolve(res);
            },
            fail: (err) => {
              formatAppLog("error", "at pages/device/device.vue:130", "蓝牙适配器初始化失败:", err);
              uni.showModal({
                title: "提示",
                content: "请开启手机蓝牙后重试",
                showCancel: false
              });
              reject(err);
            }
          });
        });
      },
      startBluetoothDiscovery() {
        if (this.scanning) {
          return;
        }
        this.syncConnectedStatus();
        this.scanning = true;
        uni.openBluetoothAdapter({
          success: () => {
            uni.stopBluetoothDevicesDiscovery({
              complete: () => {
                if (!this.hasListener) {
                  this.listenForDevices();
                }
                uni.startBluetoothDevicesDiscovery({
                  allowDuplicatesKey: false,
                  interval: 0,
                  success: () => {
                    formatAppLog("log", "at pages/device/device.vue:163", "开始搜索设备");
                  },
                  fail: (err) => {
                    formatAppLog("error", "at pages/device/device.vue:166", "搜索设备失败:", err);
                    this.scanning = false;
                    uni.showToast({
                      title: "搜索设备失败",
                      icon: "none"
                    });
                  }
                });
                setTimeout(() => {
                  if (this.scanning) {
                    this.scanning = false;
                    uni.stopBluetoothDevicesDiscovery();
                  }
                }, 3e4);
              }
            });
          },
          fail: (err) => {
            formatAppLog("error", "at pages/device/device.vue:185", "蓝牙适配器初始化失败:", err);
            this.scanning = false;
            uni.showModal({
              title: "提示",
              content: "请开启手机蓝牙后重试",
              showCancel: false
            });
          }
        });
      },
      listenForDevices() {
        if (this.hasListener) {
          return;
        }
        uni.onBluetoothDeviceFound((res) => {
          if (!this.scanning)
            return;
          res.devices.forEach((device) => {
            if (!device.name && !device.localName)
              return;
            const isConnectedDevice = device.deviceId === this.connectedDeviceId;
            const existingIndex = this.devices.findIndex((d) => d.deviceId === device.deviceId);
            const deviceInfo = {
              ...device,
              name: device.name || device.localName || "未知设备",
              status: isConnectedDevice ? "已连接" : "未连接",
              RSSI: device.RSSI
            };
            if (existingIndex >= 0) {
              const currentStatus = this.devices[existingIndex].status;
              deviceInfo.status = currentStatus === "已连接" ? "已连接" : deviceInfo.status;
              this.devices.splice(existingIndex, 1, deviceInfo);
            } else {
              this.devices.push(deviceInfo);
            }
            this.devices.sort((a, b) => {
              if (a.status === "已连接")
                return -1;
              if (b.status === "已连接")
                return 1;
              return b.RSSI - a.RSSI;
            });
          });
        });
        this.hasListener = true;
      },
      async connectToDevice(deviceId) {
        if (this.connectedDeviceId && this.connectedDeviceId !== deviceId) {
          await this.disconnectDevice(this.connectedDeviceId);
        }
        if (this.scanning) {
          this.scanning = false;
          uni.stopBluetoothDevicesDiscovery();
        }
        try {
          await new Promise((resolve, reject) => {
            uni.createBLEConnection({
              deviceId,
              success: resolve,
              fail: reject
            });
          });
          uni.showToast({ title: "连接成功", icon: "success" });
          this.connectedDeviceId = deviceId;
          this.updateDeviceStatus(deviceId, "已连接");
          bleManager.setDeviceId(deviceId);
          bleManager.setConnected(true);
          setTimeout(() => {
            this.getDeviceServices(deviceId);
          }, 1500);
        } catch (error) {
          formatAppLog("error", "at pages/device/device.vue:267", "连接失败", error);
          this.handleDisconnect();
          uni.showToast({ title: "连接失败", icon: "none" });
        }
      },
      getDeviceServices(deviceId) {
        uni.getBLEDeviceServices({
          deviceId,
          success: (res) => {
            formatAppLog("log", "at pages/device/device.vue:277", "所有服务列表：");
            res.services.forEach((service, index) => {
              formatAppLog("log", "at pages/device/device.vue:279", `服务${index + 1} UUID: ${service.uuid}`);
            });
            const service7 = res.services[6];
            if (service7) {
              formatAppLog("log", "at pages/device/device.vue:286", "找到目标服务：", {
                "数据服务(7)": service7.uuid
              });
              bleManager.setServiceId2(service7.uuid);
              formatAppLog("log", "at pages/device/device.vue:293", "设置服务ID后的状态：", bleManager.getState());
              uni.getBLEDeviceCharacteristics({
                deviceId,
                serviceId: service7.uuid,
                success: (res2) => {
                  const charList = res2.characteristics.map((c) => ({
                    uuid: c.uuid,
                    properties: c.properties
                  }));
                  formatAppLog("log", "at pages/device/device.vue:304", "服务7特征值列表：", charList);
                  if (res2.characteristics && res2.characteristics.length > 0) {
                    const dataCharacteristic = res2.characteristics[0];
                    formatAppLog("log", "at pages/device/device.vue:308", "设置数据特征值：", dataCharacteristic.uuid);
                    bleManager.setPdCharacteristicId(dataCharacteristic.uuid);
                    formatAppLog("log", "at pages/device/device.vue:311", "最终蓝牙状态：", bleManager.getState());
                    this.enableNotify(deviceId, service7.uuid, dataCharacteristic.uuid);
                    setTimeout(() => {
                      uni.navigateBack();
                    }, 1e3);
                  } else {
                    uni.showModal({
                      title: "连接失败",
                      content: "未找到数据特征值",
                      showCancel: false
                    });
                  }
                },
                fail: (err) => {
                  formatAppLog("error", "at pages/device/device.vue:328", "获取特征值失败", err);
                  uni.showModal({
                    title: "连接失败",
                    content: "获取特征值失败",
                    showCancel: false
                  });
                }
              });
            } else {
              uni.showModal({
                title: "连接失败",
                content: "未找到目标服务",
                showCancel: false
              });
            }
          },
          fail: (err) => {
            formatAppLog("error", "at pages/device/device.vue:345", "获取服务失败", err);
            uni.showModal({
              title: "连接失败",
              content: "获取设备服务失败",
              showCancel: false
            });
          }
        });
      },
      enableNotify(deviceId, serviceId, characteristicId) {
        formatAppLog("log", "at pages/device/device.vue:356", "开启通知，参数：", {
          deviceId,
          serviceId,
          characteristicId
        });
        uni.notifyBLECharacteristicValueChange({
          deviceId,
          serviceId,
          characteristicId,
          state: true,
          success: () => {
            formatAppLog("log", "at pages/device/device.vue:368", "监听特征值变化开启成功");
            bleManager.setNotifyEnabled(true);
          },
          fail: (err) => {
            formatAppLog("error", "at pages/device/device.vue:372", "开启监听失败", err);
            uni.showModal({
              title: "提示",
              content: "开启数据监听失败，请重新连接设备",
              showCancel: false
            });
          }
        });
      },
      async disconnectDevice(deviceId) {
        return new Promise((resolve) => {
          uni.closeBLEConnection({
            deviceId,
            success: () => {
              this.updateDeviceStatus(deviceId, "未连接");
              this.connectedDeviceId = null;
              bleManager.clear();
              resolve();
            },
            fail: (err) => {
              formatAppLog("error", "at pages/device/device.vue:393", "断开连接失败:", err);
              this.connectedDeviceId = null;
              bleManager.clear();
              resolve();
            }
          });
        });
      },
      updateDeviceStatus(deviceId, status) {
        formatAppLog("log", "at pages/device/device.vue:403", "更新设备状态:", deviceId, status);
        const device = this.devices.find((item) => item.deviceId === deviceId);
        if (device) {
          device.status = status;
          this.devices = [...this.devices];
        }
        if (status === "已连接") {
          this.connectedDeviceId = deviceId;
          bleManager.setDeviceId(deviceId);
          bleManager.setConnected(true);
        } else {
          if (this.connectedDeviceId === deviceId) {
            this.connectedDeviceId = null;
            bleManager.clear();
          }
        }
      },
      async syncConnectedStatus() {
        const bleState = bleManager.getState();
        formatAppLog("log", "at pages/device/device.vue:425", "当前蓝牙状态:", bleState);
        if (bleState.connected && bleState.deviceId) {
          this.connectedDeviceId = bleState.deviceId;
          const existingDevice = this.devices.find((d) => d.deviceId === bleState.deviceId);
          if (existingDevice) {
            existingDevice.status = "已连接";
            this.devices = [...this.devices];
          } else {
            try {
              const deviceInfo = await this.getDeviceInfo(bleState.deviceId);
              if (deviceInfo) {
                this.devices.unshift({
                  ...deviceInfo,
                  status: "已连接"
                });
              }
            } catch (error) {
              formatAppLog("error", "at pages/device/device.vue:444", "获取设备信息失败:", error);
            }
          }
        } else {
          this.devices = this.devices.map((device) => ({
            ...device,
            status: "未连接"
          }));
          this.connectedDeviceId = null;
        }
      },
      async getDeviceInfo(deviceId) {
        return new Promise((resolve, reject) => {
          uni.getBluetoothDevices({
            success: (res) => {
              const device = res.devices.find((d) => d.deviceId === deviceId);
              if (device) {
                resolve({
                  ...device,
                  name: device.name || device.localName || "未知设备",
                  RSSI: device.RSSI || 0
                });
              } else {
                reject(new Error("设备未找到"));
              }
            },
            fail: reject
          });
        });
      },
      startStatusCheck() {
        if (this.statusCheckTimer) {
          clearInterval(this.statusCheckTimer);
        }
        this.statusCheckTimer = setInterval(async () => {
          if (this.connectedDeviceId) {
            try {
              const deviceInfo = await this.getDeviceInfo(this.connectedDeviceId);
              if (!deviceInfo) {
                this.handleDisconnect();
              }
            } catch (error) {
              this.handleDisconnect();
            }
          }
        }, 3e3);
      },
      handleDisconnect() {
        formatAppLog("log", "at pages/device/device.vue:496", "检测到设备断开");
        if (this.connectedDeviceId) {
          this.updateDeviceStatus(this.connectedDeviceId, "未连接");
        }
      }
    },
    onUnload() {
      if (this.statusCheckTimer) {
        clearInterval(this.statusCheckTimer);
        this.statusCheckTimer = null;
      }
      this.scanning = false;
      uni.stopBluetoothDevicesDiscovery();
      uni.offBluetoothDeviceFound();
      this.hasListener = false;
    },
    onHide() {
      if (this.statusCheckTimer) {
        clearInterval(this.statusCheckTimer);
        this.statusCheckTimer = null;
      }
    },
    onShow() {
      formatAppLog("log", "at pages/device/device.vue:520", "设备页面显示");
      this.syncConnectedStatus();
      if (this.devices.length === 0) {
        this.startBluetoothDiscovery();
      }
      this.startStatusCheck();
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "附近蓝牙设备"),
        vue.createElementVNode("button", {
          class: "refresh-btn",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.startBluetoothDiscovery && $options.startBluetoothDiscovery(...args))
        }, "刷新")
      ]),
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "device-list"
      }, [
        $data.scanning ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "scanning-tip"
        }, "正在搜索设备...")) : vue.createCommentVNode("v-if", true),
        !$data.scanning && $data.devices.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "no-device-tip"
        }, [
          vue.createTextVNode(" 未找到设备，请确保： "),
          vue.createElementVNode("text", null, "1. 设备已开启并在附近"),
          vue.createElementVNode("text", null, "2. 手机蓝牙已开启"),
          vue.createElementVNode("text", null, "3. 已授予蓝牙权限")
        ])) : vue.createCommentVNode("v-if", true),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.devices, (item, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "device-item",
              key: index,
              onClick: ($event) => $options.connectToDevice(item.deviceId, index)
            }, [
              vue.createElementVNode("view", { class: "device-icon-box" }, [
                vue.createElementVNode("image", {
                  src: _imports_0$3,
                  class: "device-icon",
                  mode: "aspectFit"
                })
              ]),
              vue.createElementVNode("view", { class: "device-info-box" }, [
                vue.createElementVNode(
                  "text",
                  { class: "device-name" },
                  vue.toDisplayString(item.name || "未知设备"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "device-id" },
                  vue.toDisplayString(item.deviceId),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "device-rssi" },
                  "信号强度: " + vue.toDisplayString(item.RSSI) + "dBm",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "device-status" },
                  vue.toDisplayString(item.status || "未连接"),
                  1
                  /* TEXT */
                )
              ])
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesDeviceDevice = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__file", "D:/nhuProject/智能靠尺/pages/device/device.vue"]]);
  const _imports_0$2 = "/static/image/logo.png";
  const _sfc_main$a = {
    data() {
      return {};
    },
    methods: {
      openGithub() {
        plus.runtime.openURL("https://github.com/YZMRX/BleRelur");
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "about-container" }, [
      vue.createElementVNode("view", { class: "about-content" }, [
        vue.createElementVNode("image", {
          src: _imports_0$2,
          mode: "aspectFit",
          class: "logo"
        }),
        vue.createElementVNode("text", { class: "app-name" }, "智能靠尺"),
        vue.createElementVNode("text", { class: "version" }, "版本 1.0.0"),
        vue.createElementVNode("view", { class: "description" }, [
          vue.createElementVNode("text", null, "智能靠尺是一款专业的建筑测量工具，致力于提供精确的墙面测量服务。")
        ])
      ]),
      vue.createElementVNode("view", {
        class: "copyright",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.openGithub && $options.openGithub(...args))
      }, [
        vue.createElementVNode("text", null, [
          vue.createTextVNode(" Copyright © 2025 by YZMRX "),
          vue.createElementVNode("br"),
          vue.createTextVNode(" All rights reserved ")
        ])
      ])
    ]);
  }
  const PagesAboutAbout = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__file", "D:/nhuProject/智能靠尺/pages/about/about.vue"]]);
  const _imports_0$1 = "/static/image/csv.png";
  const _imports_1$1 = "/static/image/template.png";
  const _imports_2 = "/static/image/text.png";
  const _sfc_main$9 = {
    methods: {
      select(type) {
        if (type === "csv") {
          uni.navigateTo({ url: "/pages/newProject/csv/csv" });
        } else if (type === "template") {
          uni.navigateTo({ url: "/pages/newProject/template/template" });
        } else if (type === "text") {
          uni.navigateTo({ url: "/pages/newProject/text/text" });
        }
      }
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }),
      vue.createElementVNode("view", { class: "tip" }, "请选择创建方式"),
      vue.createElementVNode("view", { class: "option-list" }, [
        vue.createElementVNode("view", {
          class: "option",
          onClick: _cache[0] || (_cache[0] = ($event) => $options.select("csv"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_0$1,
            class: "icon"
          }),
          vue.createElementVNode("view", { class: "info" }, [
            vue.createElementVNode("text", { class: "main" }, "通过CSV表格文件创建"),
            vue.createElementVNode("text", { class: "sub" }, "自定义验收表格的内容")
          ])
        ]),
        vue.createElementVNode("view", {
          class: "option",
          onClick: _cache[1] || (_cache[1] = ($event) => $options.select("template"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_1$1,
            class: "icon"
          }),
          vue.createElementVNode("view", { class: "info" }, [
            vue.createElementVNode("text", { class: "main" }, "通过通用模板创建"),
            vue.createElementVNode("text", { class: "sub" }, "通用性的房屋验收模板")
          ])
        ]),
        vue.createElementVNode("view", {
          class: "option",
          onClick: _cache[2] || (_cache[2] = ($event) => $options.select("text"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_2,
            class: "icon"
          }),
          vue.createElementVNode("view", { class: "info" }, [
            vue.createElementVNode("text", { class: "main" }, "通过文本创建"),
            vue.createElementVNode("text", { class: "sub" }, "根据规范创建文本，粘贴文本创建项目")
          ])
        ])
      ])
    ]);
  }
  const PagesNewProjectNewProject = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-03c28405"], ["__file", "D:/nhuProject/智能靠尺/pages/newProject/newProject.vue"]]);
  const csvUtils = {
    /**
     * 生成CSV内容
     * @param {Object} options - 配置选项
     * @param {Object} options.projectInfo - 项目信息对象
     * @param {Object} options.warningSettings - 预警设置对象
     * @param {Boolean} options.showSlope - 是否显示坡度数据
     * @param {Boolean} options.showFlatness - 是否显示平整度数据
     * @param {Function} options.isOverWarning - 判断是否超过预警值的函数
     * @param {Array} options.sections - 房间列表
     * @param {Object} options.sectionData - 房间数据对象
     * @returns {String} 生成的CSV内容
     */
    generateCSVContent(options = {}) {
      const {
        projectInfo = {},
        warningSettings = {},
        showSlope = true,
        showFlatness = true,
        isOverWarning = () => false,
        sections = [],
        sectionData = {}
      } = options;
      let csvContent = "";
      const projectHeaders = [
        "项目名称",
        "项目地址",
        "验收日期",
        "栋",
        "单元",
        "楼层",
        "房号",
        "项目类型",
        "验收类型",
        "验收状态",
        "项目质检员"
      ];
      csvContent += projectHeaders.join(",") + "\n";
      const projectValues = [
        `"${projectInfo.title || ""}"`,
        `"${projectInfo.address || ""}"`,
        `"${projectInfo.date || ""}"`,
        `"${projectInfo.building || ""}"`,
        `"${projectInfo.unit || ""}"`,
        `"${projectInfo.floor || ""}"`,
        `"${projectInfo.room_number || ""}"`,
        `"${projectInfo.type_tag || ""}"`,
        `"${projectInfo.project_status || ""}"`,
        `"${projectInfo.inspection_status || ""}"`,
        `"${projectInfo.inspector || ""}"`
      ];
      csvContent += projectValues.join(",") + "\n";
      let warningInfo = "预警值设置：";
      const projectType = projectInfo.project_status;
      if (projectType === "坡度" || projectType === "坡度加平整度") {
        warningInfo += `坡度预警值(mm/M)：${warningSettings.slopeWarning || "未设置"}`;
      }
      if (projectType === "平整度" || projectType === "坡度加平整度") {
        if (warningInfo !== "预警值设置：")
          warningInfo += "，";
        warningInfo += `平整度预警值(mm)：${warningSettings.flatnessWarning || "未设置"}`;
      }
      csvContent += warningInfo + "\n";
      let headers = ["房间", "墙体"];
      if (projectType === "坡度") {
        headers.push("坡度(mm/M)");
      } else if (projectType === "平整度") {
        headers.push("平整度(mm)");
      } else if (projectType === "坡度加平整度") {
        if (showSlope)
          headers.push("坡度(mm/M)");
        if (showFlatness)
          headers.push("平整度(mm)");
      }
      if (headers.length > 2) {
        headers.push("预警状态");
      }
      csvContent += headers.join(",") + "\n";
      sections.forEach((section) => {
        const walls = sectionData[section];
        let hasRoomData = false;
        if (walls && walls.length > 0) {
          walls.forEach((wall) => {
            const hasValidData = projectType === "坡度" && wall.slope || projectType === "平整度" && wall.flatness || projectType === "坡度加平整度" && (showSlope && wall.slope || showFlatness && wall.flatness);
            if (hasValidData) {
              hasRoomData = true;
              let row = [
                `"${section}"`,
                `"${wall.name}"`
              ];
              if (projectType === "坡度") {
                row.push(`"${wall.slope || ""}"`);
              } else if (projectType === "平整度") {
                row.push(`"${wall.flatness || ""}"`);
              } else if (projectType === "坡度加平整度") {
                if (showSlope)
                  row.push(`"${wall.slope || ""}"`);
                if (showFlatness)
                  row.push(`"${wall.flatness || ""}"`);
              }
              if (row.length > 2) {
                let warningStatus = "否";
                if (isOverWarning && typeof isOverWarning === "function") {
                  if (projectType === "坡度") {
                    const slopeValue = parseFloat(wall.slope) || 0;
                    const slopeWarning = parseFloat(warningSettings.slopeWarning) || 0;
                    if (slopeValue > slopeWarning && slopeWarning > 0) {
                      warningStatus = "是";
                    }
                  } else if (projectType === "平整度") {
                    const flatnessValue = parseFloat(wall.flatness) || 0;
                    const flatnessWarning = parseFloat(warningSettings.flatnessWarning) || 0;
                    if (flatnessValue > flatnessWarning && flatnessWarning > 0) {
                      warningStatus = "是";
                    }
                  } else if (projectType === "坡度加平整度") {
                    const slopeValue = parseFloat(wall.slope) || 0;
                    const flatnessValue = parseFloat(wall.flatness) || 0;
                    const slopeWarning = parseFloat(warningSettings.slopeWarning) || 0;
                    const flatnessWarning = parseFloat(warningSettings.flatnessWarning) || 0;
                    if (showSlope && slopeValue > slopeWarning && slopeWarning > 0 || showFlatness && flatnessValue > flatnessWarning && flatnessWarning > 0) {
                      warningStatus = "是";
                    }
                  }
                }
                row.push(`"${warningStatus}"`);
              }
              csvContent += row.join(",") + "\n";
            }
          });
        }
        if (!hasRoomData) {
          let row = [`"${section}"`, `"暂无数据"`];
          if (projectType === "坡度") {
            row.push('""');
          } else if (projectType === "平整度") {
            row.push('""');
          } else if (projectType === "坡度加平整度") {
            if (showSlope)
              row.push('""');
            if (showFlatness)
              row.push('""');
          }
          if (row.length > 2) {
            row.push('"否"');
          }
          csvContent += row.join(",") + "\n";
        }
      });
      return csvContent;
    },
    /**
     * 解析CSV内容为表格数据
     * @param {String} csvContent - CSV内容
     * @returns {Object} 解析结果
     */
    parseCSVContent(csvContent) {
      try {
        const rows = csvContent.split("\n").map((row) => row.trim()).filter((row) => row);
        const projectHeaders = rows[0].split(",").map((h) => h.trim());
        const projectValues = rows[1].split(",").map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
        const projectInfo = {};
        projectHeaders.forEach((header, index) => {
          projectInfo[header] = projectValues[index] || "";
        });
        const warningLine = rows[2];
        const warningSettings = {};
        const slopeMatch = warningLine.match(/坡度预警值\(mm\/M\)：(\d+\.?\d*)/);
        const flatnessMatch = warningLine.match(/平整度预警值\(mm\)：(\d+\.?\d*)/);
        if (slopeMatch) {
          warningSettings.slopeWarning = slopeMatch[1];
        }
        if (flatnessMatch) {
          warningSettings.flatnessWarning = flatnessMatch[1];
        }
        const dataRows = rows.slice(3);
        const headers = dataRows[0].split(",").map((h) => h.trim().replace(/^"(.*)"$/, "$1"));
        const roomIndex = headers.findIndex((h) => h === "房间" || h === "区域");
        const wallIndex = headers.findIndex((h) => h === "墙体");
        const slopeIndex = headers.findIndex((h) => h === "坡度(mm/M)" || h === "坡度");
        const flatnessIndex = headers.findIndex((h) => h === "平整度(mm)" || h === "平整度");
        const projectType = projectInfo["验收类型"];
        const filteredHeaders = ["房间", "墙体"];
        if (projectType === "坡度") {
          if (slopeIndex !== -1) {
            filteredHeaders.push("坡度(mm/M)");
          }
        } else if (projectType === "平整度") {
          if (flatnessIndex !== -1) {
            filteredHeaders.push("平整度(mm)");
          }
        } else if (projectType === "坡度加平整度") {
          if (slopeIndex !== -1) {
            filteredHeaders.push("坡度(mm/M)");
          }
          if (flatnessIndex !== -1) {
            filteredHeaders.push("平整度(mm)");
          }
        }
        const tableData = dataRows.slice(1).map((row) => {
          const cells = row.split(",").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
          const result = [];
          if (roomIndex !== -1)
            result.push(cells[roomIndex]);
          if (wallIndex !== -1)
            result.push(cells[wallIndex]);
          if (projectType === "坡度") {
            if (slopeIndex !== -1)
              result.push(cells[slopeIndex]);
          } else if (projectType === "平整度") {
            if (flatnessIndex !== -1)
              result.push(cells[flatnessIndex]);
          } else if (projectType === "坡度加平整度") {
            if (slopeIndex !== -1)
              result.push(cells[slopeIndex]);
            if (flatnessIndex !== -1)
              result.push(cells[flatnessIndex]);
          }
          return result;
        });
        return {
          headers: filteredHeaders,
          tableData,
          projectInfo,
          warningSettings
        };
      } catch (error) {
        formatAppLog("error", "at utils/csvUtils.js:281", "解析CSV内容失败:", error);
        return null;
      }
    },
    /**
     * 计算CSV文件大小
     * @param {String} content - CSV内容
     * @returns {String} 格式化后的文件大小
     */
    calculateFileSize(content) {
      const bytes = content.length;
      if (bytes < 1024)
        return bytes + " B";
      if (bytes < 1024 * 1024)
        return (bytes / 1024).toFixed(2) + " KB";
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    },
    /**
     * 处理CSV内容，确保表头和数据正确对应
     * @param {String} content - 原始CSV内容
     * @returns {String} 处理后的CSV内容
     */
    processCSVContent(content) {
      try {
        const rows = content.split("\n").map((row) => row.trim()).filter((row) => row);
        const headerRows = rows.slice(0, 3);
        const headerRow = rows[3];
        const dataRows = rows.slice(4);
        return [...headerRows, headerRow, ...dataRows].join("\n");
      } catch (error) {
        formatAppLog("error", "at utils/csvUtils.js:320", "处理CSV内容失败:", error);
        return content;
      }
    }
  };
  const _imports_0 = "/static/image/edit.png";
  const _imports_1 = "/static/image/config.png";
  const _sfc_main$8 = {
    data() {
      return {
        fullAddress: "",
        currentIndex: 0,
        id: 0,
        project: {},
        showNameInput: false,
        newWallName: "",
        sections: [],
        sectionData: {},
        autoSaveTimer: null,
        pendingSave: false,
        showSettings: false,
        warningSettings: {
          slopeWarning: "",
          flatnessWarning: ""
        },
        projectType: "",
        showSectionInput: false,
        newSectionName: "",
        isEditingSection: false,
        editingSectionOldName: "",
        measureTimeout: null,
        currentMeasureWall: null,
        tempMeasurement: null,
        isMeasuring: false,
        showSlope: true,
        showFlatness: true,
        selectedWall: null,
        showWallNameInput: false,
        editingWallName: "",
        editingWall: null,
        showAngle: false,
        tempMeasureGroup: null,
        formatTime(timestamp) {
          if (!timestamp)
            return "";
          const date = new Date(timestamp);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
        }
      };
    },
    computed: {
      // 判断是否显示坡度输入框
      showSlope() {
        return this.projectType === "坡度" || this.projectType === "坡度加平整度";
      },
      // 判断是否显示平整度输入框
      showFlatness() {
        return this.projectType === "平整度" || this.projectType === "坡度加平整度";
      },
      // 获取坡度类型显示文本
      getSlopeTypeText() {
        return (type) => {
          switch (type) {
            case 1:
              return "垂直度";
            case 3:
              return "水平度";
            default:
              return "坡度";
          }
        };
      }
    },
    methods: {
      // 初始化数据表
      async initWallTable() {
        try {
          await sqliteUtil.createTable("wall_data", `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "project_id" INTEGER NOT NULL,
          "section" TEXT NOT NULL,
          "wall_name" TEXT NOT NULL,
          "slope_value" TEXT,
          "slope_angle" TEXT,
          "slope_type" INTEGER,
          "flatness" TEXT,
          "image" TEXT,
          "measurements" TEXT DEFAULT '[]',
          FOREIGN KEY(project_id) REFERENCES project(id)
        `);
          formatAppLog("log", "at pages/inProject/inProject.vue:281", "墙体数据表创建成功");
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:283", "创建墙体数据表失败:", error);
        }
      },
      // 添加删除单个测量数据的方法
      async deleteMeasurement(wall, index) {
        uni.showModal({
          title: "确认删除",
          content: "是否删除这组测量数据？",
          success: async (res) => {
            if (res.confirm) {
              try {
                wall.measurements.splice(index, 1);
                const measurements = JSON.stringify(wall.measurements || []);
                await sqliteUtil.updateTableData(
                  "wall_data",
                  `measurements='${measurements}'`,
                  "id",
                  wall.id
                );
                uni.showToast({
                  title: "删除成功",
                  icon: "success"
                });
              } catch (error) {
                formatAppLog("error", "at pages/inProject/inProject.vue:313", "删除测量数据失败:", error);
                uni.showToast({
                  title: "删除失败",
                  icon: "none"
                });
              }
            }
          }
        });
      },
      // 加载墙体数据
      async loadWallData() {
        try {
          const res = await sqliteUtil.selectTableData("wall_data", { project_id: this.id });
          this.sections.forEach((section) => {
            this.sectionData[section] = [];
          });
          res.forEach((item) => {
            const section = item.section;
            if (section && this.sectionData[section]) {
              let measurements = [];
              try {
                measurements = JSON.parse(item.measurements || "[]");
              } catch (e) {
                formatAppLog("error", "at pages/inProject/inProject.vue:341", "解析测量数据失败:", e);
                measurements = [];
              }
              const wallData = {
                name: item.wall_name,
                slope_value: item.slope_value || "",
                slope_angle: item.slope_angle || "",
                slope_type: item.slope_type || "",
                flatness: item.flatness || "",
                image: item.image || "",
                id: item.id,
                measurements
              };
              this.sectionData[section].push(wallData);
            }
          });
          this.$forceUpdate();
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:365", "加载墙体数据失败:", error);
          uni.showToast({
            title: "加载数据失败",
            icon: "none"
          });
        }
      },
      // 添加自动保存方法
      async autoSave() {
        if (!this.pendingSave)
          return;
        try {
          for (const section in this.sectionData) {
            const walls = this.sectionData[section];
            for (const wall of walls) {
              const measurements = JSON.stringify(wall.measurements || []);
              if (wall.id) {
                await sqliteUtil.updateTableData(
                  "wall_data",
                  `measurements='${measurements}'`,
                  "id",
                  wall.id
                );
              } else {
                await sqliteUtil.insertTableData(
                  "wall_data",
                  `null,${this.id},'${section}','${wall.name}','${wall.slope_value || ""}','${wall.slope_angle || ""}','${wall.slope_type || ""}','${wall.flatness || ""}','${wall.image || ""}','${measurements}'`,
                  "id,project_id,section,wall_name,slope_value,slope_angle,slope_type,flatness,image,measurements"
                );
              }
            }
          }
          this.pendingSave = false;
          formatAppLog("log", "at pages/inProject/inProject.vue:403", "自动保存成功");
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:405", "自动保存失败:", error);
          uni.showToast({
            title: "保存失败",
            icon: "none"
          });
        }
      },
      // 修改数据变化的相关方法
      handleDataChange() {
        this.pendingSave = true;
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(() => {
          this.autoSave();
        }, 2e3);
      },
      // 修改输入框的v-model绑定，添加@input事件
      handleInput(wall, field, value, measurementIndex = -1) {
        if (measurementIndex === -1) {
          wall[field] = value;
        } else if (wall.measurements[measurementIndex]) {
          wall.measurements[measurementIndex][field] = value;
        }
        this.handleDataChange();
      },
      // 修改保存图片的辅助方法
      async saveImageToLocal(tempFilePath) {
        try {
          const platform = uni.getSystemInfoSync().platform;
          formatAppLog("log", "at pages/inProject/inProject.vue:443", "当前平台:", platform);
          formatAppLog("log", "at pages/inProject/inProject.vue:444", "临时文件路径:", tempFilePath);
          if (platform === "android" || platform === "ios") {
            return new Promise((resolve, reject) => {
              const timestamp = (/* @__PURE__ */ new Date()).getTime();
              const random = Math.floor(Math.random() * 1e3);
              const ext = tempFilePath.substring(tempFilePath.lastIndexOf("."));
              const fileName = `${timestamp}_${random}${ext}`;
              const targetPath = `_doc/images/${fileName}`;
              formatAppLog("log", "at pages/inProject/inProject.vue:457", "目标保存路径:", targetPath);
              plus.io.resolveLocalFileSystemURL("_doc/", (rootEntry) => {
                rootEntry.getDirectory("images", { create: true }, (dirEntry) => {
                  plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
                    entry.copyTo(dirEntry, fileName, () => {
                      formatAppLog("log", "at pages/inProject/inProject.vue:465", "文件保存成功:", targetPath);
                      resolve(targetPath);
                    }, (e) => {
                      formatAppLog("error", "at pages/inProject/inProject.vue:468", "复制文件失败:", e);
                      reject(e);
                    });
                  }, (e) => {
                    formatAppLog("error", "at pages/inProject/inProject.vue:472", "解析源文件失败:", e);
                    reject(e);
                  });
                }, (e) => {
                  formatAppLog("error", "at pages/inProject/inProject.vue:476", "创建目录失败:", e);
                  reject(e);
                });
              }, (e) => {
                formatAppLog("error", "at pages/inProject/inProject.vue:480", "获取根目录失败:", e);
                reject(e);
              });
            });
          } else {
            const res = await uni.saveFile({
              tempFilePath
            });
            formatAppLog("log", "at pages/inProject/inProject.vue:489", "H5环境保存文件结果:", res);
            return res.savedFilePath;
          }
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:493", "保存图片时发生错误:", error);
          throw error;
        }
      },
      // 修改chooseImage方法
      async chooseImage(wall) {
        try {
          if (uni.getSystemInfoSync().platform === "android" || uni.getSystemInfoSync().platform === "ios") {
            await new Promise((resolve, reject) => {
              plus.io.resolveLocalFileSystemURL("_doc/", (entry) => {
                entry.getDirectory("images", { create: true }, () => {
                  resolve();
                }, (err) => reject(err));
              }, (err) => reject(err));
            }).catch((err) => {
              formatAppLog("error", "at pages/inProject/inProject.vue:510", "创建目录失败:", err);
              throw err;
            });
          }
          const res = await new Promise((resolve, reject) => {
            uni.chooseImage({
              count: 1,
              success: resolve,
              fail: reject
            });
          });
          const tempFilePath = res.tempFilePaths[0];
          formatAppLog("log", "at pages/inProject/inProject.vue:524", "选择的临时文件路径:", tempFilePath);
          try {
            const savedFilePath = await this.saveImageToLocal(tempFilePath);
            formatAppLog("log", "at pages/inProject/inProject.vue:529", "保存后的文件路径:", savedFilePath);
            if (wall.id) {
              await sqliteUtil.updateTableData(
                "wall_data",
                `image='${savedFilePath}'`,
                "id",
                wall.id
              );
            } else {
              const section = this.sections[this.currentIndex];
              await sqliteUtil.insertTableData(
                "wall_data",
                `null,${this.id},'${section}','${wall.name}','${wall.slope_value || ""}','${wall.slope_angle || ""}','${wall.slope_type || ""}','${wall.flatness || ""}','${savedFilePath}'`,
                "id,project_id,section,wall_name,slope_value,slope_angle,slope_type,flatness,image"
              );
              const result = await new Promise((resolve, reject) => {
                plus.sqlite.selectSql({
                  name: sqliteUtil.dbName,
                  sql: "SELECT last_insert_rowid() as id",
                  success: (data) => resolve(data),
                  fail: (e) => reject(e)
                });
              });
              wall.id = result[0].id;
            }
            await this.reloadCurrentSectionData();
            uni.showToast({
              title: "图片保存成功",
              icon: "success"
            });
          } catch (error) {
            formatAppLog("error", "at pages/inProject/inProject.vue:568", "保存图片失败:", error);
            uni.showToast({
              title: "保存图片失败",
              icon: "none"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:575", "选择图片失败:", error);
          if (error.errMsg !== "chooseImage:fail cancel") {
            uni.showToast({
              title: "选择图片失败",
              icon: "none"
            });
          }
        }
      },
      // 新增：重新加载当前房间的墙体数据
      async reloadCurrentSectionData() {
        try {
          const currentSection = this.sections[this.currentIndex];
          formatAppLog("log", "at pages/inProject/inProject.vue:589", "重新加载房间数据:", currentSection);
          const res = await sqliteUtil.selectTableData("wall_data", {
            project_id: this.id,
            section: currentSection
          });
          formatAppLog("log", "at pages/inProject/inProject.vue:596", "重新加载的墙体数据:", res);
          this.sectionData[currentSection] = res.map((item) => {
            let measurements = [];
            try {
              measurements = JSON.parse(item.measurements || "[]");
            } catch (e) {
              formatAppLog("error", "at pages/inProject/inProject.vue:604", "解析测量数据失败:", e);
              measurements = [];
            }
            return {
              name: item.wall_name,
              slope_value: item.slope_value || "",
              slope_angle: item.slope_angle || "",
              slope_type: item.slope_type || "",
              flatness: item.flatness || "",
              image: item.image || "",
              id: item.id,
              measurements
            };
          });
          this.$forceUpdate();
          formatAppLog("log", "at pages/inProject/inProject.vue:622", "数据重新加载完成");
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:625", "重新加载数据失败:", error);
          uni.showToast({
            title: "刷新数据失败",
            icon: "none"
          });
        }
      },
      // 删除墙体数据
      async deleteWall(index) {
        const key = this.sections[this.currentIndex];
        const wall = this.sectionData[key][index];
        uni.showModal({
          title: "确认删除",
          content: `是否确认删除${key}墙体${wall.name}？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                if (wall.id) {
                  await sqliteUtil.deleteTableData("wall_data", { id: wall.id });
                }
                this.sectionData[key].splice(index, 1);
                this.sectionData = { ...this.sectionData };
                uni.showToast({
                  title: "删除成功",
                  icon: "success"
                });
              } catch (error) {
                formatAppLog("error", "at pages/inProject/inProject.vue:659", "删除数据失败:", error);
                uni.showToast({
                  title: "删除失败",
                  icon: "none"
                });
              }
            }
          }
        });
      },
      // 修改原有的onLoad方法
      async initPageData(options = {}) {
        try {
          this.id = options.id || this.id;
          await this.getProject();
          this.fullAddress = this.formatProjectTitle(this.project);
          await this.loadSections();
          await this.loadWallData();
          await this.loadSettings();
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:680", "页面加载失败:", error);
          uni.showToast({
            title: "加载失败",
            icon: "none"
          });
        }
      },
      // 修改原有的onShow方法
      async refreshPageData() {
        try {
          await this.getProject();
          this.fullAddress = this.formatProjectTitle(this.project);
          await this.loadWallData();
          await this.loadSettings();
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:696", "页面刷新失败:", error);
          uni.showToast({
            title: "刷新失败",
            icon: "none"
          });
        }
      },
      goToProjectEdit(id) {
        formatAppLog("log", "at pages/inProject/inProject.vue:705", "跳转编辑页面，项目ID:", id);
        uni.navigateTo({
          url: `/pages/inProject/edit/edit?id=${this.id}`,
          fail: (err) => {
            formatAppLog("error", "at pages/inProject/inProject.vue:709", "跳转失败:", err);
            uni.showToast({
              title: "跳转失败",
              icon: "none"
            });
          }
        });
      },
      getWalls() {
        const key = this.sections[this.currentIndex];
        return this.sectionData[key] || [];
      },
      addNewWall() {
        this.newWallName = "";
        this.showNameInput = true;
      },
      async confirmAddWall() {
        const key = this.sections[this.currentIndex];
        let existingWalls = this.sectionData[key];
        let wallName = this.newWallName.trim();
        if (!wallName) {
          wallName = this.getNextName(existingWalls);
        } else {
          const nameExists = existingWalls.some((wall) => wall.name === wallName);
          if (nameExists) {
            uni.showToast({
              title: "墙体名称已存在",
              icon: "none"
            });
            return;
          }
        }
        try {
          const insertFields = ["id", "project_id", "section", "wall_name", "slope_value", "slope_angle", "slope_type", "flatness", "image"];
          const insertValues = [`null`, `'${this.id}'`, `'${key}'`, `'${wallName}'`, `''`, `''`, `''`, `''`, `''`];
          await sqliteUtil.insertTableData(
            "wall_data",
            insertValues.join(","),
            insertFields.join(",")
          );
          const newWallResult = await new Promise((resolve, reject) => {
            plus.sqlite.selectSql({
              name: sqliteUtil.dbName,
              sql: "SELECT last_insert_rowid() as id",
              success: (result) => {
                resolve(result);
              },
              fail: (e) => {
                reject(e);
              }
            });
          });
          existingWalls.push({
            name: wallName,
            slope_value: "",
            slope_angle: "",
            slope_type: "",
            flatness: "",
            image: "",
            id: newWallResult[0].id
          });
          this.sectionData = { ...this.sectionData };
          this.showNameInput = false;
          uni.showToast({
            title: "添加墙体成功",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:790", "添加墙体失败:", error);
          uni.showToast({
            title: "添加墙体失败",
            icon: "none"
          });
        }
      },
      getNextName(walls) {
        if (!walls || walls.length === 0)
          return "A";
        const names = walls.map((w) => w.name);
        const nameToNumber = (str) => {
          let num = 0;
          for (let i = 0; i < str.length; i++) {
            num *= 26;
            num += str.charCodeAt(i) - 64;
          }
          return num;
        };
        const numberToName = (num) => {
          let name = "";
          while (num > 0) {
            let rem = (num - 1) % 26;
            name = String.fromCharCode(65 + rem) + name;
            num = Math.floor((num - 1) / 26);
          }
          return name;
        };
        let maxNum = 0;
        names.forEach((n) => {
          const val = nameToNumber(n);
          if (val > maxNum)
            maxNum = val;
        });
        return numberToName(maxNum + 1);
      },
      previewImage(imageUrl) {
        if (!imageUrl)
          return;
        formatAppLog("log", "at pages/inProject/inProject.vue:828", "预览图片路径:", imageUrl);
        const fullPath = imageUrl.startsWith("_doc/") ? imageUrl : `_doc/${imageUrl}`;
        formatAppLog("log", "at pages/inProject/inProject.vue:832", "完整预览路径:", fullPath);
        uni.previewImage({
          urls: [fullPath],
          current: fullPath,
          fail: (err) => {
            formatAppLog("error", "at pages/inProject/inProject.vue:838", "预览图片失败:", err);
            uni.showToast({
              title: "预览失败",
              icon: "none"
            });
          }
        });
      },
      async removeImage(wall) {
        try {
          const oldImagePath = wall.image;
          if (oldImagePath) {
            try {
              const platform = uni.getSystemInfoSync().platform;
              if (platform === "android" || platform === "ios") {
                await new Promise((resolve, reject) => {
                  plus.io.resolveLocalFileSystemURL(oldImagePath, (entry) => {
                    entry.remove(() => {
                      formatAppLog("log", "at pages/inProject/inProject.vue:858", "文件删除成功");
                      resolve();
                    }, (e) => {
                      formatAppLog("warn", "at pages/inProject/inProject.vue:861", "文件删除失败:", e);
                      reject(e);
                    });
                  }, (e) => {
                    formatAppLog("warn", "at pages/inProject/inProject.vue:865", "解析文件路径失败:", e);
                    reject(e);
                  });
                });
              } else {
                await uni.removeSavedFile({
                  filePath: oldImagePath
                });
              }
            } catch (e) {
              formatAppLog("warn", "at pages/inProject/inProject.vue:876", "删除旧图片文件失败:", e);
            }
          }
          if (wall.id) {
            await sqliteUtil.updateTableData(
              "wall_data",
              "image=''",
              "id",
              wall.id
            );
            await this.reloadCurrentSectionData();
            uni.showToast({
              title: "删除成功",
              icon: "success"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:898", "删除图片失败:", error);
          uni.showToast({
            title: "删除失败",
            icon: "none"
          });
        }
      },
      exportTable() {
        try {
          const exportData = {
            projectInfo: this.project,
            warningSettings: {
              slopeWarning: this.showSlope ? this.warningSettings.slopeWarning : "",
              flatnessWarning: this.showFlatness ? this.warningSettings.flatnessWarning : ""
            },
            showSlope: this.showSlope,
            showFlatness: this.showFlatness,
            isOverWarning: this.isOverWarning,
            sections: this.sections,
            sectionData: {}
          };
          for (const section in this.sectionData) {
            exportData.sectionData[section] = this.sectionData[section].map((wall) => {
              const filteredWall = {
                name: wall.name
              };
              if (this.showSlope) {
                filteredWall.slope_value = wall.slope_value;
                filteredWall.slope_angle = wall.slope_angle;
                filteredWall.slope_type = wall.slope_type;
              }
              if (this.showFlatness) {
                filteredWall.flatness = wall.flatness;
              }
              return filteredWall;
            }).filter((wall) => {
              const projectType = this.project.project_status;
              if (projectType === "坡度") {
                return wall.slope_value;
              } else if (projectType === "平整度") {
                return wall.flatness;
              } else if (projectType === "坡度加平整度") {
                return this.showSlope && wall.slope_value || this.showFlatness && wall.flatness;
              }
              return false;
            });
          }
          const csvContent = csvUtils.generateCSVContent(exportData);
          const fileName = `${this.fullAddress}-墙体数据.csv`;
          const previewData = {
            content: csvContent,
            fileName,
            projectInfo: {
              title: this.project.title || "",
              address: this.project.address || "",
              date: this.project.date || "",
              building: this.project.building || "",
              unit: this.project.unit || "",
              floor: this.project.floor || "",
              roomNumber: this.project.room_number || "",
              typeTag: this.project.type_tag || "",
              projectStatus: this.project.project_status || "",
              inspectionStatus: this.project.inspection_status || "",
              inspector: this.project.inspector || ""
            },
            warningSettings: exportData.warningSettings,
            createTime: (/* @__PURE__ */ new Date()).toLocaleString()
          };
          const encodedData = encodeURIComponent(JSON.stringify(previewData));
          uni.navigateTo({
            url: `/pages/newProject/csv/preview/preview?data=${encodedData}`,
            fail: (err) => {
              formatAppLog("error", "at pages/inProject/inProject.vue:980", "跳转预览页面失败:", err);
              uni.showToast({
                title: "跳转失败",
                icon: "none"
              });
            }
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:988", "导出失败:", error);
          uni.showToast({
            title: "导出失败",
            icon: "none"
          });
        }
      },
      async getProject() {
        try {
          const res = await sqliteUtil.selectTableData("project", { id: this.id });
          if (res && res.length > 0) {
            this.project = res[0];
            this.projectType = res[0].project_status;
            this.$nextTick(() => {
              this.fullAddress = this.formatProjectTitle(this.project);
            });
          } else {
            uni.showToast({ title: "未找到该项目", icon: "none" });
          }
        } catch (e) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1009", "查询失败", e);
          uni.showToast({ title: "查询出错", icon: "none" });
        }
      },
      formatProjectTitle(item) {
        if (!item)
          return "";
        let result = item.title || "";
        if (item.building)
          result += "-" + item.building;
        if (item.unit)
          result += "-" + item.unit + "栋";
        if (item.floor)
          result += "-" + item.floor;
        if (item.room_number)
          result += "-" + item.room_number;
        return result;
      },
      /**
       * 生成CSV内容的通用函数
       * @param {Object} options - 配置选项
       * @param {Object} options.projectInfo - 项目信息对象
       * @param {Object} options.warningSettings - 预警设置对象
       * @param {Boolean} options.showSlope - 是否显示坡度数据
       * @param {Boolean} options.showFlatness - 是否显示平整度数据
       * @param {Function} options.isOverWarning - 判断是否超过预警值的函数
       * @param {Array} options.sections - 房间列表
       * @param {Object} options.sectionData - 房间数据对象
       * @returns {String} 生成的CSV内容
       */
      convertToCSV() {
        return csvUtils.generateCSVContent({
          projectInfo: this.project,
          warningSettings: this.warningSettings,
          showSlope: this.showSlope,
          showFlatness: this.showFlatness,
          isOverWarning: this.isOverWarning,
          sections: this.sections,
          sectionData: this.sectionData
        });
      },
      /**
       * 生成当前项目的CSV内容
       * @returns {String} 生成的CSV内容
       */
      generateCurrentCSVContent() {
        return csvUtils.generateCSVContent({
          projectInfo: this.project,
          warningSettings: this.warningSettings,
          showSlope: this.showSlope,
          showFlatness: this.showFlatness,
          isOverWarning: this.isOverWarning,
          sections: this.sections,
          sectionData: this.sectionData
        });
      },
      async beforeDestroy() {
        if (this.pendingSave) {
          await this.autoSave();
        }
      },
      async initSettingsTable() {
        try {
          await sqliteUtil.createTable("warning_settings", `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "project_id" INTEGER NOT NULL,
          "slope_warning" REAL,
          "flatness_warning" REAL,
          FOREIGN KEY(project_id) REFERENCES project(id)
        `);
          formatAppLog("log", "at pages/inProject/inProject.vue:1077", "预警设置表创建成功");
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1079", "创建预警设置表失败:", error);
        }
      },
      async loadSettings() {
        var _a, _b;
        try {
          const res = await sqliteUtil.selectTableData("warning_settings", { project_id: this.id });
          this.warningSettings = {
            slopeWarning: "",
            flatnessWarning: ""
          };
          if (res && res.length > 0) {
            if (this.projectType === "坡度" || this.projectType === "坡度加平整度") {
              this.warningSettings.slopeWarning = ((_a = res[0].slope_warning) == null ? void 0 : _a.toString()) || "";
            }
            if (this.projectType === "平整度" || this.projectType === "坡度加平整度") {
              this.warningSettings.flatnessWarning = ((_b = res[0].flatness_warning) == null ? void 0 : _b.toString()) || "";
            }
          }
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1101", "加载预警设置失败:", error);
          this.warningSettings = {
            slopeWarning: "",
            flatnessWarning: ""
          };
        }
      },
      async saveSettings() {
        try {
          const data = {
            slope_warning: null,
            flatness_warning: null
          };
          if (this.projectType === "坡度" || this.projectType === "坡度加平整度") {
            data.slope_warning = parseFloat(this.warningSettings.slopeWarning);
            data.slope_warning = isNaN(data.slope_warning) ? null : data.slope_warning;
          }
          if (this.projectType === "平整度" || this.projectType === "坡度加平整度") {
            data.flatness_warning = parseFloat(this.warningSettings.flatnessWarning);
            data.flatness_warning = isNaN(data.flatness_warning) ? null : data.flatness_warning;
          }
          const res = await sqliteUtil.selectTableData("warning_settings", { project_id: this.id });
          if (res && res.length > 0) {
            await sqliteUtil.updateTableData(
              "warning_settings",
              `slope_warning=${data.slope_warning},flatness_warning=${data.flatness_warning}`,
              "project_id",
              this.id
            );
          } else {
            await sqliteUtil.insertTableData(
              "warning_settings",
              `null,${this.id},${data.slope_warning},${data.flatness_warning}`,
              "id,project_id,slope_warning,flatness_warning"
            );
          }
          this.showSettings = false;
          uni.showToast({
            title: "设置已保存",
            icon: "success"
          });
          await this.loadSettings();
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1155", "保存设置失败:", error);
          uni.showToast({
            title: "保存失败",
            icon: "none"
          });
        }
      },
      handleSettingInput(field, value) {
        this.warningSettings[field] = value;
      },
      // 跳转到预设管理页面
      goToPresets() {
        uni.navigateTo({
          url: "/pages/warning-presets/warning-presets",
          fail: (err) => {
            formatAppLog("error", "at pages/inProject/inProject.vue:1172", "跳转失败:", err);
            uni.showToast({
              title: "跳转失败",
              icon: "none"
            });
          }
        });
      },
      isOverWarning(value, type) {
        if (!value || !this.warningSettings[type + "Warning"])
          return false;
        const numValue = parseFloat(value);
        const warningValue = parseFloat(this.warningSettings[type + "Warning"]);
        return Math.abs(numValue) > warningValue;
      },
      // 初始化房间表
      async initSectionTable() {
        try {
          await sqliteUtil.createTable("sections", `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "project_id" INTEGER NOT NULL,
          "name" TEXT NOT NULL,
          "sort_order" INTEGER,
          FOREIGN KEY(project_id) REFERENCES project(id)
        `);
          formatAppLog("log", "at pages/inProject/inProject.vue:1198", "房间表创建成功");
          await this.loadSections();
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1201", "创建房间表失败:", error);
        }
      },
      // 加载房间数据
      async loadSections() {
        try {
          const res = await sqliteUtil.selectTableData("sections", { project_id: this.id });
          if (res && res.length > 0) {
            this.sections = res.sort((a, b) => a.sort_order - b.sort_order).map((item) => item.name);
          } else {
            this.sections = [];
          }
          this.sections.forEach((section) => {
            if (!this.sectionData[section]) {
              this.sectionData[section] = [];
            }
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1223", "加载房间数据失败:", error);
        }
      },
      // 添加新房间
      addNewSection() {
        this.isEditingSection = false;
        this.newSectionName = "";
        this.showSectionInput = true;
      },
      // 编辑房间
      editSection(sectionName) {
        this.isEditingSection = true;
        this.editingSectionOldName = sectionName;
        this.newSectionName = sectionName;
        this.showSectionInput = true;
      },
      // 确认添加或编辑房间
      async confirmSection() {
        try {
          const sectionName = this.newSectionName.trim();
          if (!sectionName) {
            uni.showToast({
              title: "房间名称不能为空",
              icon: "none"
            });
            return;
          }
          if (this.isEditingSection) {
            const oldData = this.sectionData[this.editingSectionOldName];
            delete this.sectionData[this.editingSectionOldName];
            this.sectionData[sectionName] = oldData || [];
            await sqliteUtil.updateTableData(
              "sections",
              `name='${sectionName}'`,
              "name",
              this.editingSectionOldName
            );
            await sqliteUtil.updateTableData(
              "wall_data",
              `section='${sectionName}'`,
              "section",
              this.editingSectionOldName
            );
            const index = this.sections.indexOf(this.editingSectionOldName);
            if (index !== -1) {
              this.sections[index] = sectionName;
            }
          } else {
            const sortOrder = this.sections.length;
            await sqliteUtil.insertTableData(
              "sections",
              `null,${this.id},'${sectionName}',${sortOrder}`,
              "id,project_id,name,sort_order"
            );
            this.sections.push(sectionName);
            this.sectionData[sectionName] = [];
          }
          this.showSectionInput = false;
          uni.showToast({
            title: this.isEditingSection ? "修改成功" : "添加成功",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1299", "操作房间失败:", error);
          uni.showToast({
            title: "操作失败",
            icon: "none"
          });
        }
      },
      // 删除房间
      async deleteSection(sectionName) {
        uni.showModal({
          title: "确认删除",
          content: `是否确认删除房间"${sectionName}"？删除后该房间的所有墙体数据都将被删除！`,
          success: async (res) => {
            if (res.confirm) {
              try {
                await sqliteUtil.deleteTableData("wall_data", { section: sectionName });
                await sqliteUtil.deleteTableData("sections", { name: sectionName });
                const index = this.sections.indexOf(sectionName);
                if (index !== -1) {
                  this.sections.splice(index, 1);
                  delete this.sectionData[sectionName];
                  if (this.currentIndex === index) {
                    this.currentIndex = 0;
                  } else if (this.currentIndex > index) {
                    this.currentIndex--;
                  }
                }
                uni.showToast({
                  title: "删除成功",
                  icon: "success"
                });
              } catch (error) {
                formatAppLog("error", "at pages/inProject/inProject.vue:1340", "删除房间失败:", error);
                uni.showToast({
                  title: "删除失败",
                  icon: "none"
                });
              }
            }
          }
        });
      },
      // 修改开始测量方法
      async startMeasure(wall) {
        if (this.isMeasuring && this.currentMeasureWall === wall) {
          this.stopMeasure();
          return;
        }
        const bleState = bleManager.getState();
        await this.checkBleConnection();
        if (!bleState.connected || !bleState.deviceId) {
          uni.showModal({
            title: "未连接设备",
            content: "是否前往连接蓝牙设备？",
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({
                  url: "/pages/device/device"
                });
              }
            }
          });
          return;
        }
        try {
          if (this.isMeasuring && this.currentMeasureWall !== wall) {
            await this.stopMeasure();
          }
          this.isMeasuring = true;
          this.currentMeasureWall = wall;
          this.selectedWall = wall;
          await this.initBluetooth();
          this.tempMeasurement = null;
          await this.startListenBLEData();
          uni.showToast({
            title: "开始测量",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1404", "开始测量失败:", error);
          this.stopMeasure();
          uni.showToast({
            title: "测量初始化失败",
            icon: "none"
          });
        }
      },
      // 初始化蓝牙
      async initBluetooth() {
        return new Promise((resolve, reject) => {
          uni.openBluetoothAdapter({
            success: () => {
              resolve();
            },
            fail: (error) => {
              formatAppLog("error", "at pages/inProject/inProject.vue:1421", "蓝牙初始化失败:", error);
              reject(new Error("蓝牙初始化失败"));
            }
          });
        });
      },
      // 监听蓝牙数据
      async startListenBLEData() {
        const bleState = bleManager.getState();
        try {
          if (!bleState.connected) {
            await new Promise((resolve, reject) => {
              uni.createBLEConnection({
                deviceId: bleState.deviceId,
                success: resolve,
                fail: reject
              });
            });
            await new Promise((resolve) => setTimeout(resolve, 1e3));
          }
          await new Promise((resolve, reject) => {
            uni.onBLECharacteristicValueChange((result) => {
              const parsedData = this.parseBluetoothData(new Uint8Array(result.value));
              if (parsedData && this.currentMeasureWall && this.isMeasuring) {
                if (!this.currentMeasureWall.measurements) {
                  this.currentMeasureWall.measurements = [];
                }
                if (!this.tempMeasureGroup) {
                  this.tempMeasureGroup = {
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    values: [],
                    flatness: null
                  };
                }
                if (parsedData.type === "slope") {
                  const existingIndex = this.tempMeasureGroup.values.findIndex((v) => v.type === parsedData.data.type);
                  if (existingIndex >= 0) {
                    this.tempMeasureGroup.values[existingIndex] = {
                      ...parsedData.data,
                      showAngle: false
                    };
                  } else {
                    this.tempMeasureGroup.values.push({
                      ...parsedData.data,
                      showAngle: false
                    });
                  }
                  uni.showToast({
                    title: `已接收${parsedData.data.type === 1 ? "垂直度" : "水平度"}`,
                    icon: "none",
                    duration: 1e3
                  });
                } else if (parsedData.type === "flatness") {
                  this.tempMeasureGroup.flatness = parsedData.data;
                  uni.showToast({
                    title: "已接收平整度",
                    icon: "none",
                    duration: 1e3
                  });
                }
                const shouldSave = this.checkShouldSaveGroup();
                if (shouldSave) {
                  this.currentMeasureWall.measurements.push({ ...this.tempMeasureGroup });
                  this.handleDataChange();
                  this.tempMeasureGroup = null;
                  uni.showToast({
                    title: "测量完成",
                    icon: "success",
                    duration: 1500
                  });
                }
              }
            });
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1520", "启动蓝牙监听失败:", error);
          throw error;
        }
      },
      // 解析蓝牙数据
      parseBluetoothData(value) {
        try {
          let result = "";
          for (let i = 0; i < value.length; i++) {
            result += String.fromCharCode(value[i]);
          }
          formatAppLog("log", "at pages/inProject/inProject.vue:1532", "收到的原始字符串:", result);
          const parts = result.split(",").map((part) => part.trim());
          const type = parseInt(parts[0]);
          if (isNaN(type))
            return null;
          switch (type) {
            case 1:
            case 3:
              if (parts.length >= 4) {
                const deviation = parseFloat(parts[1]);
                const angle = parseFloat(parts[3]);
                if (!isNaN(deviation) && !isNaN(angle)) {
                  return {
                    type: "slope",
                    data: {
                      type,
                      value: deviation.toFixed(2),
                      angle: angle.toFixed(2)
                    }
                  };
                }
              }
              break;
            case 5:
              if (parts.length >= 2) {
                const flatness = parseFloat(parts[1]);
                if (!isNaN(flatness)) {
                  return {
                    type: "flatness",
                    data: flatness.toFixed(2)
                  };
                }
              }
              break;
          }
          return null;
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1572", "解析数据失败:", error);
          return null;
        }
      },
      // 停止测量
      async stopMeasure() {
        this.isMeasuring = false;
        this.tempMeasurement = null;
        const bleState = bleManager.getState();
        if (bleState.deviceId && bleState.connected)
          ;
        uni.offBLECharacteristicValueChange();
        this.currentMeasureWall = null;
        uni.showToast({
          title: "停止测量",
          icon: "success"
        });
      },
      // 在组件卸载时清理
      onUnload() {
        this.stopMeasure();
      },
      // 添加检查蓝牙连接状态的方法
      async checkBleConnection() {
        const bleState = bleManager.getState();
        if (bleState.deviceId && bleState.connected) {
          try {
            await new Promise((resolve, reject) => {
              uni.getBluetoothDevices({
                success: (res) => {
                  const device = res.devices.find((d) => d.deviceId === bleState.deviceId);
                  if (!device) {
                    reject(new Error("设备未找到"));
                  } else {
                    resolve();
                  }
                },
                fail: reject
              });
            });
          } catch (error) {
            formatAppLog("error", "at pages/inProject/inProject.vue:1629", "蓝牙连接状态验证失败:", error);
            bleManager.clear();
          }
        }
      },
      // 新增：选中墙体方法
      selectWall(wall) {
        this.selectedWall = wall;
      },
      // 编辑墙体名称
      editWallName(wall) {
        this.editingWall = wall;
        this.editingWallName = wall.name;
        this.showWallNameInput = true;
      },
      // 确认修改墙体名称
      async confirmEditWallName() {
        if (!this.editingWallName.trim()) {
          uni.showToast({
            title: "名称不能为空",
            icon: "none"
          });
          return;
        }
        const currentSection = this.sections[this.currentIndex];
        const existingWalls = this.sectionData[currentSection];
        const isDuplicate = existingWalls.some(
          (wall) => wall !== this.editingWall && wall.name === this.editingWallName.trim()
        );
        if (isDuplicate) {
          uni.showToast({
            title: "墙体名称已存在",
            icon: "none"
          });
          return;
        }
        try {
          await sqliteUtil.updateTableData(
            "wall_data",
            `wall_name='${this.editingWallName.trim()}'`,
            "id",
            this.editingWall.id
          );
          this.editingWall.name = this.editingWallName.trim();
          this.showWallNameInput = false;
          this.editingWall = null;
          this.editingWallName = "";
          uni.showToast({
            title: "修改成功",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/inProject/inProject.vue:1695", "修改墙体名称失败:", error);
          uni.showToast({
            title: "修改失败",
            icon: "none"
          });
        }
      },
      // 处理坡度输入
      handleSlopeInput(wall, item, value, measurementIndex, valueIndex) {
        if (item.showAngle) {
          wall.measurements[measurementIndex].values[valueIndex].angle = value;
        } else {
          wall.measurements[measurementIndex].values[valueIndex].value = value;
        }
        this.handleDataChange();
      },
      // 添加检查是否应该保存测量组的方法
      checkShouldSaveGroup() {
        if (!this.tempMeasureGroup)
          return false;
        switch (this.projectType) {
          case "坡度":
            return this.tempMeasureGroup.values.length > 0;
          case "平整度":
            return this.tempMeasureGroup.flatness !== null;
          case "坡度加平整度":
            return this.tempMeasureGroup.values.length > 0 && this.tempMeasureGroup.flatness !== null;
          default:
            return false;
        }
      }
    },
    onLoad(options) {
      formatAppLog("log", "at pages/inProject/inProject.vue:1738", "onLoad options:", options);
      this.initPageData(options);
    },
    onShow() {
      formatAppLog("log", "at pages/inProject/inProject.vue:1742", "onShow with id:", this.id);
      if (this.id) {
        this.refreshPageData();
      }
      this.checkBleConnection();
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 固定顶部标题，支持点击跳转 "),
      vue.createElementVNode("view", {
        class: "room-header",
        onClick: _cache[0] || (_cache[0] = ($event) => $options.goToProjectEdit($data.id))
      }, [
        vue.createTextVNode(
          vue.toDisplayString($data.fullAddress) + " ",
          1
          /* TEXT */
        ),
        vue.createElementVNode("image", {
          src: _imports_0,
          class: "edit-icon",
          mode: "aspectFit"
        })
      ]),
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "left-panel"
      }, [
        vue.createElementVNode("view", {
          class: "add-section-btn",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.addNewSection && $options.addNewSection(...args))
        }, "+ 添加房间"),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.sections, (item, index) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                key: index,
                class: vue.normalizeClass(["menu-item", $data.currentIndex === index ? "active" : ""])
              },
              [
                vue.createElementVNode("view", {
                  class: "menu-item-content",
                  onClick: ($event) => $data.currentIndex = index
                }, vue.toDisplayString(item), 9, ["onClick"]),
                vue.createElementVNode("view", { class: "menu-item-actions" }, [
                  vue.createElementVNode("text", {
                    class: "action-btn edit",
                    onClick: vue.withModifiers(($event) => $options.editSection(item), ["stop"])
                  }, "✏️", 8, ["onClick"]),
                  vue.createElementVNode("text", {
                    class: "action-btn delete",
                    onClick: vue.withModifiers(($event) => $options.deleteSection(item), ["stop"])
                  }, "×", 8, ["onClick"])
                ])
              ],
              2
              /* CLASS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode("view", { class: "right-panel" }, [
        vue.createElementVNode("view", { class: "spacer" }),
        vue.createCommentVNode(" 为顶部 header 腾出空间 "),
        vue.createElementVNode("scroll-view", {
          "scroll-y": "",
          class: "content-scroll"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($options.getWalls(), (wall, i) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: vue.normalizeClass(["wall-card", { "selected-wall": wall === $data.selectedWall }]),
                key: i,
                onClick: ($event) => $options.selectWall(wall)
              }, [
                vue.createElementVNode("view", { class: "wall-header" }, [
                  vue.createElementVNode("view", { class: "wall-title-container" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "wall-title" },
                      "墙体 " + vue.toDisplayString(wall.name),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", {
                      class: "edit-wall-name",
                      onClick: vue.withModifiers(($event) => $options.editWallName(wall), ["stop"])
                    }, [
                      vue.createElementVNode("image", {
                        src: _imports_0,
                        class: "edit-icon",
                        mode: "aspectFit"
                      })
                    ], 8, ["onClick"])
                  ]),
                  vue.createElementVNode("view", { class: "wall-actions" }, [
                    vue.createElementVNode("button", {
                      class: "measure-btn",
                      onClick: vue.withModifiers(($event) => $options.startMeasure(wall), ["stop"])
                    }, vue.toDisplayString($data.isMeasuring && $data.currentMeasureWall === wall ? "停止测量" : "测量"), 9, ["onClick"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createCommentVNode(" 测量数据列表 "),
                  wall.measurements && wall.measurements.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "measurements-list"
                  }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(wall.measurements, (measurement, index) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          class: "measurement-item",
                          key: index
                        }, [
                          vue.createElementVNode("view", { class: "measurement-header" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "measurement-index" },
                              "第" + vue.toDisplayString(index + 1) + "组测量值",
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode("text", {
                              class: "delete-measurement",
                              onClick: ($event) => $options.deleteMeasurement(wall, index)
                            }, "×", 8, ["onClick"])
                          ]),
                          vue.createElementVNode("view", { class: "measurement-data" }, [
                            $options.showSlope && measurement.values && measurement.values.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                              key: 0,
                              class: "slope-values"
                            }, [
                              (vue.openBlock(true), vue.createElementBlock(
                                vue.Fragment,
                                null,
                                vue.renderList(measurement.values, (item, vIndex) => {
                                  return vue.openBlock(), vue.createElementBlock("view", {
                                    key: vIndex,
                                    class: "row"
                                  }, [
                                    vue.createElementVNode("view", { class: "label-container" }, [
                                      vue.createElementVNode(
                                        "text",
                                        { class: "label" },
                                        vue.toDisplayString($options.getSlopeTypeText(item.type)),
                                        1
                                        /* TEXT */
                                      ),
                                      vue.createElementVNode("text", {
                                        class: "toggle-unit",
                                        onClick: ($event) => item.showAngle = !item.showAngle
                                      }, "<->", 8, ["onClick"])
                                    ]),
                                    vue.createElementVNode("view", { class: "input-unit-wrapper" }, [
                                      vue.createElementVNode("input", {
                                        class: vue.normalizeClass(["input", $options.isOverWarning(item.showAngle ? item.angle : item.value, "slope") ? "warning" : ""]),
                                        value: item.showAngle ? item.angle : item.value,
                                        onInput: (e) => $options.handleSlopeInput(wall, item, e.detail.value, index, vIndex),
                                        disabled: ""
                                      }, null, 42, ["value", "onInput"]),
                                      vue.createElementVNode(
                                        "text",
                                        { class: "unit" },
                                        vue.toDisplayString(item.showAngle ? "°" : "mm/M"),
                                        1
                                        /* TEXT */
                                      )
                                    ])
                                  ]);
                                }),
                                128
                                /* KEYED_FRAGMENT */
                              ))
                            ])) : vue.createCommentVNode("v-if", true),
                            $options.showFlatness && measurement.flatness !== null ? (vue.openBlock(), vue.createElementBlock("view", {
                              key: 1,
                              class: "row"
                            }, [
                              vue.createElementVNode("view", { class: "label-container" }, [
                                vue.createElementVNode("text", { class: "label" }, "平整度")
                              ]),
                              vue.createElementVNode("view", { class: "input-unit-wrapper" }, [
                                vue.createElementVNode("input", {
                                  class: vue.normalizeClass(["input", $options.isOverWarning(measurement.flatness, "flatness") ? "warning" : ""]),
                                  value: measurement.flatness,
                                  onInput: (e) => $options.handleInput(wall, "flatness", e.detail.value, index),
                                  disabled: ""
                                }, null, 42, ["value", "onInput"]),
                                vue.createElementVNode("text", { class: "unit" }, "mm")
                              ])
                            ])) : vue.createCommentVNode("v-if", true)
                          ])
                        ]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])) : vue.createCommentVNode("v-if", true),
                  wall.image ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 1,
                    class: "row-image"
                  }, [
                    vue.createElementVNode("view", { class: "image-wrapper" }, [
                      vue.createElementVNode("image", {
                        class: "image",
                        mode: "aspectFill",
                        src: wall.image,
                        onClick: ($event) => $options.previewImage(wall.image)
                      }, null, 8, ["src", "onClick"]),
                      vue.createElementVNode("view", {
                        class: "delete-icon",
                        onClick: vue.withModifiers(($event) => $options.removeImage(wall), ["stop"])
                      }, "×", 8, ["onClick"])
                    ])
                  ])) : vue.createCommentVNode("v-if", true),
                  vue.createElementVNode("view", { class: "row actions" }, [
                    vue.createElementVNode("button", {
                      onClick: ($event) => $options.chooseImage(wall)
                    }, "添加照片", 8, ["onClick"]),
                    vue.createElementVNode("button", {
                      onClick: ($event) => $options.deleteWall(i)
                    }, "删除墙体", 8, ["onClick"])
                  ])
                ])
              ], 10, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          vue.createCommentVNode(" 新增墙体按钮，放在所有墙体列表后 "),
          vue.createElementVNode("view", {
            class: "add-wall-btn",
            onClick: _cache[2] || (_cache[2] = (...args) => $options.addNewWall && $options.addNewWall(...args))
          }, " + 添加新墙体 ")
        ]),
        vue.createCommentVNode(" 修改底部按钮 "),
        vue.createElementVNode("view", { class: "footer" }, [
          vue.createElementVNode("button", {
            onClick: _cache[3] || (_cache[3] = (...args) => $options.exportTable && $options.exportTable(...args))
          }, "导出表格"),
          vue.createElementVNode("button", {
            onClick: _cache[4] || (_cache[4] = ($event) => $data.showSettings = true),
            class: "settings-btn"
          }, [
            vue.createElementVNode("image", {
              src: _imports_1,
              class: "settings-icon",
              mode: "aspectFit"
            })
          ])
        ])
      ]),
      vue.createCommentVNode(" 添加自定义弹出层 "),
      $data.showNameInput ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "custom-popup"
      }, [
        vue.createElementVNode("view", {
          class: "popup-mask",
          onClick: _cache[5] || (_cache[5] = ($event) => $data.showNameInput = false)
        }),
        vue.createElementVNode("view", { class: "popup-content" }, [
          vue.createElementVNode("view", { class: "popup-title" }, "新增墙体"),
          vue.createElementVNode("view", { class: "popup-input-wrap" }, [
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                class: "popup-input",
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $data.newWallName = $event),
                placeholder: "请输入墙体名称（留空则自动命名）",
                "placeholder-class": "input-placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.newWallName]
            ])
          ]),
          vue.createElementVNode("view", { class: "popup-buttons" }, [
            vue.createElementVNode("button", {
              class: "popup-btn cancel",
              onClick: _cache[7] || (_cache[7] = ($event) => $data.showNameInput = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "popup-btn confirm",
              onClick: _cache[8] || (_cache[8] = (...args) => $options.confirmAddWall && $options.confirmAddWall(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 设置弹窗 "),
      $data.showSettings ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "custom-popup"
      }, [
        vue.createElementVNode("view", {
          class: "popup-mask",
          onClick: _cache[9] || (_cache[9] = ($event) => $data.showSettings = false)
        }),
        vue.createElementVNode("view", { class: "popup-content settings-popup" }, [
          vue.createElementVNode("view", { class: "popup-title" }, "预警值设置"),
          vue.createElementVNode("view", { class: "settings-form" }, [
            $data.projectType === "坡度" || $data.projectType === "坡度加平整度" ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "setting-item"
            }, [
              vue.createElementVNode("text", { class: "setting-label" }, "坡度预警值 (mm/M)"),
              vue.createElementVNode("input", {
                type: "digit",
                class: "setting-input",
                value: $data.warningSettings.slopeWarning,
                onInput: _cache[10] || (_cache[10] = (e) => $options.handleSettingInput("slopeWarning", e.detail.value)),
                placeholder: "请输入坡度预警值"
              }, null, 40, ["value"])
            ])) : vue.createCommentVNode("v-if", true),
            $data.projectType === "平整度" || $data.projectType === "坡度加平整度" ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "setting-item"
            }, [
              vue.createElementVNode("text", { class: "setting-label" }, "平整度预警值 (mm)"),
              vue.createElementVNode("input", {
                type: "digit",
                class: "setting-input",
                value: $data.warningSettings.flatnessWarning,
                onInput: _cache[11] || (_cache[11] = (e) => $options.handleSettingInput("flatnessWarning", e.detail.value)),
                placeholder: "请输入平整度预警值"
              }, null, 40, ["value"])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("button", {
              class: "preset-manage-btn",
              onClick: _cache[12] || (_cache[12] = (...args) => $options.goToPresets && $options.goToPresets(...args))
            }, "使用预设值")
          ]),
          vue.createElementVNode("view", { class: "popup-buttons" }, [
            vue.createElementVNode("button", {
              class: "popup-btn cancel",
              onClick: _cache[13] || (_cache[13] = ($event) => $data.showSettings = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "popup-btn confirm",
              onClick: _cache[14] || (_cache[14] = (...args) => $options.saveSettings && $options.saveSettings(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 房间管理弹窗 "),
      $data.showSectionInput ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "custom-popup"
      }, [
        vue.createElementVNode("view", {
          class: "popup-mask",
          onClick: _cache[15] || (_cache[15] = ($event) => $data.showSectionInput = false)
        }),
        vue.createElementVNode("view", { class: "popup-content" }, [
          vue.createElementVNode(
            "view",
            { class: "popup-title" },
            vue.toDisplayString($data.isEditingSection ? "编辑房间" : "新增房间"),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "popup-input-wrap" }, [
            vue.withDirectives(vue.createElementVNode("input", {
              class: "popup-input",
              "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => $data.newSectionName = $event),
              placeholder: $data.isEditingSection ? "请输入新的房间名称" : "请输入房间名称",
              "placeholder-class": "input-placeholder"
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.newSectionName]
            ])
          ]),
          vue.createElementVNode("view", { class: "popup-buttons" }, [
            vue.createElementVNode("button", {
              class: "popup-btn cancel",
              onClick: _cache[17] || (_cache[17] = ($event) => $data.showSectionInput = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "popup-btn confirm",
              onClick: _cache[18] || (_cache[18] = (...args) => $options.confirmSection && $options.confirmSection(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 添加修改墙体名称的弹窗 "),
      $data.showWallNameInput ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 3,
        class: "custom-popup"
      }, [
        vue.createElementVNode("view", {
          class: "popup-mask",
          onClick: _cache[19] || (_cache[19] = ($event) => $data.showWallNameInput = false)
        }),
        vue.createElementVNode("view", { class: "popup-content" }, [
          vue.createElementVNode("view", { class: "popup-title" }, "修改墙体名称"),
          vue.createElementVNode("view", { class: "popup-input-wrap" }, [
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                class: "popup-input",
                "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => $data.editingWallName = $event),
                placeholder: "请输入新的墙体名称",
                "placeholder-class": "input-placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.editingWallName]
            ])
          ]),
          vue.createElementVNode("view", { class: "popup-buttons" }, [
            vue.createElementVNode("button", {
              class: "popup-btn cancel",
              onClick: _cache[21] || (_cache[21] = ($event) => $data.showWallNameInput = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "popup-btn confirm",
              onClick: _cache[22] || (_cache[22] = (...args) => $options.confirmEditWallName && $options.confirmEditWallName(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesInProjectInProject = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-92d98530"], ["__file", "D:/nhuProject/智能靠尺/pages/inProject/inProject.vue"]]);
  const _sfc_main$7 = {
    data() {
      return {
        listData: []
      };
    },
    onLoad() {
      this.openSQL();
    },
    methods: {
      // 打开数据库
      openSQL() {
        let open = sqliteUtil.isOpen();
        formatAppLog("log", "at pages/test/test.vue:37", "数据库状态", open ? "开启" : "关闭");
        if (!open) {
          sqliteUtil.openSqlite().then((res) => {
            formatAppLog("log", "at pages/test/test.vue:41", "数据库已打开");
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:44", "数据库开启失败");
          });
        }
      },
      // 关闭数据库
      closeSQL() {
        let open = sqliteUtil.isOpen();
        if (open) {
          sqliteUtil.closeSqlite().then((res) => {
            formatAppLog("log", "at pages/test/test.vue:56", "数据库已关闭");
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:59", "数据库关闭失败");
          });
        }
      },
      // 创建表
      createTable() {
        let open = sqliteUtil.isOpen();
        if (open) {
          this.openSQL();
          let sql = '"id" INTEGER PRIMARY KEY AUTOINCREMENT,"icon" TEXT NOT NULL,"title" TEXT NOT NULL,"address" TEXT,"date" TEXT NOT NULL,"type_tag" TEXT,"building" TEXT,"unit" TEXT,"floor" TEXT,"room_number" TEXT,"inspector" TEXT,"project_status" TEXT,"inspection_status" TEXT';
          sqliteUtil.createTable("project", sql).then((res) => {
            formatAppLog("log", "at pages/test/test.vue:74", "创建project表成功");
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:77", "创建表失败");
          });
        } else {
          formatAppLog("log", "at pages/test/test.vue:80", "数据库未打开");
        }
      },
      // 新增表数据
      insertTableData() {
        let open = sqliteUtil.isOpen();
        if (open) {
          let arr = [
            {
              icon: "/static/image/home1.png",
              title: "衡阳项目",
              address: "湖南省衡阳市蒸湘区蔡伦大道",
              date: "2023-08-01",
              type_tag: "校园",
              building: "A栋",
              unit: "2单元",
              floor: "6层",
              room_number: "A603",
              inspector: "张工",
              project_status: "进行中",
              inspection_status: "未验收"
            },
            {
              icon: "/static/image/home1.png",
              title: "衡阳项目",
              address: "湖南省衡阳市蒸湘区蔡伦大道",
              date: "2023-08-01",
              type_tag: "校园",
              building: "A栋",
              unit: "2单元",
              floor: "6层",
              room_number: "A603",
              inspector: "张工",
              project_status: "进行中",
              inspection_status: "未验收"
            },
            {
              icon: "/static/image/home1.png",
              title: "衡阳项目",
              address: "湖南省衡阳市蒸湘区蔡伦大道",
              date: "2023-08-01",
              type_tag: "校园",
              building: "A栋",
              unit: "2单元",
              floor: "6层",
              room_number: "A603",
              inspector: "张工",
              project_status: "进行中",
              inspection_status: "未验收"
            },
            {
              icon: "/static/image/home1.png",
              title: "衡阳项目",
              address: "湖南省衡阳市蒸湘区蔡伦大道",
              date: "2023-08-01",
              type_tag: "校园",
              building: "A栋",
              unit: "2单元",
              floor: "6层",
              room_number: "A603",
              inspector: "张工",
              project_status: "进行中",
              inspection_status: "未验收"
            },
            {
              icon: "/static/image/home1.png",
              title: "衡阳项目",
              address: "湖南省衡阳市蒸湘区蔡伦大道",
              date: "2023-08-01",
              type_tag: "校园",
              building: "A栋",
              unit: "2单元",
              floor: "6层",
              room_number: "A603",
              inspector: "张工",
              project_status: "进行中",
              inspection_status: "未验收"
            },
            {
              icon: "/static/image/home1.png",
              title: "衡阳项目",
              address: "湖南省衡阳市蒸湘区蔡伦大道",
              date: "2023-08-01",
              type_tag: "校园",
              building: "A栋",
              unit: "2单元",
              floor: "6层",
              room_number: "A603",
              inspector: "张工",
              project_status: "进行中",
              inspection_status: "未验收"
            }
          ];
          let condition = ["icon", "title", "address", "date", "type_tag", "building", "unit", "floor", "room_number", "inspector", "project_status", "inspection_status"];
          arr.map((item) => {
            let sql = `'${item.icon}','${item.title}','${item.address}','${item.date}','${item.type_tag}','${item.building}','${item.unit}','${item.floor}','${item.room_number}','${item.inspector}','${item.project_status}','${item.inspection_status}'`;
            sqliteUtil.insertTableData("project", sql, condition).then((res) => {
              formatAppLog("log", "at pages/test/test.vue:179", "新增数据成功");
              this.selectTableData();
            }).catch((error) => {
              formatAppLog("log", "at pages/test/test.vue:183", "失败", error);
            });
          });
        } else {
          this.showToast("数据库未打开");
        }
      },
      // 查询表数据
      selectTableData() {
        let open = sqliteUtil.isOpen();
        if (open) {
          sqliteUtil.selectTableData("project").then((res) => {
            formatAppLog("log", "at pages/test/test.vue:197", "contact表数据", res);
            this.listData = res;
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:201", "查询失败", error);
          });
        } else {
          this.showToast("数据库未打开");
        }
      },
      // 修改表数据
      updateTableData() {
        let open = sqliteUtil.isOpen();
        if (open) {
          let time = this.formatDate((/* @__PURE__ */ new Date()).getTime());
          let data = `content = '我被修改了',time = '${time}'`;
          sqliteUtil.updateTableData("chat", data, "name", "小明").then((res) => {
            this.showToast("更新chat表成功");
            this.selectTableData();
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:220", "修改失败", error);
          });
        } else {
          this.showToast("数据库未打开");
        }
      },
      //删除表	
      deleteTable() {
        let open = sqliteUtil.isOpen();
        if (open) {
          sqliteUtil.deleteTable("project").then((res) => {
            this.showToast("删除表成功");
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:235", "删除表失败", error);
          });
        } else {
          this.showToast("数据库未打开");
        }
      },
      // 删除表数据
      deleteTableData() {
        let open = sqliteUtil.isOpen();
        if (open) {
          sqliteUtil.deleteTableData("chat", "name", "小红").then((res) => {
            this.showToast("删除表数据成功");
            this.selectTableData();
          }).catch((error) => {
            formatAppLog("log", "at pages/test/test.vue:253", "删除失败", error);
          });
        } else {
          this.showToast("数据库未打开");
        }
      },
      // 提示框
      showToast: function(str) {
        uni.showToast({
          icon: "none",
          title: str,
          mask: true
        });
      },
      // 时间戳转年月日
      formatDate(data) {
        let now = new Date(data);
        var year = now.getFullYear();
        var month = now.getMonth() + 1 < 10 ? "0" + (now.getMonth() + 1) : now.getMonth() + 1;
        var date = now.getDate() < 10 ? "0" + now.getDate() : now.getDate();
        var hour = now.getHours() < 10 ? "0" + now.getHours() : now.getHours();
        var minute = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes();
        var second = now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds();
        return year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", null, [
      vue.createElementVNode("view", { class: "uni-divider uni-divider__content" }, "Demo"),
      vue.createElementVNode("button", {
        onClick: _cache[0] || (_cache[0] = (...args) => $options.openSQL && $options.openSQL(...args))
      }, "打开数据库"),
      vue.createElementVNode("button", {
        onClick: _cache[1] || (_cache[1] = (...args) => $options.createTable && $options.createTable(...args))
      }, "创建表"),
      vue.createElementVNode("button", {
        onClick: _cache[2] || (_cache[2] = (...args) => $options.insertTableData && $options.insertTableData(...args))
      }, "新增表数据"),
      vue.createElementVNode("button", {
        onClick: _cache[3] || (_cache[3] = (...args) => $options.selectTableData && $options.selectTableData(...args))
      }, "查询表数据"),
      vue.createElementVNode("button", {
        onClick: _cache[4] || (_cache[4] = (...args) => $options.updateTableData && $options.updateTableData(...args))
      }, "修改表数据"),
      vue.createElementVNode("button", {
        onClick: _cache[5] || (_cache[5] = (...args) => $options.deleteTableData && $options.deleteTableData(...args))
      }, "按条件删除表数据"),
      vue.createElementVNode("button", {
        onClick: _cache[6] || (_cache[6] = (...args) => $options.closeSQL && $options.closeSQL(...args))
      }, "关闭数据库"),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($data.listData, (item, index) => {
          return vue.openBlock(), vue.createElementBlock("view", {
            class: "uni-divider__content",
            key: index
          }, [
            vue.createElementVNode(
              "view",
              null,
              "名字:" + vue.toDisplayString(item.title),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "view",
              null,
              "内容:" + vue.toDisplayString(item.address),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "view",
              null,
              "时间:" + vue.toDisplayString(item.date),
              1
              /* TEXT */
            )
          ]);
        }),
        128
        /* KEYED_FRAGMENT */
      ))
    ]);
  }
  const PagesTestTest = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__file", "D:/nhuProject/智能靠尺/pages/test/test.vue"]]);
  const _sfc_main$6 = {
    data() {
      return {
        typeOptions: [
          { name: "学校", icon: "/static/image/home1.png" },
          { name: "办公楼", icon: "/static/image/home2.png" },
          { name: "工业厂房", icon: "/static/image/home3.png" },
          { name: "公寓小区", icon: "/static/image/home4.png" },
          { name: "乡镇住宅", icon: "/static/image/home5.png" },
          { name: "其他", icon: "/static/image/home6.png" }
        ],
        packageOptions: ["坡度", "平整度", "坡度加平整度"],
        inspectionStatusOptions: ["未验收", "已验收"],
        projectFields: [
          { key: "title", label: "项目名称" },
          { key: "address", label: "项目地址" },
          { key: "date", label: "验收日期" },
          { key: "building", label: "栋" },
          { key: "unit", label: "单元" },
          { key: "floor", label: "楼层" },
          { key: "room_number", label: "房号" },
          { key: "inspector", label: "质检员" }
        ],
        form: {
          icon: "/static/image/home1.png",
          type_tag: "",
          title: "",
          address: "",
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          building: "",
          unit: "",
          floor: "",
          room_number: "",
          inspector: "",
          project_status: "坡度加平整度",
          inspection_status: "未验收"
        }
      };
    },
    methods: {
      onTypeSelect(index) {
        const selected = this.typeOptions[index];
        this.form.type_tag = selected.name;
        this.form.icon = selected.icon;
      },
      onDateChange(e) {
        this.form.date = e.detail.value;
      },
      onPackageChange(e) {
        this.form.project_status = this.packageOptions[e.detail.value];
      },
      onInspectionStatusChange(e) {
        this.form.inspection_status = this.inspectionStatusOptions[e.detail.value];
      },
      submit() {
        if (!this.form.title.trim()) {
          uni.showToast({ title: "请输入项目名称", icon: "none" });
          return;
        }
        if (!this.form.address.trim()) {
          uni.showToast({ title: "请输入项目地址", icon: "none" });
          return;
        }
        if (!this.form.date.trim()) {
          uni.showToast({ title: "请输入验收日期", icon: "none" });
          return;
        }
        const values = [
          this.form.icon,
          this.form.title,
          this.form.address,
          this.form.date,
          this.form.type_tag,
          this.form.building,
          this.form.unit,
          this.form.floor,
          this.form.room_number,
          this.form.inspector,
          this.form.project_status,
          this.form.inspection_status
        ].map((val) => `'${val}'`).join(", ");
        const sql = `INSERT INTO project (
				icon, title, address, date, type_tag,
				building, unit, floor, room_number, inspector,
				project_status, inspection_status
			) VALUES (${values})`;
        if (!sqliteUtil.isOpen()) {
          sqliteUtil.openSqlite().then(() => this.insertProject(sql));
        } else {
          this.insertProject(sql);
        }
      },
      insertProject(sql) {
        plus.sqlite.executeSql({
          name: sqliteUtil.dbName,
          sql,
          success: () => {
            formatAppLog("log", "at pages/newProject/template/template.vue:170", "插入成功");
            uni.showToast({ title: "添加成功", icon: "success" });
            setTimeout(() => uni.navigateBack(), 1e3);
          },
          fail: (e) => {
            formatAppLog("error", "at pages/newProject/template/template.vue:175", "插入失败", e);
            uni.showToast({ title: "添加失败", icon: "none" });
          }
        });
      },
      async getLocation() {
        const that = this;
        uni.getLocation({
          type: "wgs84",
          success(res) {
            const qqMapKey = "GN4BZ-LSR64-7DAUI-DB246-CUPM3-5HBMM";
            uni.request({
              url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${res.latitude},${res.longitude}&key=${qqMapKey}`,
              success(resp) {
                if (resp.data && resp.data.result) {
                  const recommend = resp.data.result.formatted_addresses && resp.data.result.formatted_addresses.standard_address;
                  const address = recommend || resp.data.result.address;
                  that.form.address = address;
                } else {
                  uni.showToast({ title: "定位失败", icon: "none" });
                }
              },
              fail() {
                uni.showToast({ title: "定位失败", icon: "none" });
              }
            });
          },
          fail() {
            uni.showToast({ title: "获取定位失败", icon: "none" });
          }
        });
      }
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "main" }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "true",
        class: "scroll-view"
      }, [
        vue.createElementVNode("view", { class: "container" }, [
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("view", { class: "form-title" }, "项目信息"),
            vue.createElementVNode("view", { class: "form-grid" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.projectFields, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      class: vue.normalizeClass(["form-item", { "full-width": item.key === "address" || item.key === "title" }]),
                      key: item.key
                    },
                    [
                      item.key === "address" ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 0,
                        class: "label-with-button"
                      }, [
                        vue.createElementVNode(
                          "text",
                          { class: "label" },
                          vue.toDisplayString(item.label),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("button", {
                          class: "location-btn",
                          type: "default",
                          size: "mini",
                          onClick: _cache[0] || (_cache[0] = (...args) => $options.getLocation && $options.getLocation(...args))
                        }, [
                          vue.createElementVNode("text", { class: "location-text" }, "获取定位")
                        ])
                      ])) : (vue.openBlock(), vue.createElementBlock(
                        "text",
                        {
                          key: 1,
                          class: "label"
                        },
                        vue.toDisplayString(item.label),
                        1
                        /* TEXT */
                      )),
                      item.key === "address" ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 2,
                        class: "address-container"
                      }, [
                        vue.withDirectives(vue.createElementVNode("input", {
                          class: "input address-input",
                          "onUpdate:modelValue": ($event) => $data.form[item.key] = $event,
                          placeholder: "请输入" + item.label
                        }, null, 8, ["onUpdate:modelValue", "placeholder"]), [
                          [vue.vModelText, $data.form[item.key]]
                        ])
                      ])) : item.key === "date" ? (vue.openBlock(), vue.createElementBlock("picker", {
                        key: 3,
                        mode: "date",
                        value: $data.form[item.key],
                        onChange: _cache[1] || (_cache[1] = (...args) => $options.onDateChange && $options.onDateChange(...args))
                      }, [
                        vue.createElementVNode(
                          "view",
                          { class: "picker-view" },
                          vue.toDisplayString($data.form[item.key] || "请选择" + item.label),
                          1
                          /* TEXT */
                        )
                      ], 40, ["value"])) : vue.withDirectives((vue.openBlock(), vue.createElementBlock("input", {
                        key: 4,
                        class: "input",
                        "onUpdate:modelValue": ($event) => $data.form[item.key] = $event,
                        placeholder: "请输入" + item.label
                      }, null, 8, ["onUpdate:modelValue", "placeholder"])), [
                        [vue.vModelText, $data.form[item.key]]
                      ])
                    ],
                    2
                    /* CLASS */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("view", { class: "form-title" }, "项目类型"),
            vue.createElementVNode("view", { class: "type-grid" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.typeOptions, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: item.name,
                    class: vue.normalizeClass(["type-item", { "active": $data.form.type_tag === item.name }]),
                    onClick: ($event) => $options.onTypeSelect(index)
                  }, [
                    vue.createElementVNode("image", {
                      src: item.icon,
                      class: "type-icon",
                      mode: "aspectFit"
                    }, null, 8, ["src"]),
                    vue.createElementVNode(
                      "text",
                      { class: "type-name" },
                      vue.toDisplayString(item.name),
                      1
                      /* TEXT */
                    )
                  ], 10, ["onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("view", { class: "form-title" }, "状态信息"),
            vue.createElementVNode("view", { class: "form-grid" }, [
              vue.createElementVNode("view", { class: "form-item" }, [
                vue.createElementVNode("text", { class: "label" }, "验收类型"),
                vue.createElementVNode("picker", {
                  range: $data.packageOptions,
                  onChange: _cache[2] || (_cache[2] = (...args) => $options.onPackageChange && $options.onPackageChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-view" },
                    vue.toDisplayString($data.form.project_status || "请选择验收类型"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "form-item" }, [
                vue.createElementVNode("text", { class: "label" }, "验收状态"),
                vue.createElementVNode("picker", {
                  range: $data.inspectionStatusOptions,
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.onInspectionStatusChange && $options.onInspectionStatusChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-view" },
                    vue.toDisplayString($data.form.inspection_status || "请选择验收状态"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ])
            ])
          ])
        ])
      ]),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.submit && $options.submit(...args))
        }, "提交项目")
      ])
    ]);
  }
  const PagesNewProjectTemplateTemplate = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "D:/nhuProject/智能靠尺/pages/newProject/template/template.vue"]]);
  const _sfc_main$5 = {
    data() {
      return {
        selectedFile: null,
        headers: ["房间", "墙体", "坡度(mm/M)", "平整度(mm)", "预警状态"],
        // 默认表头，会根据验收类型动态调整
        previewData: [],
        projectInfo: {
          title: "",
          address: "",
          date: "",
          building: "",
          unit: "",
          floor: "",
          roomNumber: "",
          type: "",
          inspectionType: "",
          inspectionStatus: "",
          inspector: "",
          icon: "/static/image/home1.png"
        },
        typeOptions: [
          { name: "学校", icon: "/static/image/home1.png" },
          { name: "办公楼", icon: "/static/image/home2.png" },
          { name: "工业厂房", icon: "/static/image/home3.png" },
          { name: "公寓小区", icon: "/static/image/home4.png" },
          { name: "乡镇住宅", icon: "/static/image/home5.png" },
          { name: "其他", icon: "/static/image/home6.png" }
        ],
        projectTypes: ["学校", "办公楼", "工业厂房", "住宅小区", "别墅"],
        inspectionTypes: ["坡度", "平整度", "坡度加平整度"],
        importInProgress: false,
        allData: [],
        warningSettings: {
          slopeWarning: "",
          flatnessWarning: ""
        }
      };
    },
    computed: {
      canImport() {
        return this.previewData.length > 0 && this.projectInfo.title && this.projectInfo.address && this.projectInfo.type && this.projectInfo.inspectionType && !this.importInProgress;
      }
    },
    methods: {
      formatFileSize(bytes) {
        if (bytes === 0)
          return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      },
      showInspectionTypeEditTip() {
        this.inspectionTypes.indexOf(this.projectInfo.inspectionType);
        uni.showActionSheet({
          itemList: this.inspectionTypes,
          success: (res) => {
            this.projectInfo.inspectionType = this.inspectionTypes[res.tapIndex];
            this.updatePreviewDataForHeaders();
          }
        });
      },
      chooseFile() {
        if (typeof plus !== "undefined") {
          try {
            const main = plus.android.runtimeMainActivity();
            const Intent = plus.android.importClass("android.content.Intent");
            const intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("text/comma-separated-values");
            main.onActivityResult = (requestCode, resultCode, data) => {
              if (requestCode === 1 && resultCode === -1) {
                try {
                  const uri = data.getData();
                  const uriString = uri.toString();
                  let fileName = "unknown.csv";
                  if (uriString.lastIndexOf("/") !== -1) {
                    fileName = uriString.substring(uriString.lastIndexOf("/") + 1);
                    try {
                      fileName = decodeURIComponent(fileName);
                    } catch (e) {
                      formatAppLog("error", "at pages/newProject/csv/csv.vue:252", "解码文件名失败:", e);
                    }
                  }
                  if (!fileName.toLowerCase().endsWith(".csv")) {
                    uni.showToast({
                      title: "请选择CSV文件",
                      icon: "none"
                    });
                    return;
                  }
                  const InputStream = plus.android.importClass("java.io.InputStream");
                  const InputStreamReader = plus.android.importClass("java.io.InputStreamReader");
                  const BufferedReader = plus.android.importClass("java.io.BufferedReader");
                  const StringBuilder = plus.android.importClass("java.lang.StringBuilder");
                  const inputStream = plus.android.invoke(main.getContentResolver(), "openInputStream", uri);
                  const isr = new InputStreamReader(inputStream, "UTF-8");
                  const br = new BufferedReader(isr);
                  const sb = new StringBuilder();
                  let line = null;
                  try {
                    while ((line = br.readLine()) != null) {
                      sb.append(line).append("\n");
                    }
                  } finally {
                    try {
                      br.close();
                    } catch (e) {
                      formatAppLog("error", "at pages/newProject/csv/csv.vue:285", "关闭BufferedReader失败:", e);
                    }
                    try {
                      isr.close();
                    } catch (e) {
                      formatAppLog("error", "at pages/newProject/csv/csv.vue:286", "关闭InputStreamReader失败:", e);
                    }
                    try {
                      inputStream.close();
                    } catch (e) {
                      formatAppLog("error", "at pages/newProject/csv/csv.vue:287", "关闭InputStream失败:", e);
                    }
                  }
                  const content = sb.toString();
                  this.selectedFile = {
                    name: fileName,
                    path: uriString,
                    size: content.length
                  };
                  this.parseCSV(content);
                } catch (error) {
                  formatAppLog("error", "at pages/newProject/csv/csv.vue:303", "读取文件失败:", error);
                  uni.showToast({
                    title: "读取文件失败",
                    icon: "none"
                  });
                }
              }
            };
            main.startActivityForResult(intent, 1);
          } catch (error) {
            formatAppLog("error", "at pages/newProject/csv/csv.vue:316", "启动文件选择器失败:", error);
            uni.showToast({
              title: "无法打开文件选择器",
              icon: "none"
            });
          }
        } else {
          uni.chooseFile({
            count: 1,
            extension: [".csv"],
            success: (res) => {
              const file = res.tempFiles[0];
              this.selectedFile = {
                name: file.name,
                size: file.size,
                path: file.path
              };
              this.readCSVFile(file);
            },
            fail: (error) => {
              if (error.errMsg !== "chooseFile:fail cancel") {
                uni.showToast({
                  title: "选择文件失败",
                  icon: "none"
                });
              }
            }
          });
        }
      },
      readCSVFile(fileEntry) {
        if (typeof plus !== "undefined") {
          if (fileEntry.file) {
            fileEntry.file((file) => {
              const reader = new plus.io.FileReader();
              reader.onloadend = (e) => {
                if (e.target.result) {
                  this.parseCSV(e.target.result);
                } else {
                  uni.showToast({
                    title: "文件内容为空",
                    icon: "none"
                  });
                }
              };
              reader.onerror = (error) => {
                formatAppLog("error", "at pages/newProject/csv/csv.vue:364", "读取文件失败:", error);
                uni.showToast({
                  title: "读取文件失败",
                  icon: "none"
                });
              };
              reader.readAsText(file, "utf-8");
            }, (error) => {
              formatAppLog("error", "at pages/newProject/csv/csv.vue:372", "获取文件对象失败:", error);
              uni.showToast({
                title: "无法读取文件",
                icon: "none"
              });
            });
          } else {
            plus.io.resolveLocalFileSystemURL(fileEntry.path || fileEntry, (entry) => {
              entry.file((file) => {
                const reader = new plus.io.FileReader();
                reader.onloadend = (e) => {
                  if (e.target.result) {
                    this.parseCSV(e.target.result);
                  } else {
                    uni.showToast({
                      title: "文件内容为空",
                      icon: "none"
                    });
                  }
                };
                reader.onerror = (error) => {
                  formatAppLog("error", "at pages/newProject/csv/csv.vue:393", "读取文件失败:", error);
                  uni.showToast({
                    title: "读取文件失败",
                    icon: "none"
                  });
                };
                reader.readAsText(file, "utf-8");
              });
            });
          }
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.parseCSV(e.target.result);
          };
          reader.onerror = (error) => {
            formatAppLog("error", "at pages/newProject/csv/csv.vue:410", "读取文件失败:", error);
            uni.showToast({
              title: "读取文件失败",
              icon: "none"
            });
          };
          reader.readAsText(fileEntry);
        }
      },
      parseCSV(content) {
        try {
          formatAppLog("log", "at pages/newProject/csv/csv.vue:421", "开始解析CSV文件");
          content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const rows = content.split("\n").map((row) => row.trim()).filter((row) => row);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:430", "CSV文件总行数:", rows.length);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:431", "第一行内容:", rows[0]);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:432", "第二行内容:", rows[1]);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:433", "第三行内容:", rows[2]);
          const projectHeaders = rows[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
          const projectValues = rows[1].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
          formatAppLog("log", "at pages/newProject/csv/csv.vue:439", "项目信息表头:", projectHeaders);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:440", "项目信息值:", projectValues);
          const projectInfo = {};
          projectHeaders.forEach((header, index) => {
            projectInfo[header] = projectValues[index] || "";
          });
          const warningLine = rows[2].split(",")[0] || "";
          const warningMatches = {
            slope: warningLine.match(/坡度预警值\(mm\/M\)：(\d+(\.\d+)?)/),
            flatness: warningLine.match(/平整度预警值\(mm\)：(\d+(\.\d+)?)/)
          };
          this.warningSettings = {
            slopeWarning: warningMatches.slope ? warningMatches.slope[1] : "",
            flatnessWarning: warningMatches.flatness ? warningMatches.flatness[1] : ""
          };
          formatAppLog("log", "at pages/newProject/csv/csv.vue:460", "解析到的预警值设置:", this.warningSettings);
          const typeIconMap = {
            "学校": "/static/image/home1.png",
            "办公楼": "/static/image/home2.png",
            "工业厂房": "/static/image/home3.png",
            "公寓小区": "/static/image/home4.png",
            "乡镇住宅": "/static/image/home5.png",
            "其他": "/static/image/home6.png"
          };
          const projectType = projectInfo["项目类型"] || "";
          const icon = typeIconMap[projectType] || "/static/image/home1.png";
          this.projectInfo = {
            title: projectInfo["项目名称"] || "",
            address: projectInfo["项目地址"] || "",
            date: projectInfo["验收日期"] || "",
            building: projectInfo["栋"] || "",
            unit: projectInfo["单元"] || "",
            floor: projectInfo["楼层"] || "",
            roomNumber: projectInfo["房号"] || "",
            type: projectType,
            inspectionType: projectInfo["验收类型"] || "",
            inspectionStatus: projectInfo["验收状态"] || "",
            inspector: projectInfo["项目质检员"] || "",
            icon
          };
          const dataRows = rows.slice(3);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:492", "数据行数:", dataRows.length);
          const headers = dataRows[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "")).filter((h) => h);
          formatAppLog("log", "at pages/newProject/csv/csv.vue:499", "解析到的数据表头:", headers);
          const requiredHeaders = ["房间"];
          if (!this.validateHeaders(headers, requiredHeaders)) {
            formatAppLog("log", "at pages/newProject/csv/csv.vue:505", "表头验证失败");
            uni.showToast({
              title: "CSV格式不正确：缺少必需的房间列",
              icon: "none",
              duration: 3e3
            });
            return;
          }
          formatAppLog("log", "at pages/newProject/csv/csv.vue:514", "表头验证通过");
          const roomIndex = headers.findIndex((h) => {
            const cleanHeader = h.toLowerCase().trim();
            return cleanHeader === "房间" || cleanHeader === "区域";
          });
          formatAppLog("log", "at pages/newProject/csv/csv.vue:522", "房间列索引:", roomIndex);
          const wallIndex = headers.findIndex((h) => h.toLowerCase().trim() === "墙体");
          const slopeIndex = headers.findIndex((h) => {
            const cleanHeader = h.toLowerCase().trim();
            return cleanHeader === "坡度(mm/m)" || cleanHeader === "坡度" || cleanHeader === "坡度（mm/m）";
          });
          const flatnessIndex = headers.findIndex((h) => {
            const cleanHeader = h.toLowerCase().trim();
            return cleanHeader === "平整度(mm)" || cleanHeader === "平整度" || cleanHeader === "平整度（mm）";
          });
          formatAppLog("log", "at pages/newProject/csv/csv.vue:538", "列索引:", {
            roomIndex,
            wallIndex,
            slopeIndex,
            flatnessIndex
          });
          formatAppLog("log", "at pages/newProject/csv/csv.vue:546", "开始处理数据行，原始数据行数:", dataRows.length);
          const validData = dataRows.slice(1).filter((row) => {
            const cells = row.split(",").map((cell) => cell.trim().replace(/^["']|["']$/g, ""));
            const roomName = cells[roomIndex];
            formatAppLog("log", "at pages/newProject/csv/csv.vue:553", "检查房间名:", roomName);
            return roomName && roomName.length > 0;
          }).map((row) => {
            const cells = row.split(",").map((cell) => {
              const value = cell.trim().replace(/^["']|["']$/g, "");
              return !value || value === "暂无数据" ? "" : value;
            });
            formatAppLog("log", "at pages/newProject/csv/csv.vue:565", "处理行数据:", cells);
            const result = new Array(4).fill("");
            result[0] = cells[roomIndex] || "";
            if (wallIndex > -1) {
              result[1] = cells[wallIndex] || "";
            }
            if (slopeIndex > -1) {
              const slopeValue = cells[slopeIndex];
              result[2] = slopeValue && !isNaN(parseFloat(slopeValue)) ? slopeValue : "";
            }
            if (flatnessIndex > -1) {
              const flatnessValue = cells[flatnessIndex];
              result[3] = flatnessValue && !isNaN(parseFloat(flatnessValue)) ? flatnessValue : "";
            }
            formatAppLog("log", "at pages/newProject/csv/csv.vue:590", "处理后的数据:", result);
            return result;
          });
          this.allData = validData;
          formatAppLog("log", "at pages/newProject/csv/csv.vue:596", "保存的所有数据:", this.allData);
          this.updatePreviewDataForHeaders();
          if (this.previewData.length > 0) {
            uni.showToast({
              title: "文件读取成功",
              icon: "success"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/csv.vue:608", "解析CSV失败:", error);
          formatAppLog("error", "at pages/newProject/csv/csv.vue:609", "错误详情:", error.stack);
          uni.showToast({
            title: "解析文件失败",
            icon: "none",
            duration: 3e3
          });
        }
      },
      parseCSVContent(content) {
        try {
          const result = csvUtils.parseCSVContent(content);
          if (!result) {
            uni.showToast({
              title: "解析CSV内容失败",
              icon: "none"
            });
            return false;
          }
          const projectInfoMap = {
            "项目名称": "title",
            "项目地址": "address",
            "验收日期": "date",
            "栋": "building",
            "单元": "unit",
            "楼层": "floor",
            "房号": "roomNumber",
            "项目类型": "type",
            "验收类型": "inspectionType",
            "验收状态": "inspectionStatus",
            "项目质检员": "inspector"
          };
          if (result.projectInfo) {
            const projectInfo = {
              title: "",
              address: "",
              date: "",
              building: "",
              unit: "",
              floor: "",
              roomNumber: "",
              type: "",
              inspectionType: "",
              inspectionStatus: "",
              inspector: ""
            };
            Object.keys(result.projectInfo).forEach((key) => {
              const mappedKey = projectInfoMap[key];
              if (mappedKey) {
                projectInfo[mappedKey] = result.projectInfo[key] || "";
              }
            });
            this.projectInfo = projectInfo;
          }
          if (result.warningSettings) {
            this.warningSettings = {
              slopeWarning: result.warningSettings.slopeWarning || "",
              flatnessWarning: result.warningSettings.flatnessWarning || ""
            };
          }
          const requiredHeaders = ["房间", "区域"];
          const hasRequiredHeader = requiredHeaders.some((h) => result.headers.includes(h));
          if (!hasRequiredHeader) {
            uni.showToast({
              title: "CSV格式不正确，缺少必要的房间/区域列",
              icon: "none"
            });
            return false;
          }
          const roomIndex = result.headers.findIndex((h) => h === "房间" || h === "区域");
          const wallIndex = result.headers.findIndex((h) => h === "墙体");
          const slopeIndex = result.headers.findIndex((h) => h === "坡度(mm/M)" || h === "坡度");
          const flatnessIndex = result.headers.findIndex((h) => h === "平整度(mm)" || h === "平整度");
          this.allData = result.tableData.filter((row) => row[roomIndex] && row[roomIndex].length > 0).map((row) => {
            return [
              row[roomIndex] || "",
              // 房间（必需）
              wallIndex > -1 ? row[wallIndex] || "" : "",
              // 墙体（可选）
              slopeIndex > -1 ? row[slopeIndex] || "" : "",
              // 坡度（可选）
              flatnessIndex > -1 ? row[flatnessIndex] || "" : ""
              // 平整度（可选）
              // 不再包含预警状态
            ];
          });
          this.updatePreviewDataForHeaders();
          return true;
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/csv.vue:718", "解析CSV内容失败:", error);
          uni.showToast({
            title: "解析CSV内容失败",
            icon: "none"
          });
          return false;
        }
      },
      validateHeaders(headers, requiredHeaders) {
        if (!headers || headers.length === 0) {
          formatAppLog("log", "at pages/newProject/csv/csv.vue:728", "表头为空或不存在");
          return false;
        }
        formatAppLog("log", "at pages/newProject/csv/csv.vue:732", "当前表头:", headers);
        formatAppLog("log", "at pages/newProject/csv/csv.vue:733", "需要的表头:", requiredHeaders);
        const result = requiredHeaders.every((required) => {
          const found = headers.some((header) => {
            const cleanHeader = header.replace(/^["']|["']$/g, "").trim();
            formatAppLog("log", "at pages/newProject/csv/csv.vue:740", `比较: "${cleanHeader.toLowerCase()}" 与 "${required.toLowerCase()}"`);
            return cleanHeader.toLowerCase() === required.toLowerCase();
          });
          formatAppLog("log", "at pages/newProject/csv/csv.vue:743", `查找表头 "${required}" 的结果:`, found);
          return found;
        });
        formatAppLog("log", "at pages/newProject/csv/csv.vue:747", "验证结果:", result);
        return result;
      },
      onProjectTypeChange(e) {
        const selected = this.typeOptions[e.detail.value];
        this.projectInfo.type = selected.name;
        this.projectInfo.icon = selected.icon;
      },
      onInspectionTypeChange(e) {
        this.projectInfo.inspectionType = this.inspectionTypes[e.detail.value];
        this.updatePreviewDataForHeaders();
      },
      updatePreviewDataForHeaders() {
        formatAppLog("log", "at pages/newProject/csv/csv.vue:760", "开始更新预览数据");
        formatAppLog("log", "at pages/newProject/csv/csv.vue:761", "当前验收类型:", this.projectInfo.inspectionType);
        formatAppLog("log", "at pages/newProject/csv/csv.vue:762", "可用数据:", this.allData);
        if (this.allData && this.allData.length > 0) {
          const inspectionType = this.projectInfo.inspectionType;
          if (inspectionType === "坡度") {
            this.headers = ["房间", "墙体", "坡度(mm/M)"];
          } else if (inspectionType === "平整度") {
            this.headers = ["房间", "墙体", "平整度(mm)"];
          } else {
            this.headers = ["房间", "墙体", "坡度(mm/M)", "平整度(mm)"];
          }
          formatAppLog("log", "at pages/newProject/csv/csv.vue:776", "设置的表头:", this.headers);
          this.previewData = this.allData.map((row, index) => {
            formatAppLog("log", "at pages/newProject/csv/csv.vue:780", `处理第${index + 1}行数据:`, row);
            let displayRow;
            if (inspectionType === "坡度") {
              displayRow = [
                row[0] || "-",
                // 房间名
                row[1] || "-",
                // 墙体名
                row[2] || "-"
                // 坡度数据
              ];
            } else if (inspectionType === "平整度") {
              displayRow = [
                row[0] || "-",
                // 房间名
                row[1] || "-",
                // 墙体名
                row[3] || "-"
                // 平整度数据
              ];
            } else {
              displayRow = [
                row[0] || "-",
                // 房间名
                row[1] || "-",
                // 墙体名
                row[2] || "-",
                // 坡度数据
                row[3] || "-"
                // 平整度数据
              ];
            }
            formatAppLog("log", "at pages/newProject/csv/csv.vue:805", "生成的显示行:", displayRow);
            return displayRow;
          });
          formatAppLog("log", "at pages/newProject/csv/csv.vue:809", "最终预览数据:", this.previewData);
        } else {
          this.previewData = [];
          formatAppLog("log", "at pages/newProject/csv/csv.vue:812", "没有数据可供预览");
        }
      },
      async importData() {
        if (this.importInProgress)
          return;
        if (!this.projectInfo.title || !this.projectInfo.address || !this.projectInfo.type || !this.projectInfo.inspectionType) {
          uni.showToast({
            title: "请填写完整项目信息",
            icon: "none"
          });
          return;
        }
        if (!this.allData || this.allData.length === 0) {
          uni.showToast({
            title: "没有可导入的数据",
            icon: "none"
          });
          return;
        }
        this.importInProgress = true;
        uni.showLoading({
          title: "正在导入..."
        });
        try {
          const projectId = await this.createProject();
          await this.createSectionsAndWalls(projectId);
          uni.hideLoading();
          uni.showToast({
            title: "导入成功",
            icon: "success"
          });
          setTimeout(() => {
            uni.reLaunch({
              url: "/pages/index/index"
            });
          }, 1500);
        } catch (error) {
          uni.hideLoading();
          formatAppLog("error", "at pages/newProject/csv/csv.vue:862", "导入失败:", error);
          uni.showToast({
            title: "导入失败",
            icon: "none"
          });
        } finally {
          this.importInProgress = false;
        }
      },
      async createProject() {
        try {
          const typeIconMap = {
            "学校": "/static/image/home1.png",
            "办公楼": "/static/image/home2.png",
            "工业厂房": "/static/image/home3.png",
            "公寓小区": "/static/image/home4.png",
            "乡镇住宅": "/static/image/home5.png",
            "其他": "/static/image/home6.png"
          };
          const projectData = {
            icon: typeIconMap[this.projectInfo.type] || "/static/image/home1.png",
            title: this.projectInfo.title,
            address: this.projectInfo.address,
            date: this.projectInfo.date,
            type_tag: this.projectInfo.type,
            building: this.projectInfo.building,
            unit: this.projectInfo.unit,
            floor: this.projectInfo.floor,
            room_number: this.projectInfo.roomNumber,
            inspector: this.projectInfo.inspector,
            project_status: this.projectInfo.inspectionType,
            inspection_status: this.projectInfo.inspectionStatus || "未验收"
          };
          await sqliteUtil.insertTableData(
            "project",
            `'${projectData.icon}','${projectData.title}','${projectData.address}','${projectData.date}','${projectData.type_tag}','${projectData.building}','${projectData.unit}','${projectData.floor}','${projectData.room_number}','${projectData.inspector}','${projectData.project_status}','${projectData.inspection_status}'`,
            "icon,title,address,date,type_tag,building,unit,floor,room_number,inspector,project_status,inspection_status"
          );
          const projectIdResult = await new Promise((resolve, reject) => {
            plus.sqlite.selectSql({
              name: sqliteUtil.dbName,
              sql: "SELECT last_insert_rowid() as id",
              success: (result) => {
                resolve(result);
              },
              fail: (e) => {
                reject(e);
              }
            });
          });
          if (!projectIdResult || projectIdResult.length === 0) {
            throw new Error("获取项目ID失败");
          }
          const projectId = projectIdResult[0].id;
          if (this.warningSettings.slopeWarning || this.warningSettings.flatnessWarning) {
            const slopeWarning = this.warningSettings.slopeWarning ? parseFloat(this.warningSettings.slopeWarning) : null;
            const flatnessWarning = this.warningSettings.flatnessWarning ? parseFloat(this.warningSettings.flatnessWarning) : null;
            const warningValues = [];
            const warningColumns = [];
            if (slopeWarning !== null) {
              warningValues.push(slopeWarning);
              warningColumns.push("slope_warning");
            }
            if (flatnessWarning !== null) {
              warningValues.push(flatnessWarning);
              warningColumns.push("flatness_warning");
            }
            if (warningValues.length > 0) {
              await sqliteUtil.insertTableData(
                "warning_settings",
                `${projectId},${warningValues.join(",")}`,
                `project_id,${warningColumns.join(",")}`
              );
            }
          }
          return projectId;
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/csv.vue:955", "创建项目失败:", error);
          throw error;
        }
      },
      async createSectionsAndWalls(projectId) {
        try {
          const sections = [...new Set(this.allData.map((row) => row[0]))];
          for (let i = 0; i < sections.length; i++) {
            await sqliteUtil.insertTableData(
              "sections",
              `null,${projectId},'${sections[i]}',${i}`,
              "id,project_id,name,sort_order"
            );
          }
          for (const row of this.allData) {
            const section = row[0] || "";
            const wallName = row[1] || "";
            let slope = row[2] || "";
            let flatness = row[3] || "";
            if (!wallName || wallName === "暂无数据") {
              continue;
            }
            const inspectionType = this.projectInfo.inspectionType;
            if (inspectionType === "坡度") {
              flatness = "";
            } else if (inspectionType === "平整度") {
              slope = "";
            }
            await sqliteUtil.insertTableData(
              "wall_data",
              `null,${projectId},'${section}','${wallName}','${slope}','${flatness}',''`,
              "id,project_id,section,wall_name,slope,flatness,image"
            );
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/csv.vue:1001", "创建房间和墙体数据失败:", error);
          throw error;
        }
      },
      async downloadTemplate() {
        const templateContent = `项目名称,项目地址,验收日期,栋,单元,楼层,房号,项目类型,验收类型,验收状态,项目质检员
"示例小区","湖南省长沙市岳麓区xxx路123号","2024-03-21","1栋","2单元","3层","301","公寓小区","坡度加平整度","未验收","张工"
预警值设置：坡度预警值(mm/M)：3，平整度预警值(mm)：2
房间,墙体,坡度(mm/M),平整度(mm),预警状态
"客厅","A","2.5","1.8","是"
"客厅","B","3.2","2.1","是"
"客厅","C","","",""
"卧室1","A","2.8","1.9","是"
"卧室1","B","","",""
"卧室2","暂无数据","","",""
"厨房","A","2.7","1.7","是"
"厨房","B","","",""
"卫生间","A","2.5","1.8","是"
"阳台","暂无数据","","",""`;
        try {
          if (typeof plus !== "undefined") {
            const fileName = "wall_measurement_template.csv";
            const filePath = "_downloads/" + fileName;
            const fileEntry = await new Promise((resolve, reject) => {
              plus.io.resolveLocalFileSystemURL("_downloads/", (entry) => {
                entry.getFile(fileName, { create: true }, (fileEntry2) => {
                  resolve(fileEntry2);
                }, reject);
              }, reject);
            });
            await new Promise((resolve, reject) => {
              fileEntry.createWriter((writer) => {
                writer.onwrite = resolve;
                writer.onerror = reject;
                writer.write(templateContent);
              }, reject);
            });
            uni.showToast({
              title: "模板已保存到下载目录",
              icon: "success"
            });
            plus.runtime.openFile("_downloads/" + fileName);
          } else {
            const blob = new Blob([templateContent], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "wall_measurement_template.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/csv.vue:1065", "下载模板失败:", error);
          uni.showToast({
            title: "下载模板失败",
            icon: "none"
          });
        }
      }
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("scroll-view", {
        class: "scroll-container",
        "scroll-y": ""
      }, [
        vue.createCommentVNode(" 内容区域 "),
        vue.createElementVNode("view", { class: "content-wrapper" }, [
          vue.createCommentVNode(" 顶部标题栏 "),
          vue.createElementVNode("view", { class: "header" }, [
            vue.createElementVNode("view", { class: "subtitle" }, "请选择符合格式的CSV文件")
          ]),
          vue.createCommentVNode(" CSV格式说明 "),
          vue.createElementVNode("view", { class: "format-guide" }, [
            vue.createElementVNode("view", { class: "guide-title" }, "CSV文件格式说明："),
            vue.createElementVNode("view", { class: "guide-content" }, [
              vue.createElementVNode("text", null, "1. 第一行为项目信息表头"),
              vue.createElementVNode("text", null, "2. 第二行为项目信息数据"),
              vue.createElementVNode("text", null, "3. 第三行为预警值设置"),
              vue.createElementVNode("text", null, "4. 第四行为墙体数据表头"),
              vue.createElementVNode("text", null, "5. 从第五行开始为房间数据，其中："),
              vue.createElementVNode("text", null, "- 房间名称为必填项（如：客厅）"),
              vue.createElementVNode("text", null, "- 以下数据为可选项："),
              vue.createElementVNode("text", null, "- 墙体编号"),
              vue.createElementVNode("text", null, "- 坡度值(mm/M)"),
              vue.createElementVNode("text", null, "- 平整度值(mm)"),
              vue.createElementVNode("text", null, "- 预警状态"),
              vue.createElementVNode("text", null, "例如："),
              vue.createElementVNode("text", null, '完整格式："客厅","A","2.5","1.8","否"'),
              vue.createElementVNode("text", null, '简单格式："客厅","A","",""')
            ]),
            vue.createElementVNode("button", {
              class: "download-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.downloadTemplate && $options.downloadTemplate(...args))
            }, "下载CSV模板")
          ]),
          vue.createCommentVNode(" 文件选择区域 "),
          vue.createElementVNode("view", { class: "file-section" }, [
            vue.createElementVNode("view", {
              class: "file-box",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.chooseFile && $options.chooseFile(...args))
            }, [
              !$data.selectedFile ? (vue.openBlock(), vue.createElementBlock("image", {
                key: 0,
                src: _imports_0$1,
                class: "upload-icon"
              })) : vue.createCommentVNode("v-if", true),
              !$data.selectedFile ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "upload-text"
              }, "点击选择CSV文件")) : (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "file-info"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "file-name" },
                  vue.toDisplayString($data.selectedFile.name),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "file-size" },
                  vue.toDisplayString($options.formatFileSize($data.selectedFile.size)),
                  1
                  /* TEXT */
                )
              ]))
            ])
          ]),
          vue.createCommentVNode(" 项目信息填写 "),
          $data.previewData.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "project-info"
          }, [
            vue.createElementVNode("view", { class: "info-title" }, "项目信息"),
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "项目名称："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.projectInfo.title = $event),
                    placeholder: "项目名称"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.title]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "项目地址："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.projectInfo.address = $event),
                    placeholder: "项目地址"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.address]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "验收日期："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.projectInfo.date = $event),
                    placeholder: "验收日期"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.date]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "栋："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.projectInfo.building = $event),
                    placeholder: "栋"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.building]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "单元："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $data.projectInfo.unit = $event),
                    placeholder: "单元"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.unit]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "楼层："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $data.projectInfo.floor = $event),
                    placeholder: "楼层"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.floor]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "房号："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $data.projectInfo.roomNumber = $event),
                    placeholder: "房号"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.roomNumber]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "项目类型："),
                vue.createElementVNode("picker", {
                  class: "input",
                  mode: "selector",
                  range: $data.typeOptions,
                  "range-key": "name",
                  onChange: _cache[9] || (_cache[9] = (...args) => $options.onProjectTypeChange && $options.onProjectTypeChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-text" },
                    vue.toDisplayString($data.projectInfo.type || "选择项目类型"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "项目图标："),
                vue.createElementVNode("view", { class: "icon-wrapper" }, [
                  vue.createElementVNode("image", {
                    src: $data.projectInfo.icon,
                    class: "project-icon",
                    mode: "aspectFit"
                  }, null, 8, ["src"])
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "验收类型："),
                vue.createElementVNode("picker", {
                  class: "input",
                  mode: "selector",
                  range: $data.inspectionTypes,
                  onChange: _cache[10] || (_cache[10] = (...args) => $options.onInspectionTypeChange && $options.onInspectionTypeChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-text" },
                    vue.toDisplayString($data.projectInfo.inspectionType || "选择验收类型"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "验收状态："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $data.projectInfo.inspectionStatus = $event),
                    placeholder: "验收状态"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.inspectionStatus]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "项目质检员："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $data.projectInfo.inspector = $event),
                    placeholder: "项目质检员"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.projectInfo.inspector]
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 预警值设置 "),
          $data.previewData.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "warning-settings"
          }, [
            vue.createElementVNode("view", { class: "info-title" }, "预警值设置"),
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "坡度预警值(mm/M)："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    type: "number",
                    "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $data.warningSettings.slopeWarning = $event),
                    placeholder: "坡度预警值(mm/M)"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.warningSettings.slopeWarning]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-row" }, [
                vue.createElementVNode("text", { class: "input-label" }, "平整度预警值(mm)："),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    type: "number",
                    "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => $data.warningSettings.flatnessWarning = $event),
                    placeholder: "平整度预警值(mm)"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.warningSettings.flatnessWarning]
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 预览区域 "),
          $data.previewData.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "preview-section"
          }, [
            vue.createElementVNode("view", { class: "preview-title" }, "数据预览"),
            vue.createElementVNode("view", { class: "preview-table-container" }, [
              vue.createCommentVNode(" 表头 "),
              vue.createElementVNode("view", { class: "table-header" }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.headers, (header, index) => {
                    return vue.openBlock(), vue.createElementBlock(
                      "view",
                      {
                        class: "table-cell",
                        key: index
                      },
                      vue.toDisplayString(header),
                      1
                      /* TEXT */
                    );
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ]),
              vue.createCommentVNode(" 数据行容器 "),
              vue.createElementVNode("scroll-view", {
                "scroll-y": "",
                class: "table-body"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.previewData, (row, rowIndex) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      class: "table-row",
                      key: rowIndex
                    }, [
                      (vue.openBlock(true), vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(row, (cell, cellIndex) => {
                          return vue.openBlock(), vue.createElementBlock(
                            "view",
                            {
                              class: "table-cell",
                              key: cellIndex
                            },
                            vue.toDisplayString(cell || "-"),
                            1
                            /* TEXT */
                          );
                        }),
                        128
                        /* KEYED_FRAGMENT */
                      ))
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 底部占位，确保内容不被按钮遮挡 "),
          vue.createElementVNode("view", { style: { "height": "120rpx" } })
        ])
      ]),
      vue.createCommentVNode(" 底部按钮 "),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode("button", {
          class: "import-btn",
          disabled: !$options.canImport,
          onClick: _cache[15] || (_cache[15] = (...args) => $options.importData && $options.importData(...args))
        }, " 导入数据 ", 8, ["disabled"])
      ])
    ]);
  }
  const PagesNewProjectCsvCsv = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-a946101b"], ["__file", "D:/nhuProject/智能靠尺/pages/newProject/csv/csv.vue"]]);
  const _sfc_main$4 = {
    data() {
      return {
        inputText: "",
        parsedData: null,
        hasError: false,
        errorMessage: "",
        projectTypes: ["学校", "办公楼", "工业厂房", "公寓小区", "乡镇住宅", "其他"],
        packageTypes: ["坡度", "平整度", "坡度加平整度"],
        inspectionStatus: ["未验收", "已验收"]
      };
    },
    methods: {
      onInput(e) {
        const value = e.detail ? e.detail.value : e.target.value;
        this.inputText = value;
        this.hasError = false;
        this.errorMessage = "";
        this.parsedData = null;
      },
      pasteFromClipboard() {
        uni.getClipboardData({
          success: (res) => {
            if (res.data && res.data.trim()) {
              this.$nextTick(() => {
                this.inputText = res.data.trim();
                this.hasError = false;
                this.errorMessage = "";
                this.parsedData = null;
                uni.showToast({
                  title: "粘贴成功",
                  icon: "success"
                });
              });
            } else {
              uni.showToast({
                title: "剪贴板为空",
                icon: "none"
              });
            }
          },
          fail: () => {
            uni.showToast({
              title: "粘贴失败",
              icon: "none"
            });
          }
        });
      },
      copyExample() {
        const exampleText = `项目名称：衡阳示范小区
项目地址：湖南省衡阳市珠晖区东风路123号
验收日期：2024-03-21
项目类型：公寓小区
验收类型：坡度加平整度
验收状态：未验收
栋：
单元：2单元
楼层：
房号：601
项目质检员：

客厅：A,2.5,1.8
客厅：B,3.2,2.1
卧室1：A,2.8,1.9
卧室2：
厨房：
卫生间：`;
        uni.setClipboardData({
          data: exampleText,
          success: () => {
            uni.showToast({
              title: "示例文本已复制到剪贴板",
              icon: "success"
            });
          },
          fail: () => {
            uni.showToast({
              title: "复制失败",
              icon: "none"
            });
          }
        });
      },
      parseText() {
        if (!this.inputText.trim()) {
          this.showError("请输入项目信息");
          return;
        }
        try {
          const lines = this.inputText.split("\n").filter((line) => line.trim());
          const projectInfo = {};
          const roomData = [];
          let currentSection = "project";
          for (let line of lines) {
            line = line.trim();
            if (!line) {
              continue;
            }
            if (line.includes("：")) {
              const [key, value] = line.split("：", 2);
              const cleanKey = key.trim();
              const cleanValue = value ? value.trim() : "";
              if ([
                "项目名称",
                "项目地址",
                "验收日期",
                "项目类型",
                "验收类型",
                "验收状态",
                "栋",
                "单元",
                "楼层",
                "房号",
                "项目质检员"
              ].includes(cleanKey)) {
                switch (cleanKey) {
                  case "项目名称":
                    projectInfo.title = cleanValue;
                    break;
                  case "项目地址":
                    projectInfo.address = cleanValue;
                    break;
                  case "验收日期":
                    projectInfo.date = cleanValue;
                    break;
                  case "项目类型":
                    projectInfo.typeTag = cleanValue;
                    break;
                  case "验收类型":
                    projectInfo.projectStatus = cleanValue;
                    break;
                  case "验收状态":
                    projectInfo.inspectionStatus = cleanValue;
                    break;
                  case "栋":
                    projectInfo.building = cleanValue;
                    break;
                  case "单元":
                    projectInfo.unit = cleanValue;
                    break;
                  case "楼层":
                    projectInfo.floor = cleanValue;
                    break;
                  case "房号":
                    projectInfo.roomNumber = cleanValue;
                    break;
                  case "项目质检员":
                    projectInfo.inspector = cleanValue;
                    break;
                }
              } else {
                const roomName = cleanKey;
                const parts = cleanValue ? cleanValue.split(",").map((part) => part.trim()) : [];
                roomData.push({
                  room: roomName,
                  wall: parts[0] || "",
                  slope: parts[1] || "",
                  flatness: parts[2] || ""
                });
              }
            }
          }
          const requiredFields = ["title", "address", "date", "typeTag", "projectStatus", "inspectionStatus"];
          for (let field of requiredFields) {
            if (!projectInfo[field]) {
              this.showError(`缺少必填项：${this.getFieldName(field)}`);
              return;
            }
          }
          if (!this.projectTypes.includes(projectInfo.typeTag)) {
            this.showError(`项目类型必须是：${this.projectTypes.join("、")}`);
            return;
          }
          if (!this.packageTypes.includes(projectInfo.projectStatus)) {
            this.showError(`验收类型必须是：${this.packageTypes.join("、")}`);
            return;
          }
          if (!this.inspectionStatus.includes(projectInfo.inspectionStatus)) {
            this.showError(`验收状态必须是：${this.inspectionStatus.join("、")}`);
            return;
          }
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(projectInfo.date)) {
            this.showError("验收日期格式必须为：YYYY-MM-DD");
            return;
          }
          if (roomData.length === 0) {
            this.showError("至少需要输入一个房间");
            return;
          }
          this.parsedData = {
            projectInfo,
            roomData
          };
          this.hasError = false;
          this.errorMessage = "";
          uni.showToast({
            title: "解析成功",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/newProject/text/text.vue:358", "解析失败:", error);
          this.showError("解析失败，请检查格式");
        }
      },
      getFieldName(field) {
        const fieldNames = {
          title: "项目名称",
          address: "项目地址",
          date: "验收日期",
          typeTag: "项目类型",
          projectStatus: "验收类型",
          inspectionStatus: "验收状态"
        };
        return fieldNames[field] || field;
      },
      showError(message) {
        this.hasError = true;
        this.errorMessage = message;
        this.parsedData = null;
      },
      createProject() {
        if (!this.parsedData) {
          uni.showToast({
            title: "请先解析文本",
            icon: "none"
          });
          return;
        }
        const { projectInfo, roomData } = this.parsedData;
        const iconMap = {
          "学校": "/static/image/home1.png",
          "办公楼": "/static/image/home2.png",
          "工业厂房": "/static/image/home3.png",
          "公寓小区": "/static/image/home4.png",
          "乡镇住宅": "/static/image/home5.png",
          "其他": "/static/image/home6.png"
        };
        const values = [
          iconMap[projectInfo.typeTag] || "/static/image/home1.png",
          projectInfo.title,
          projectInfo.address,
          projectInfo.date,
          projectInfo.typeTag,
          projectInfo.building || "",
          projectInfo.unit || "",
          projectInfo.floor || "",
          projectInfo.roomNumber || "",
          projectInfo.inspector || "",
          projectInfo.projectStatus,
          projectInfo.inspectionStatus
        ].map((val) => `'${val}'`).join(", ");
        const sql = `INSERT INTO project (
				icon, title, address, date, type_tag,
				building, unit, floor, room_number, inspector,
				project_status, inspection_status
			) VALUES (${values})`;
        if (!sqliteUtil.isOpen()) {
          sqliteUtil.openSqlite().then(() => this.insertProject(sql, roomData));
        } else {
          this.insertProject(sql, roomData);
        }
      },
      insertProject(sql, roomData) {
        plus.sqlite.executeSql({
          name: sqliteUtil.dbName,
          sql,
          success: () => {
            formatAppLog("log", "at pages/newProject/text/text.vue:435", "项目插入成功");
            plus.sqlite.selectSql({
              name: sqliteUtil.dbName,
              sql: "SELECT last_insert_rowid() as id",
              success: (result) => {
                const projectId = result[0].id;
                this.insertRoomData(projectId, roomData);
              },
              fail: (e) => {
                formatAppLog("error", "at pages/newProject/text/text.vue:445", "获取项目ID失败", e);
                uni.showToast({ title: "创建项目失败", icon: "none" });
              }
            });
          },
          fail: (e) => {
            formatAppLog("error", "at pages/newProject/text/text.vue:451", "项目插入失败", e);
            uni.showToast({ title: "创建项目失败", icon: "none" });
          }
        });
      },
      insertRoomData(projectId, roomData) {
        const uniqueSections = [...new Set(roomData.map((room) => room.room))];
        let sectionsInserted = 0;
        let roomsInserted = 0;
        const totalSections = uniqueSections.length;
        const totalRooms = roomData.length;
        const insertSection = (section, index) => {
          const sectionSql = `INSERT INTO sections (
					project_id, name, sort_order
				) VALUES (${projectId}, '${section}', ${index})`;
          plus.sqlite.executeSql({
            name: sqliteUtil.dbName,
            sql: sectionSql,
            success: () => {
              sectionsInserted++;
              if (sectionsInserted === totalSections) {
                roomData.forEach((room) => insertRoom(room));
              }
            },
            fail: (e) => {
              formatAppLog("error", "at pages/newProject/text/text.vue:482", "房间数据插入失败", e);
              uni.showToast({ title: "房间数据插入失败", icon: "none" });
            }
          });
        };
        const insertRoom = (room) => {
          const wallName = room.wall || "默认墙体";
          const roomSql = `INSERT INTO wall_data (
					project_id, section, wall_name, slope, flatness
				) VALUES (${projectId}, '${room.room || ""}', '${wallName}', '${room.slope || ""}', '${room.flatness || ""}')`;
          plus.sqlite.executeSql({
            name: sqliteUtil.dbName,
            sql: roomSql,
            success: () => {
              roomsInserted++;
              if (roomsInserted === totalRooms) {
                uni.showToast({ title: "添加成功", icon: "success" });
                setTimeout(() => uni.reLaunch({ url: "/pages/index/index" }), 1e3);
              }
            },
            fail: (e) => {
              formatAppLog("error", "at pages/newProject/text/text.vue:505", "墙体数据插入失败", e);
              uni.showToast({ title: "墙体数据插入失败", icon: "none" });
            }
          });
        };
        uniqueSections.forEach((section, index) => insertSection(section, index));
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("scroll-view", {
        class: "scroll-container",
        "scroll-y": ""
      }, [
        vue.createCommentVNode(" 格式说明 "),
        vue.createElementVNode("view", { class: "format-guide" }, [
          vue.createElementVNode("view", { class: "guide-header" }, [
            vue.createElementVNode("text", { class: "guide-icon" }, "📋"),
            vue.createElementVNode("text", { class: "guide-title" }, "格式说明")
          ]),
          vue.createElementVNode("view", { class: "guide-content" }, [
            vue.createElementVNode("view", { class: "section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "📋 第一部分：基本信息"),
              vue.createElementVNode("text", { class: "required" }, "🔴 必填项："),
              vue.createElementVNode("text", { class: "field-item" }, "• 项目名称：xxx"),
              vue.createElementVNode("text", { class: "field-item" }, "• 项目地址：xxx"),
              vue.createElementVNode("text", { class: "field-item" }, "• 验收日期：YYYY-MM-DD"),
              vue.createElementVNode("text", { class: "field-item" }, "• 项目类型：[学校/办公楼/工业厂房/公寓小区/乡镇住宅/其他]"),
              vue.createElementVNode("text", { class: "field-item" }, "• 验收类型：[坡度/平整度/坡度加平整度]"),
              vue.createElementVNode("text", { class: "field-item" }, "• 验收状态：[未验收/已验收]"),
              vue.createElementVNode("text", { class: "optional" }, "🟡 选填项："),
              vue.createElementVNode("text", { class: "field-item" }, "• 栋：xx栋"),
              vue.createElementVNode("text", { class: "field-item" }, "• 单元：xx单元"),
              vue.createElementVNode("text", { class: "field-item" }, "• 楼层：xx层"),
              vue.createElementVNode("text", { class: "field-item" }, "• 房号：xxx"),
              vue.createElementVNode("text", { class: "field-item" }, "• 项目质检员：xxx")
            ]),
            vue.createElementVNode("view", { class: "section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "🏠 第二部分：房间和墙体数据"),
              vue.createElementVNode("text", { class: "field-item" }, "• 房间名称：墙体编号,坡度值,平整度值"),
              vue.createElementVNode("text", { class: "note" }, "💡 房间名称和墙体数据均为选填，可以只填写房间名称")
            ])
          ])
        ]),
        vue.createCommentVNode(" 示例文本 "),
        vue.createElementVNode("view", { class: "example-section" }, [
          vue.createElementVNode("view", { class: "example-header" }, [
            vue.createElementVNode("text", { class: "example-icon" }, "📄"),
            vue.createElementVNode("text", { class: "example-title" }, "示例文本")
          ]),
          vue.createElementVNode("view", {
            class: "example-content",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.copyExample && $options.copyExample(...args))
          }, [
            vue.createElementVNode("text", { class: "example-line" }, "项目名称：衡阳示范小区"),
            vue.createElementVNode("text", { class: "example-line" }, "项目地址：湖南省衡阳市珠晖区东风路123号"),
            vue.createElementVNode("text", { class: "example-line" }, "验收日期：2024-03-21"),
            vue.createElementVNode("text", { class: "example-line" }, "项目类型：公寓小区"),
            vue.createElementVNode("text", { class: "example-line" }, "验收类型：坡度加平整度"),
            vue.createElementVNode("text", { class: "example-line" }, "验收状态：未验收"),
            vue.createElementVNode("text", { class: "example-line" }, "栋："),
            vue.createElementVNode("text", { class: "example-line" }, "单元：2单元"),
            vue.createElementVNode("text", { class: "example-line" }, "楼层："),
            vue.createElementVNode("text", { class: "example-line" }, "房号：601"),
            vue.createElementVNode("text", { class: "example-line" }, "项目质检员："),
            vue.createElementVNode("text", { class: "example-line" }),
            vue.createElementVNode("text", { class: "example-line" }, "客厅：A,2.5,1.8"),
            vue.createElementVNode("text", { class: "example-line" }, "客厅：B,3.2,2.1"),
            vue.createElementVNode("text", { class: "example-line" }, "卧室1：A,2.8,1.9"),
            vue.createElementVNode("text", { class: "example-line" }, "卧室2："),
            vue.createElementVNode("text", { class: "example-line" }, "厨房："),
            vue.createElementVNode("text", { class: "example-line" }, "卫生间：")
          ]),
          vue.createElementVNode("text", { class: "copy-tip" }, "👆 点击示例文本可复制到剪贴板")
        ]),
        vue.createCommentVNode(" 文本输入区域 "),
        vue.createElementVNode("view", { class: "input-section" }, [
          vue.createElementVNode("view", { class: "input-header" }, [
            vue.createElementVNode("view", { class: "input-title-group" }, [
              vue.createElementVNode("text", { class: "input-icon" }, "✏️"),
              vue.createElementVNode("text", { class: "input-title" }, "项目信息输入")
            ]),
            vue.createElementVNode("button", {
              class: "paste-btn",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.pasteFromClipboard && $options.pasteFromClipboard(...args))
            }, [
              vue.createElementVNode("text", null, "一键粘贴")
            ])
          ]),
          vue.createElementVNode("textarea", {
            class: vue.normalizeClass(["text-input", { "error": $data.hasError }]),
            value: $data.inputText,
            placeholder: "请粘贴或输入项目信息...",
            onInput: _cache[2] || (_cache[2] = (...args) => $options.onInput && $options.onInput(...args)),
            "auto-height": true,
            maxlength: -1
          }, null, 42, ["value"]),
          $data.errorMessage ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "error-message"
          }, [
            vue.createElementVNode("text", { class: "error-icon" }, "⚠️"),
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString($data.errorMessage),
              1
              /* TEXT */
            )
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        vue.createCommentVNode(" 预览区域 "),
        $data.parsedData ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "preview-section"
        }, [
          vue.createElementVNode("view", { class: "preview-header" }, [
            vue.createElementVNode("text", { class: "preview-icon" }, "👁️"),
            vue.createElementVNode("text", { class: "preview-title" }, "解析结果预览")
          ]),
          vue.createElementVNode("view", { class: "preview-content" }, [
            vue.createElementVNode("view", { class: "project-info" }, [
              vue.createElementVNode("text", { class: "info-title" }, "📋 项目信息"),
              vue.createElementVNode(
                "text",
                { class: "info-item" },
                "项目名称：" + vue.toDisplayString($data.parsedData.projectInfo.title),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "info-item" },
                "项目地址：" + vue.toDisplayString($data.parsedData.projectInfo.address),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "info-item" },
                "验收日期：" + vue.toDisplayString($data.parsedData.projectInfo.date),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "info-item" },
                "项目类型：" + vue.toDisplayString($data.parsedData.projectInfo.typeTag),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "info-item" },
                "验收类型：" + vue.toDisplayString($data.parsedData.projectInfo.projectStatus),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "info-item" },
                "验收状态：" + vue.toDisplayString($data.parsedData.projectInfo.inspectionStatus),
                1
                /* TEXT */
              ),
              $data.parsedData.projectInfo.building ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "info-item"
                },
                "栋：" + vue.toDisplayString($data.parsedData.projectInfo.building),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true),
              $data.parsedData.projectInfo.unit ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 1,
                  class: "info-item"
                },
                "单元：" + vue.toDisplayString($data.parsedData.projectInfo.unit),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true),
              $data.parsedData.projectInfo.floor ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 2,
                  class: "info-item"
                },
                "楼层：" + vue.toDisplayString($data.parsedData.projectInfo.floor),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true),
              $data.parsedData.projectInfo.roomNumber ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 3,
                  class: "info-item"
                },
                "房号：" + vue.toDisplayString($data.parsedData.projectInfo.roomNumber),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true),
              $data.parsedData.projectInfo.inspector ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 4,
                  class: "info-item"
                },
                "项目质检员：" + vue.toDisplayString($data.parsedData.projectInfo.inspector),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "room-data" }, [
              vue.createElementVNode("text", { class: "info-title" }, "🏠 房间数据"),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.parsedData.roomData, (room, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: index,
                      class: "info-item"
                    },
                    vue.toDisplayString(room.room || "未分类") + "：" + vue.toDisplayString(room.wall || "") + vue.toDisplayString(room.slope ? "," + room.slope : "") + vue.toDisplayString(room.flatness ? "," + room.flatness : ""),
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true),
        vue.createCommentVNode(" 底部占位区域，防止内容被底部按钮遮挡 "),
        vue.createElementVNode("view", { class: "bottom-spacer" })
      ]),
      vue.createCommentVNode(" 底部按钮 "),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode("button", {
          class: "preview-btn",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.parseText && $options.parseText(...args)),
          disabled: !$data.inputText.trim()
        }, [
          vue.createElementVNode("text", null, "预览解析")
        ], 8, ["disabled"]),
        vue.createElementVNode("button", {
          class: "create-btn",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.createProject && $options.createProject(...args)),
          disabled: !$data.parsedData
        }, [
          vue.createElementVNode("text", null, "创建项目")
        ], 8, ["disabled"])
      ])
    ]);
  }
  const PagesNewProjectTextText = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-70560217"], ["__file", "D:/nhuProject/智能靠尺/pages/newProject/text/text.vue"]]);
  const _sfc_main$3 = {
    data() {
      return {
        projectId: null,
        typeOptions: [
          { name: "学校", icon: "/static/image/home1.png" },
          { name: "办公楼", icon: "/static/image/home2.png" },
          { name: "工业厂房", icon: "/static/image/home3.png" },
          { name: "公寓小区", icon: "/static/image/home4.png" },
          { name: "乡镇住宅", icon: "/static/image/home5.png" },
          { name: "其他", icon: "/static/image/home6.png" }
        ],
        packageOptions: ["坡度", "平整度", "坡度加平整度"],
        inspectionStatusOptions: ["未验收", "已验收"],
        projectFields: [
          { key: "title", label: "项目名称" },
          { key: "address", label: "项目地址" },
          { key: "date", label: "验收日期" },
          { key: "building", label: "栋" },
          { key: "unit", label: "单元" },
          { key: "floor", label: "楼层" },
          { key: "room_number", label: "房号" },
          { key: "inspector", label: "质检员" }
        ],
        form: {
          icon: "/static/image/home1.png",
          type_tag: "",
          title: "",
          address: "",
          date: "",
          building: "",
          unit: "",
          floor: "",
          room_number: "",
          inspector: "",
          project_status: "坡度加平整度",
          inspection_status: "未验收"
        }
      };
    },
    onLoad(options) {
      if (options.id) {
        this.projectId = options.id;
        this.loadProjectById(this.projectId);
      }
    },
    methods: {
      onTypeSelect(index) {
        const selected = this.typeOptions[index];
        this.form.type_tag = selected.name;
        this.form.icon = selected.icon;
      },
      onDateChange(e) {
        this.form.date = e.detail.value;
      },
      onPackageChange(e) {
        this.form.project_status = this.packageOptions[e.detail.value];
      },
      onInspectionStatusChange(e) {
        this.form.inspection_status = this.inspectionStatusOptions[e.detail.value];
      },
      async getLocation() {
        const that = this;
        uni.getLocation({
          type: "wgs84",
          success(res) {
            const qqMapKey = "GN4BZ-LSR64-7DAUI-DB246-CUPM3-5HBMM";
            uni.request({
              url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${res.latitude},${res.longitude}&key=${qqMapKey}`,
              success(resp) {
                if (resp.data && resp.data.result) {
                  const recommend = resp.data.result.formatted_addresses && resp.data.result.formatted_addresses.standard_address;
                  const address = recommend || resp.data.result.address;
                  that.form.address = address;
                } else {
                  uni.showToast({ title: "定位失败", icon: "none" });
                }
              },
              fail() {
                uni.showToast({ title: "定位失败", icon: "none" });
              }
            });
          },
          fail() {
            uni.showToast({ title: "获取定位失败", icon: "none" });
          }
        });
      },
      loadProjectById(id) {
        const sql = `SELECT * FROM project WHERE id = '${id}'`;
        if (!sqliteUtil.isOpen()) {
          sqliteUtil.openSqlite().then(() => this.fetchProject(sql));
        } else {
          this.fetchProject(sql);
        }
      },
      fetchProject(sql) {
        plus.sqlite.selectSql({
          name: sqliteUtil.dbName,
          sql,
          success: (res) => {
            if (res && res.length > 0) {
              const project = res[0];
              for (const key in this.form) {
                if (project[key] !== void 0) {
                  this.form[key] = project[key];
                }
              }
            }
          },
          fail: (err) => {
            formatAppLog("error", "at pages/inProject/edit/edit.vue:189", "查询失败", err);
            uni.showToast({ title: "加载失败", icon: "none" });
          }
        });
      },
      submit() {
        if (!this.form.title.trim()) {
          uni.showToast({ title: "请输入项目名称", icon: "none" });
          return;
        }
        if (!this.form.address.trim()) {
          uni.showToast({ title: "请输入项目地址", icon: "none" });
          return;
        }
        if (!this.form.date.trim()) {
          uni.showToast({ title: "请输入验收日期", icon: "none" });
          return;
        }
        const sql = `
				UPDATE project SET
					icon='${this.form.icon}',
					title='${this.form.title}',
					address='${this.form.address}',
					date='${this.form.date}',
					type_tag='${this.form.type_tag}',
					building='${this.form.building}',
					unit='${this.form.unit}',
					floor='${this.form.floor}',
					room_number='${this.form.room_number}',
					inspector='${this.form.inspector}',
					project_status='${this.form.project_status}',
					inspection_status='${this.form.inspection_status}'
				WHERE id = '${this.projectId}'
			`;
        if (!sqliteUtil.isOpen()) {
          sqliteUtil.openSqlite().then(() => this.updateProject(sql));
        } else {
          this.updateProject(sql);
        }
      },
      updateProject(sql) {
        plus.sqlite.executeSql({
          name: sqliteUtil.dbName,
          sql,
          success: () => {
            formatAppLog("log", "at pages/inProject/edit/edit.vue:236", "更新成功");
            uni.showToast({ title: "更新成功", icon: "success" });
            setTimeout(() => uni.navigateBack(), 1e3);
          },
          fail: (e) => {
            formatAppLog("error", "at pages/inProject/edit/edit.vue:241", "更新失败", e);
            uni.showToast({ title: "更新失败", icon: "none" });
          }
        });
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "main" }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "true",
        class: "scroll-view"
      }, [
        vue.createElementVNode("view", { class: "container" }, [
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("view", { class: "form-title" }, "项目信息"),
            vue.createElementVNode("view", { class: "form-grid" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.projectFields, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      class: vue.normalizeClass(["form-item", { "full-width": item.key === "address" || item.key === "title" }]),
                      key: item.key
                    },
                    [
                      item.key === "address" ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 0,
                        class: "label-with-button"
                      }, [
                        vue.createElementVNode(
                          "text",
                          { class: "label" },
                          vue.toDisplayString(item.label),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("button", {
                          class: "location-btn",
                          type: "default",
                          size: "mini",
                          onClick: _cache[0] || (_cache[0] = (...args) => $options.getLocation && $options.getLocation(...args))
                        }, [
                          vue.createElementVNode("text", { class: "location-text" }, "获取定位")
                        ])
                      ])) : (vue.openBlock(), vue.createElementBlock(
                        "text",
                        {
                          key: 1,
                          class: "label"
                        },
                        vue.toDisplayString(item.label),
                        1
                        /* TEXT */
                      )),
                      item.key === "address" ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 2,
                        class: "address-container"
                      }, [
                        vue.withDirectives(vue.createElementVNode("input", {
                          class: "input address-input",
                          "onUpdate:modelValue": ($event) => $data.form[item.key] = $event,
                          placeholder: "请输入" + item.label
                        }, null, 8, ["onUpdate:modelValue", "placeholder"]), [
                          [vue.vModelText, $data.form[item.key]]
                        ])
                      ])) : item.key === "date" ? (vue.openBlock(), vue.createElementBlock("picker", {
                        key: 3,
                        mode: "date",
                        value: $data.form[item.key],
                        onChange: _cache[1] || (_cache[1] = (...args) => $options.onDateChange && $options.onDateChange(...args))
                      }, [
                        vue.createElementVNode(
                          "view",
                          { class: "picker-view" },
                          vue.toDisplayString($data.form[item.key] || "请选择" + item.label),
                          1
                          /* TEXT */
                        )
                      ], 40, ["value"])) : vue.withDirectives((vue.openBlock(), vue.createElementBlock("input", {
                        key: 4,
                        class: "input",
                        "onUpdate:modelValue": ($event) => $data.form[item.key] = $event,
                        placeholder: "请输入" + item.label
                      }, null, 8, ["onUpdate:modelValue", "placeholder"])), [
                        [vue.vModelText, $data.form[item.key]]
                      ])
                    ],
                    2
                    /* CLASS */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("view", { class: "form-title" }, "项目类型"),
            vue.createElementVNode("view", { class: "type-grid" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.typeOptions, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: item.name,
                    class: vue.normalizeClass(["type-item", { "active": $data.form.type_tag === item.name }]),
                    onClick: ($event) => $options.onTypeSelect(index)
                  }, [
                    vue.createElementVNode("image", {
                      src: item.icon,
                      class: "type-icon",
                      mode: "aspectFit"
                    }, null, 8, ["src"]),
                    vue.createElementVNode(
                      "text",
                      { class: "type-name" },
                      vue.toDisplayString(item.name),
                      1
                      /* TEXT */
                    )
                  ], 10, ["onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("view", { class: "form-title" }, "状态信息"),
            vue.createElementVNode("view", { class: "form-grid" }, [
              vue.createElementVNode("view", { class: "form-item" }, [
                vue.createElementVNode("text", { class: "label" }, "验收类型"),
                vue.createElementVNode("picker", {
                  range: $data.packageOptions,
                  onChange: _cache[2] || (_cache[2] = (...args) => $options.onPackageChange && $options.onPackageChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-view" },
                    vue.toDisplayString($data.form.project_status || "请选择验收类型"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "form-item" }, [
                vue.createElementVNode("text", { class: "label" }, "验收状态"),
                vue.createElementVNode("picker", {
                  range: $data.inspectionStatusOptions,
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.onInspectionStatusChange && $options.onInspectionStatusChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-view" },
                    vue.toDisplayString($data.form.inspection_status || "请选择验收状态"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ])
            ])
          ])
        ])
      ]),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.submit && $options.submit(...args))
        }, "修改项目")
      ])
    ]);
  }
  const PagesInProjectEditEdit = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__file", "D:/nhuProject/智能靠尺/pages/inProject/edit/edit.vue"]]);
  const _sfc_main$2 = {
    data() {
      return {
        fileName: "",
        fileSize: "",
        createTime: "",
        content: "",
        tableHeaders: ["房间", "墙体", "坡度(mm/M)", "平整度(mm)"],
        tableData: [],
        projectInfo: null,
        warningSettings: null,
        savedFilePath: ""
      };
    },
    computed: {
      formattedProjectInfo() {
        if (!this.projectInfo)
          return {};
        return {
          "项目名称": this.projectInfo.title,
          "项目地址": this.projectInfo.address,
          "验收日期": this.projectInfo.date,
          "栋": this.projectInfo.building,
          "单元": this.projectInfo.unit,
          "楼层": this.projectInfo.floor,
          "房号": this.projectInfo.roomNumber,
          "项目类型": this.projectInfo.typeTag,
          "验收类型": this.projectInfo.projectStatus,
          "验收状态": this.projectInfo.inspectionStatus,
          "项目质检员": this.projectInfo.inspector
        };
      }
    },
    onLoad(options) {
      if (plus.os.name.toLowerCase() === "android") {
        plus.android.requestPermissions(
          ["android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.READ_EXTERNAL_STORAGE"],
          function(resultObj) {
            if (resultObj.granted.length === 2) {
              formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:143", "存储权限已授予");
            } else {
              uni.showToast({
                title: "请授予存储权限以保存文件",
                icon: "none",
                duration: 2e3
              });
            }
          },
          function(error) {
            formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:153", "请求权限失败:", error);
          }
        );
      }
      if (options.data) {
        try {
          const data = JSON.parse(decodeURIComponent(options.data));
          this.content = data.content;
          this.fileName = data.fileName;
          this.createTime = data.createTime;
          this.projectInfo = data.projectInfo;
          this.warningSettings = data.warningSettings;
          this.fileSize = this.calculateFileSize(this.content);
          this.setTableHeadersBasedOnProjectInfo();
          this.parseCSVToTable(this.content);
          if (this.tableData.length === 0 || this.tableData.length === 1 && this.tableData[0].includes("暂无数据")) {
            uni.showToast({
              title: "没有符合条件的数据",
              icon: "none",
              duration: 2e3
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:185", "解析数据失败:", error);
          uni.showToast({
            title: "数据加载失败",
            icon: "none"
          });
        }
      }
    },
    methods: {
      calculateFileSize(content) {
        return csvUtils.calculateFileSize(content);
      },
      parseCSVToTable(csvContent) {
        var _a;
        try {
          const result = csvUtils.parseCSVContent(csvContent);
          if (result) {
            const projectType = (_a = this.projectInfo) == null ? void 0 : _a.projectStatus;
            if (projectType) {
              let filteredHeaders = ["房间", "墙体"];
              let headerIndices = [0, 1];
              if (projectType === "坡度") {
                filteredHeaders.push("坡度(mm/M)");
                if (result.headers.includes("坡度(mm/M)")) {
                  headerIndices.push(result.headers.indexOf("坡度(mm/M)"));
                }
              } else if (projectType === "平整度") {
                filteredHeaders.push("平整度(mm)");
                if (result.headers.includes("平整度(mm)")) {
                  headerIndices.push(result.headers.indexOf("平整度(mm)"));
                }
              } else if (projectType === "坡度加平整度") {
                if (result.headers.includes("坡度(mm/M)")) {
                  filteredHeaders.push("坡度(mm/M)");
                  headerIndices.push(result.headers.indexOf("坡度(mm/M)"));
                }
                if (result.headers.includes("平整度(mm)")) {
                  filteredHeaders.push("平整度(mm)");
                  headerIndices.push(result.headers.indexOf("平整度(mm)"));
                }
              }
              const filteredData = result.tableData.map((row) => {
                return headerIndices.map((index) => {
                  return index < row.length ? row[index] : "";
                });
              }).filter((row) => {
                if (row.length <= 2)
                  return false;
                if (row[0] === "" || row[1] === "")
                  return false;
                if (projectType === "坡度") {
                  return row[2] && row[2] !== "";
                } else if (projectType === "平整度") {
                  return row[2] && row[2] !== "";
                } else if (projectType === "坡度加平整度") {
                  return row[2] && row[2] !== "" || row[3] && row[3] !== "";
                }
                return false;
              });
              this.tableHeaders = filteredHeaders;
              this.tableData = filteredData;
              if (this.tableData.length === 0) {
                const emptyRow = ["暂无数据"];
                while (emptyRow.length < this.tableHeaders.length) {
                  emptyRow.push("");
                }
                this.tableData = [emptyRow];
              }
            } else {
              this.tableHeaders = result.headers;
              this.tableData = result.tableData;
            }
          } else {
            this.setTableHeadersBasedOnProjectInfo();
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:272", "解析CSV数据失败:", error);
          this.setTableHeadersBasedOnProjectInfo();
        }
      },
      setTableHeadersBasedOnProjectInfo() {
        if (!this.projectInfo) {
          this.tableHeaders = ["房间", "墙体"];
          return;
        }
        const inspectionType = this.projectInfo.projectStatus;
        let headers = ["房间", "墙体"];
        if (inspectionType === "坡度") {
          headers.push("坡度(mm/M)");
        } else if (inspectionType === "平整度") {
          headers.push("平整度(mm)");
        } else if (inspectionType === "坡度加平整度") {
          headers.push("坡度(mm/M)", "平整度(mm)");
        }
        this.tableHeaders = headers;
      },
      async saveAndShare() {
        try {
          const csvContent = csvUtils.processCSVContent(this.content);
          if (typeof plus !== "undefined") {
            const fileName = this.fileName;
            let filePath = "";
            try {
              if (plus.os.name.toLowerCase() === "android") {
                const main = plus.android.runtimeMainActivity();
                const Context = plus.android.importClass("android.content.Context");
                const File = plus.android.importClass("java.io.File");
                const FileOutputStream = plus.android.importClass("java.io.FileOutputStream");
                const filesDir = main.getExternalFilesDir(null);
                const appDir = new File(filesDir, "exports");
                if (!appDir.exists()) {
                  appDir.mkdirs();
                }
                const file = new File(appDir, fileName);
                filePath = file.getAbsolutePath();
                formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:328", "准备写入的内容长度:", csvContent.length);
                try {
                  const FileOutputStream2 = plus.android.importClass("java.io.FileOutputStream");
                  const OutputStreamWriter = plus.android.importClass("java.io.OutputStreamWriter");
                  const BufferedWriter = plus.android.importClass("java.io.BufferedWriter");
                  const fos = new FileOutputStream2(file);
                  const writer = new BufferedWriter(new OutputStreamWriter(fos, "GBK"));
                  writer.write(csvContent);
                  writer.flush();
                  writer.close();
                  const FileInputStream = plus.android.importClass("java.io.FileInputStream");
                  const InputStreamReader = plus.android.importClass("java.io.InputStreamReader");
                  const BufferedReader = plus.android.importClass("java.io.BufferedReader");
                  const fis = new FileInputStream(file);
                  const reader = new BufferedReader(new InputStreamReader(fis, "GBK"));
                  const StringBuilder = plus.android.importClass("java.lang.StringBuilder");
                  const sb = new StringBuilder();
                  let line;
                  while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                  }
                  reader.close();
                  fis.close();
                  const fileContent = sb.toString();
                  formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:360", "文件写入后的内容长度:", fileContent.length);
                  if (fileContent.length === 0) {
                    throw new Error("文件写入后内容为空");
                  }
                } catch (writeError) {
                  formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:365", "文件写入失败:", writeError);
                  throw writeError;
                }
                formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:369", "文件保存路径:", filePath);
                this.savedFilePath = filePath;
                try {
                  const Intent = plus.android.importClass("android.content.Intent");
                  const FileProvider = plus.android.importClass("androidx.core.content.FileProvider");
                  const shareIntent = new Intent(Intent.ACTION_SEND);
                  shareIntent.setType("text/csv");
                  const authority = main.getPackageName() + ".fileprovider";
                  formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:381", "FileProvider authority:", authority);
                  const contentUri = FileProvider.getUriForFile(main, authority, file);
                  formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:385", "文件大小:", file.length(), "bytes");
                  shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                  shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                  const chooser = Intent.createChooser(shareIntent, "分享文件");
                  chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                  main.startActivity(chooser);
                  uni.showToast({
                    title: "请选择分享方式",
                    icon: "none"
                  });
                } catch (shareError) {
                  formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:399", "创建分享Intent失败:", shareError);
                  try {
                    const Environment = plus.android.importClass("android.os.Environment");
                    const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    const targetFile = new File(downloadDir, fileName);
                    const source = new File(filePath);
                    const FileInputStream = plus.android.importClass("java.io.FileInputStream");
                    const FileOutputStream2 = plus.android.importClass("java.io.FileOutputStream");
                    const fis = new FileInputStream(source);
                    const fos = new FileOutputStream2(targetFile);
                    const buffer = new plus.android.invoke("byte[]", 1024);
                    let length;
                    while ((length = fis.read(buffer)) > 0) {
                      fos.write(buffer, 0, length);
                    }
                    fos.close();
                    fis.close();
                    const copiedFileSize = targetFile.length();
                    formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:422", "复制后的文件大小:", copiedFileSize, "bytes");
                    if (copiedFileSize > 0) {
                      uni.showToast({
                        title: "文件已保存到下载目录",
                        icon: "success"
                      });
                      plus.runtime.openFile(targetFile.getAbsolutePath());
                    } else {
                      throw new Error("复制后的文件为空");
                    }
                  } catch (copyError) {
                    formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:436", "复制文件失败:", copyError);
                    uni.showToast({
                      title: "无法保存文件",
                      icon: "none"
                    });
                  }
                }
              } else {
                const publicDir = plus.io.convertLocalFileSystemURL("_doc");
                await new Promise((resolve, reject) => {
                  plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
                    fs.root.getDirectory("exports", { create: true }, (dirEntry) => {
                      resolve(dirEntry);
                    }, reject);
                  }, reject);
                });
                filePath = publicDir + "/exports/" + fileName;
                const fileEntry = await new Promise((resolve, reject) => {
                  plus.io.resolveLocalFileSystemURL("_doc/exports/", (entry) => {
                    entry.getFile(fileName, { create: true }, (fileEntry2) => {
                      resolve(fileEntry2);
                    }, reject);
                  }, reject);
                });
                await new Promise((resolve, reject) => {
                  fileEntry.createWriter((writer) => {
                    writer.onwrite = resolve;
                    writer.onerror = reject;
                    writer.write(csvContent);
                  }, reject);
                });
                this.savedFilePath = filePath;
                plus.share.sendWithSystem({
                  type: "file",
                  filePath: this.savedFilePath,
                  success: () => {
                    uni.showToast({
                      title: "分享成功",
                      icon: "success"
                    });
                  },
                  fail: (e) => {
                    formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:486", "分享失败:", e);
                    uni.showToast({
                      title: "分享失败",
                      icon: "none"
                    });
                  }
                });
              }
            } catch (error) {
              formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:495", "分享文件失败:", error);
              uni.showToast({
                title: "分享失败，请重试",
                icon: "none",
                duration: 2e3
              });
            }
          } else {
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = this.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            uni.showToast({
              title: "文件已下载",
              icon: "success"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:519", "保存或分享文件失败:", error);
          uni.showToast({
            title: "操作失败，请检查存储权限和剩余空间",
            icon: "none",
            duration: 2e3
          });
        }
      },
      uploadToCloud() {
        uni.showToast({
          title: "云端上传功能开发中",
          icon: "none"
        });
      },
      copyContent() {
        try {
          const csvContent = csvUtils.processCSVContent(this.content);
          uni.setClipboardData({
            data: csvContent,
            success: () => {
              uni.showToast({
                title: "已复制到剪贴板",
                icon: "success"
              });
            },
            fail: () => {
              uni.showToast({
                title: "复制失败",
                icon: "none"
              });
            }
          });
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:556", "复制内容失败:", error);
          uni.showToast({
            title: "复制失败",
            icon: "none"
          });
        }
      },
      viewFile() {
        try {
          const csvContent = csvUtils.processCSVContent(this.content);
          if (typeof plus === "undefined") {
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            window.open(url);
            URL.revokeObjectURL(url);
            return;
          }
          const fileName = this.fileName;
          const filePath = "_downloads/" + fileName;
          try {
            plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
              entry.remove(() => {
                formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:585", "已删除旧文件");
                this.createAndOpenFile(csvContent, fileName);
              }, (e) => {
                formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:589", "删除旧文件失败:", e);
                this.createAndOpenFile(csvContent, fileName);
              });
            }, (e) => {
              formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:594", "文件不存在，直接创建新文件");
              this.createAndOpenFile(csvContent, fileName);
            });
          } catch (e) {
            formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:599", "文件操作失败:", e);
            uni.showToast({
              title: "文件操作失败",
              icon: "none"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:606", "查看文件失败:", error);
          uni.showToast({
            title: "查看文件失败",
            icon: "none"
          });
        }
      },
      // 创建并打开文件的辅助方法
      createAndOpenFile(content, fileName) {
        const filePath = "_downloads/" + fileName;
        plus.io.resolveLocalFileSystemURL("_downloads/", (entry) => {
          entry.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.createWriter((writer) => {
              writer.onwrite = () => {
                formatAppLog("log", "at pages/newProject/csv/preview/preview.vue:621", "文件写入成功");
                plus.runtime.openFile(filePath, "", (e) => {
                  formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:624", "打开文件失败:", e);
                  uni.showToast({
                    title: "没有找到可以打开此文件的应用程序",
                    icon: "none"
                  });
                });
              };
              writer.onerror = (e) => {
                formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:632", "文件写入失败:", e);
                uni.showToast({
                  title: "文件写入失败",
                  icon: "none"
                });
              };
              writer.write(content);
            }, (e) => {
              formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:640", "创建文件写入器失败:", e);
              uni.showToast({
                title: "文件操作失败",
                icon: "none"
              });
            });
          }, (e) => {
            formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:647", "创建文件失败:", e);
            uni.showToast({
              title: "文件创建失败",
              icon: "none"
            });
          });
        }, (e) => {
          formatAppLog("error", "at pages/newProject/csv/preview/preview.vue:654", "获取下载目录失败:", e);
          uni.showToast({
            title: "获取存储目录失败",
            icon: "none"
          });
        });
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部标题和说明 "),
      vue.createCommentVNode(" 文件信息 "),
      vue.createElementVNode("view", { class: "file-info" }, [
        vue.createElementVNode("view", { class: "info-title" }, "文件信息："),
        vue.createElementVNode("view", { class: "info-item" }, [
          vue.createElementVNode("text", { class: "label" }, "名称："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.fileName),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "info-item" }, [
          vue.createElementVNode("text", { class: "label" }, "大小："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.fileSize),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "info-item" }, [
          vue.createElementVNode("text", { class: "label" }, "创建时间："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.createTime),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createCommentVNode(" 项目信息表格 "),
      vue.createElementVNode("view", { class: "table-section" }, [
        vue.createElementVNode("view", { class: "section-title" }, "项目信息"),
        vue.createElementVNode("view", { class: "table-wrapper" }, [
          vue.createElementVNode("table", { class: "info-table" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.formattedProjectInfo, (value, key) => {
                return vue.openBlock(), vue.createElementBlock("tr", { key }, [
                  vue.createElementVNode(
                    "td",
                    { class: "label-cell" },
                    vue.toDisplayString(key) + "：",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "td",
                    { class: "value-cell" },
                    vue.toDisplayString(value),
                    1
                    /* TEXT */
                  )
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ]),
      vue.createCommentVNode(" 预警设置表格 "),
      $data.warningSettings ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "table-section"
      }, [
        vue.createElementVNode("view", { class: "section-title" }, "预警设置"),
        vue.createElementVNode("view", { class: "table-wrapper" }, [
          vue.createElementVNode("table", { class: "info-table" }, [
            $data.projectInfo.projectStatus === "坡度" || $data.projectInfo.projectStatus === "坡度加平整度" ? (vue.openBlock(), vue.createElementBlock("tr", { key: 0 }, [
              vue.createElementVNode("td", { class: "label-cell" }, "坡度预警值(mm/M)："),
              vue.createElementVNode(
                "td",
                { class: "value-cell" },
                vue.toDisplayString($data.warningSettings.slopeWarning || "未设置"),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true),
            $data.projectInfo.projectStatus === "平整度" || $data.projectInfo.projectStatus === "坡度加平整度" ? (vue.openBlock(), vue.createElementBlock("tr", { key: 1 }, [
              vue.createElementVNode("td", { class: "label-cell" }, "平整度预警值(mm)："),
              vue.createElementVNode(
                "td",
                { class: "value-cell" },
                vue.toDisplayString($data.warningSettings.flatnessWarning || "未设置"),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true)
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 墙体数据表格 "),
      vue.createElementVNode("view", { class: "table-section" }, [
        vue.createElementVNode("view", { class: "section-title" }, "墙体数据"),
        vue.createElementVNode("view", { class: "table-wrapper" }, [
          vue.createElementVNode("table", { class: "data-table" }, [
            vue.createElementVNode("thead", null, [
              vue.createElementVNode("tr", null, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.tableHeaders, (header) => {
                    return vue.openBlock(), vue.createElementBlock(
                      "th",
                      { key: header },
                      vue.toDisplayString(header),
                      1
                      /* TEXT */
                    );
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])
            ]),
            vue.createElementVNode("tbody", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.tableData, (row, index) => {
                  return vue.openBlock(), vue.createElementBlock("tr", { key: index }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(row, (cell, cellIndex) => {
                        return vue.openBlock(), vue.createElementBlock(
                          "td",
                          { key: cellIndex },
                          vue.toDisplayString(cell),
                          1
                          /* TEXT */
                        );
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ])
      ]),
      vue.createCommentVNode(" 底部操作按钮 "),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode("view", { class: "button-group" }, [
          vue.createElementVNode("button", {
            class: "action-btn save",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.saveAndShare && $options.saveAndShare(...args))
          }, [
            vue.createElementVNode("text", { class: "btn-text" }, "保存并分享")
          ]),
          vue.createElementVNode("button", {
            class: "action-btn upload",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.uploadToCloud && $options.uploadToCloud(...args))
          }, [
            vue.createElementVNode("text", { class: "btn-text" }, "上传到云端")
          ]),
          vue.createElementVNode("button", {
            class: "action-btn copy",
            onClick: _cache[2] || (_cache[2] = (...args) => $options.copyContent && $options.copyContent(...args))
          }, [
            vue.createElementVNode("text", { class: "btn-text" }, "复制内容")
          ]),
          vue.createElementVNode("button", {
            class: "action-btn view",
            onClick: _cache[3] || (_cache[3] = (...args) => $options.viewFile && $options.viewFile(...args))
          }, [
            vue.createElementVNode("text", { class: "btn-text" }, "查看文件")
          ])
        ])
      ]),
      vue.createCommentVNode(" 底部提示 "),
      vue.createElementVNode("view", { class: "tips" }, [
        vue.createElementVNode("view", { class: "tips-title" }, "提示："),
        vue.createElementVNode("view", { class: "tips-content" }, [
          vue.createElementVNode("text", null, "- 支持的文件格式：CSV（逗号分隔值）"),
          vue.createElementVNode("text", null, "- 建议使用 Excel、WPS 等表格软件打开查看"),
          vue.createElementVNode("text", null, "- 如需编辑数据，请在编辑后重新导入系统")
        ])
      ])
    ]);
  }
  const PagesNewProjectCsvPreviewPreview = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-4c95b366"], ["__file", "D:/nhuProject/智能靠尺/pages/newProject/csv/preview/preview.vue"]]);
  const _sfc_main$1 = {
    data() {
      return {
        presets: [],
        showModal: false,
        isEditing: false,
        currentPreset: {
          id: null,
          name: "",
          slopeWarning: "",
          flatnessWarning: ""
        }
      };
    },
    methods: {
      // 加载预设列表
      async loadPresets() {
        try {
          const res = await sqliteUtil.selectTableData("warning_presets");
          this.presets = res.map((item) => ({
            id: item.id,
            name: item.name,
            slopeWarning: item.slope_warning,
            flatnessWarning: item.flatness_warning
          }));
        } catch (error) {
          formatAppLog("error", "at pages/warning-presets/warning-presets.vue:89", "加载预设失败:", error);
          uni.showToast({
            title: "加载预设失败",
            icon: "none"
          });
        }
      },
      // 显示添加预设弹窗
      showAddPresetModal() {
        this.isEditing = false;
        this.currentPreset = {
          id: null,
          name: "",
          slopeWarning: "",
          flatnessWarning: ""
        };
        this.showModal = true;
      },
      // 编辑预设
      editPreset(preset) {
        this.isEditing = true;
        this.currentPreset = { ...preset };
        this.showModal = true;
      },
      // 关闭弹窗
      closeModal() {
        this.showModal = false;
      },
      // 保存预设
      async savePreset() {
        try {
          if (!this.currentPreset.name.trim()) {
            uni.showToast({
              title: "请输入预设名称",
              icon: "none"
            });
            return;
          }
          const data = {
            name: this.currentPreset.name.trim(),
            slope_warning: this.currentPreset.slopeWarning ? parseFloat(this.currentPreset.slopeWarning) : null,
            flatness_warning: this.currentPreset.flatnessWarning ? parseFloat(this.currentPreset.flatnessWarning) : null
          };
          if (this.isEditing) {
            await sqliteUtil.updateTableData(
              "warning_presets",
              `name='${data.name}',slope_warning=${data.slope_warning},flatness_warning=${data.flatness_warning}`,
              "id",
              this.currentPreset.id
            );
          } else {
            await sqliteUtil.insertTableData(
              "warning_presets",
              `null,'${data.name}',${data.slope_warning},${data.flatness_warning}`,
              "id,name,slope_warning,flatness_warning"
            );
          }
          this.showModal = false;
          await this.loadPresets();
          uni.showToast({
            title: this.isEditing ? "更新成功" : "添加成功",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/warning-presets/warning-presets.vue:163", "保存预设失败:", error);
          uni.showToast({
            title: "保存失败",
            icon: "none"
          });
        }
      },
      // 删除预设
      async deletePreset(preset) {
        uni.showModal({
          title: "确认删除",
          content: "是否确认删除该预设？",
          success: async (res) => {
            if (res.confirm) {
              try {
                await sqliteUtil.deleteTableData("warning_presets", { id: preset.id });
                await this.loadPresets();
                uni.showToast({
                  title: "删除成功",
                  icon: "success"
                });
              } catch (error) {
                formatAppLog("error", "at pages/warning-presets/warning-presets.vue:186", "删除预设失败:", error);
                uni.showToast({
                  title: "删除失败",
                  icon: "none"
                });
              }
            }
          }
        });
      },
      // 使用预设
      usePreset(preset) {
        var _a, _b;
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage) {
          prevPage.$vm.warningSettings = {
            slopeWarning: ((_a = preset.slopeWarning) == null ? void 0 : _a.toString()) || "",
            flatnessWarning: ((_b = preset.flatnessWarning) == null ? void 0 : _b.toString()) || ""
          };
          prevPage.$vm.saveSettings();
        }
        uni.navigateBack();
      }
    },
    onLoad() {
      this.loadPresets();
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "预警值预设管理")
      ]),
      vue.createElementVNode("view", { class: "preset-list" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.presets, (preset, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "preset-item",
              key: index
            }, [
              vue.createElementVNode("view", { class: "preset-content" }, [
                vue.createElementVNode(
                  "text",
                  { class: "preset-name" },
                  vue.toDisplayString(preset.name),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "preset-values" }, [
                  preset.slopeWarning !== null ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 0,
                      class: "value-item"
                    },
                    " 坡度预警值: " + vue.toDisplayString(preset.slopeWarning) + "mm/M ",
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true),
                  preset.flatnessWarning !== null ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 1,
                      class: "value-item"
                    },
                    " 平整度预警值: " + vue.toDisplayString(preset.flatnessWarning) + "mm ",
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true)
                ])
              ]),
              vue.createElementVNode("view", { class: "preset-actions" }, [
                vue.createElementVNode("button", {
                  class: "action-btn use",
                  onClick: ($event) => $options.usePreset(preset)
                }, "使用", 8, ["onClick"]),
                vue.createElementVNode("button", {
                  class: "action-btn edit",
                  onClick: ($event) => $options.editPreset(preset)
                }, "编辑", 8, ["onClick"]),
                vue.createElementVNode("button", {
                  class: "action-btn delete",
                  onClick: ($event) => $options.deletePreset(preset)
                }, "删除", 8, ["onClick"])
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode("button", {
        class: "add-btn",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.showAddPresetModal && $options.showAddPresetModal(...args))
      }, "+ 添加预设"),
      vue.createCommentVNode(" 添加/编辑预设弹窗 "),
      $data.showModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "modal"
      }, [
        vue.createElementVNode("view", {
          class: "modal-mask",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.closeModal && $options.closeModal(...args))
        }),
        vue.createElementVNode("view", { class: "modal-content" }, [
          vue.createElementVNode("view", { class: "modal-header" }, [
            vue.createElementVNode(
              "text",
              { class: "modal-title" },
              vue.toDisplayString($data.isEditing ? "编辑预设" : "添加预设"),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "modal-body" }, [
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.createElementVNode("text", { class: "label" }, "预设名称"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "input",
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.currentPreset.name = $event),
                  placeholder: "请输入预设名称"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.currentPreset.name]
              ])
            ]),
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.createElementVNode("text", { class: "label" }, "坡度预警值 (mm/M)"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "input",
                  type: "digit",
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.currentPreset.slopeWarning = $event),
                  placeholder: "请输入坡度预警值"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.currentPreset.slopeWarning]
              ])
            ]),
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.createElementVNode("text", { class: "label" }, "平整度预警值 (mm)"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "input",
                  type: "digit",
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.currentPreset.flatnessWarning = $event),
                  placeholder: "请输入平整度预警值"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.currentPreset.flatnessWarning]
              ])
            ])
          ]),
          vue.createElementVNode("view", { class: "modal-footer" }, [
            vue.createElementVNode("button", {
              class: "modal-btn cancel",
              onClick: _cache[5] || (_cache[5] = (...args) => $options.closeModal && $options.closeModal(...args))
            }, "取消"),
            vue.createElementVNode("button", {
              class: "modal-btn confirm",
              onClick: _cache[6] || (_cache[6] = (...args) => $options.savePreset && $options.savePreset(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesWarningPresetsWarningPresets = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "D:/nhuProject/智能靠尺/pages/warning-presets/warning-presets.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/device/device", PagesDeviceDevice);
  __definePage("pages/about/about", PagesAboutAbout);
  __definePage("pages/newProject/newProject", PagesNewProjectNewProject);
  __definePage("pages/inProject/inProject", PagesInProjectInProject);
  __definePage("pages/test/test", PagesTestTest);
  __definePage("pages/newProject/template/template", PagesNewProjectTemplateTemplate);
  __definePage("pages/newProject/csv/csv", PagesNewProjectCsvCsv);
  __definePage("pages/newProject/text/text", PagesNewProjectTextText);
  __definePage("pages/inProject/edit/edit", PagesInProjectEditEdit);
  __definePage("pages/newProject/csv/preview/preview", PagesNewProjectCsvPreviewPreview);
  __definePage("pages/warning-presets/warning-presets", PagesWarningPresetsWarningPresets);
  const CONFIG_KEY = "app_config";
  const Config = {
    // 获取配置
    getConfig() {
      try {
        const config = uni.getStorageSync(CONFIG_KEY) || {};
        return config;
      } catch (e) {
        formatAppLog("error", "at api/config.js:11", "获取配置失败：", e);
        return {};
      }
    },
    // 保存配置
    saveConfig(config) {
      try {
        uni.setStorageSync(CONFIG_KEY, config);
      } catch (e) {
        formatAppLog("error", "at api/config.js:21", "保存配置失败：", e);
      }
    },
    // 更新配置
    updateConfig(newConfig) {
      const config = this.getConfig();
      this.saveConfig({ ...config, ...newConfig });
    },
    // 检查是否首次启动
    isFirstLaunch() {
      const config = this.getConfig();
      return !config.hasLaunched;
    },
    // 标记已启动
    markLaunched() {
      this.updateConfig({ hasLaunched: true });
    }
  };
  const _sfc_main = {
    globalData: {
      dbInitialized: false,
      deviceId: null,
      serviceId: null,
      characteristicId: null,
      connected: false
    },
    onLaunch: function() {
      this.initDatabase();
    },
    onShow: function() {
    },
    onHide: function() {
    },
    methods: {
      async initDatabase() {
        try {
          await this.openSQL();
          await this.createTables();
          if (Config.isFirstLaunch()) {
            await this.initSampleData();
            Config.markLaunched();
            formatAppLog("log", "at App.vue:31", "示例数据初始化完成");
          }
          formatAppLog("log", "at App.vue:34", "数据库初始化完成");
          this.globalData.dbInitialized = true;
        } catch (error) {
          formatAppLog("error", "at App.vue:38", "数据库初始化失败:", error);
        }
      },
      deleteTable(table) {
        let open = sqliteUtil.isOpen();
        if (open) {
          sqliteUtil.deleteTable(table).then((res) => {
            formatAppLog("log", "at App.vue:46", "删除表成功");
          }).catch((error) => {
            formatAppLog("log", "at App.vue:49", "删除表失败", error);
          });
        } else {
          formatAppLog("log", "at App.vue:52", "数据库未打开");
        }
      },
      openSQL() {
        return new Promise((resolve, reject) => {
          let open = sqliteUtil.isOpen();
          formatAppLog("log", "at App.vue:58", "数据库状态", open ? "开启" : "关闭");
          if (!open) {
            sqliteUtil.openSqlite().then((res) => {
              formatAppLog("log", "at App.vue:62", "数据库已打开");
              resolve(res);
            }).catch((error) => {
              formatAppLog("log", "at App.vue:66", "数据库开启失败");
              reject(error);
            });
          } else {
            resolve();
          }
        });
      },
      async createTables() {
        try {
          await sqliteUtil.createTable("project", `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"icon" TEXT,
					"title" TEXT NOT NULL,
					"address" TEXT NOT NULL,
					"date" TEXT NOT NULL,
					"type_tag" TEXT NOT NULL,
					"building" TEXT,
					"unit" TEXT,
					"floor" TEXT,
					"room_number" TEXT,
					"inspector" TEXT,
					"project_status" TEXT NOT NULL,
					"inspection_status" TEXT NOT NULL
				`);
          formatAppLog("log", "at App.vue:93", "项目表创建成功");
          await sqliteUtil.createTable("wall_data", `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "project_id" INTEGER NOT NULL,
                    "section" TEXT NOT NULL,
                    "wall_name" TEXT NOT NULL,
                    "slope_value" TEXT,
          			"slope_angle" TEXT,
          			"slope_type" INTEGER,
          			"flatness" TEXT,
          			"image" TEXT,
          			"measurements" TEXT DEFAULT '[]',
          			FOREIGN KEY(project_id) REFERENCES project(id)
				`);
          formatAppLog("log", "at App.vue:109", "墙体数据表创建成功");
          await sqliteUtil.createTable("warning_settings", `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"project_id" INTEGER NOT NULL,
					"slope_warning" REAL,
					"flatness_warning" REAL,
					FOREIGN KEY(project_id) REFERENCES project(id)
				`);
          formatAppLog("log", "at App.vue:119", "预警设置表创建成功");
          await sqliteUtil.createTable("sections", `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"project_id" INTEGER NOT NULL,
					"name" TEXT NOT NULL,
					"sort_order" INTEGER,
					FOREIGN KEY(project_id) REFERENCES project(id)
				`);
          formatAppLog("log", "at App.vue:129", "房间表创建成功");
          await sqliteUtil.createTable("warning_presets", `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"name" TEXT NOT NULL,
					"slope_warning" REAL,
					"flatness_warning" REAL
				`);
          formatAppLog("log", "at App.vue:138", "预警预设表创建成功");
        } catch (error) {
          formatAppLog("error", "at App.vue:141", "创建数据库表失败:", error);
          throw error;
        }
      },
      async initSampleData() {
        try {
          const project1 = {
            icon: "/static/image/home1.png",
            title: "示例学校项目",
            address: "北京市海淀区中关村大街1号",
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            type_tag: "学校",
            building: "A栋",
            unit: "1单元",
            floor: "3层",
            room_number: "301",
            inspector: "张工",
            project_status: "坡度加平整度",
            inspection_status: "已验收"
          };
          const project2 = {
            icon: "/static/image/home2.png",
            title: "示例办公楼项目",
            address: "上海市浦东新区陆家嘴环路1000号",
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            type_tag: "办公楼",
            building: "B栋",
            unit: "2单元",
            floor: "15层",
            room_number: "1503",
            inspector: "李工",
            project_status: "平整度",
            inspection_status: "未验收"
          };
          const project1Id = await this.insertProject(project1);
          const project2Id = await this.insertProject(project2);
          const sections1 = ["客厅", "主卧", "次卧", "卫生间"];
          for (let i = 0; i < sections1.length; i++) {
            await this.insertSection(project1Id, sections1[i], i + 1);
          }
          const sections2 = ["会议室", "办公区", "茶水间", "洽谈室"];
          for (let i = 0; i < sections2.length; i++) {
            await this.insertSection(project2Id, sections2[i], i + 1);
          }
          const walls1 = [
            { section: "客厅", name: "东墙", slope: "1.2", flatness: "2.5" },
            { section: "客厅", name: "南墙", slope: "1.5", flatness: "2.8" },
            { section: "主卧", name: "北墙", slope: "1.1", flatness: "2.3" },
            { section: "主卧", name: "西墙", slope: "1.3", flatness: "2.6" }
          ];
          for (const wall of walls1) {
            await this.insertWallData(project1Id, wall);
          }
          const walls2 = [
            { section: "会议室", name: "东墙", slope: "1.4", flatness: "2.7" },
            { section: "会议室", name: "南墙", slope: "1.6", flatness: "2.9" },
            { section: "办公区", name: "北墙", slope: "1.2", flatness: "2.4" }
          ];
          for (const wall of walls2) {
            await this.insertWallData(project2Id, wall);
          }
          await this.insertWarningSettings(project1Id, 2, 3);
          await this.insertWarningSettings(project2Id, 1.8, 2.8);
          formatAppLog("log", "at App.vue:224", "示例数据添加成功");
        } catch (error) {
          formatAppLog("error", "at App.vue:226", "添加示例数据失败:", error);
          throw error;
        }
      },
      async insertProject(project) {
        const sql = `INSERT INTO project (
				icon, title, address, date, type_tag,
				building, unit, floor, room_number, inspector,
				project_status, inspection_status
			) VALUES (
				'${project.icon}', '${project.title}', '${project.address}', 
				'${project.date}', '${project.type_tag}', '${project.building}',
				'${project.unit}', '${project.floor}', '${project.room_number}',
				'${project.inspector}', '${project.project_status}', 
				'${project.inspection_status}'
			)`;
        return new Promise((resolve, reject) => {
          plus.sqlite.executeSql({
            name: sqliteUtil.dbName,
            sql,
            success: (e) => {
              plus.sqlite.selectSql({
                name: sqliteUtil.dbName,
                sql: "SELECT last_insert_rowid() as id",
                success: (data) => resolve(data[0].id),
                fail: (e2) => reject(e2)
              });
            },
            fail: (e) => reject(e)
          });
        });
      },
      async insertSection(projectId, name, sortOrder) {
        const sql = `INSERT INTO sections (project_id, name, sort_order) 
						VALUES (${projectId}, '${name}', ${sortOrder})`;
        return new Promise((resolve, reject) => {
          plus.sqlite.executeSql({
            name: sqliteUtil.dbName,
            sql,
            success: () => resolve(),
            fail: (e) => reject(e)
          });
        });
      },
      async insertWallData(projectId, wall) {
        const sql = `INSERT INTO wall_data (
				project_id, section, wall_name, slope, flatness
			) VALUES (
				${projectId}, '${wall.section}', '${wall.name}', 
				'${wall.slope}', '${wall.flatness}'
			)`;
        return new Promise((resolve, reject) => {
          plus.sqlite.executeSql({
            name: sqliteUtil.dbName,
            sql,
            success: () => resolve(),
            fail: (e) => reject(e)
          });
        });
      },
      async insertWarningSettings(projectId, slopeWarning, flatnessWarning) {
        const sql = `INSERT INTO warning_settings (
				project_id, slope_warning, flatness_warning
			) VALUES (
				${projectId}, ${slopeWarning}, ${flatnessWarning}
			)`;
        return new Promise((resolve, reject) => {
          plus.sqlite.executeSql({
            name: sqliteUtil.dbName,
            sql,
            success: () => resolve(),
            fail: (e) => reject(e)
          });
        });
      }
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/nhuProject/智能靠尺/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
