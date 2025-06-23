<template>
  <view class="container">
    <!-- 固定顶部标题，支持点击跳转 -->
    <view class="room-header" @click="goToProjectEdit(id)">
      {{ fullAddress }}
      <image src="/static/image/edit.png" class="edit-icon" mode="aspectFit"></image>
    </view>

    <scroll-view scroll-y class="left-panel">
      <view class="add-section-btn" @click="addNewSection">+ 添加房间</view>
      <view v-for="(item, index) in sections" :key="index"
        :class="['menu-item', currentIndex === index ? 'active' : '']">
        <view class="menu-item-content" @click="currentIndex = index">
          {{ item }}
        </view>
        <view class="menu-item-actions">
          <text class="action-btn edit" @click.stop="editSection(item)">✏️</text>
          <text class="action-btn delete" @click.stop="deleteSection(item)">×</text>
        </view>
      </view>
    </scroll-view>

    <view class="right-panel">
      <view class="spacer"></view> <!-- 为顶部 header 腾出空间 -->

      <scroll-view scroll-y class="content-scroll">
        <view 
          class="wall-card" 
          v-for="(wall, i) in getWalls()" 
          :key="i"
          :class="{'selected-wall': wall === selectedWall}"
          @click="selectWall(wall)"
        >
          <view class="wall-header">
            <view class="wall-title-container">
              <text class="wall-title">墙体 {{ wall.name }}</text>
              <text class="edit-wall-name" @click.stop="editWallName(wall)"><image src="/static/image/edit.png" class="edit-icon" mode="aspectFit"></image></text>
            </view>
            <view class="wall-actions">
              <button class="measure-btn" @click.stop="startMeasure(wall)">
                {{ isMeasuring && currentMeasureWall === wall ? '停止测量' : '测量' }}
              </button>
            </view>
          </view>

          <view class="data-row">
            <!-- 测量数据列表 -->
            <view class="measurements-list" v-if="wall.measurements && wall.measurements.length > 0">
              <view class="measurement-item" v-for="(measurement, index) in wall.measurements" :key="index">
                <view class="measurement-header">
                  <text class="measurement-time">{{ formatTime(measurement.timestamp) }}</text>
                  <text class="delete-measurement" @click="deleteMeasurement(wall, index)">×</text>
                </view>
                <view class="measurement-data">
                  <view class="row" v-if="showSlope && measurement.slope !== null">
                    <text class="label">坡度↔</text>
                    <view class="input-unit-wrapper">
                      <input 
                        :class="['input', isOverWarning(measurement.slope, 'slope') ? 'warning' : '']" 
                        :value="measurement.slope"
                        @input="e => handleInput(wall, 'slope', e.detail.value, index)" 
                        placeholder="请输入坡度" 
                      />
                      <text class="unit">mm/M</text>
                    </view>
                  </view>
                  <view class="row" v-if="showFlatness && measurement.flatness !== null">
                    <text class="label">平整度</text>
                    <view class="input-unit-wrapper">
                      <input 
                        :class="['input', isOverWarning(measurement.flatness, 'flatness') ? 'warning' : '']"
                        :value="measurement.flatness"
                        @input="e => handleInput(wall, 'flatness', e.detail.value, index)"
                        placeholder="请输入平整度"
                      />
                      <text class="unit">mm</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="row-image" v-if="wall.image">
              <view class="image-wrapper">
                <image class="image" mode="aspectFill" :src="wall.image" @click="previewImage(wall.image)" />
                <view class="delete-icon" @click.stop="removeImage(wall)">×</view>
              </view>
            </view>
            <view class="row actions">
              <button @click="chooseImage(wall)">添加照片</button>
              <button @click="deleteWall(i)">删除墙体</button>
            </view>
          </view>
        </view>

        <!-- 新增墙体按钮，放在所有墙体列表后 -->
        <view class="add-wall-btn" @click="addNewWall">
          + 添加新墙体
        </view>
      </scroll-view>

      <!-- 修改底部按钮 -->
      <view class="footer">
        <button @click="exportTable">导出表格</button>
        <button @click="showSettings = true" class="settings-btn">
          <image src="/static/image/config.png" class="settings-icon" mode="aspectFit"></image>
        </button>
      </view>
    </view>

    <!-- 添加自定义弹出层 -->
    <view class="custom-popup" v-if="showNameInput">
      <view class="popup-mask" @click="showNameInput = false"></view>
      <view class="popup-content">
        <view class="popup-title">新增墙体</view>
        <view class="popup-input-wrap">
          <input class="popup-input" v-model="newWallName" placeholder="请输入墙体名称（留空则自动命名）"
            placeholder-class="input-placeholder" />
        </view>
        <view class="popup-buttons">
          <button class="popup-btn cancel" @click="showNameInput = false">取消</button>
          <button class="popup-btn confirm" @click="confirmAddWall">确定</button>
        </view>
      </view>
    </view>

    <!-- 设置弹窗 -->
    <view class="custom-popup" v-if="showSettings">
      <view class="popup-mask" @click="showSettings = false"></view>
      <view class="popup-content settings-popup">
        <view class="popup-title">预警值设置</view>
        <view class="settings-form">
          <view class="setting-item" v-if="projectType === '坡度' || projectType === '坡度加平整度'">
            <text class="setting-label">坡度预警值 (mm/M)</text>
            <input type="digit" class="setting-input" :value="warningSettings.slopeWarning"
              @input="e => handleSettingInput('slopeWarning', e.detail.value)" placeholder="请输入坡度预警值" />
          </view>
          <view class="setting-item" v-if="projectType === '平整度' || projectType === '坡度加平整度'">
            <text class="setting-label">平整度预警值 (mm)</text>
            <input type="digit" class="setting-input" :value="warningSettings.flatnessWarning"
              @input="e => handleSettingInput('flatnessWarning', e.detail.value)" placeholder="请输入平整度预警值" />
          </view>
        </view>
        <view class="popup-buttons">
          <button class="popup-btn cancel" @click="showSettings = false">取消</button>
          <button class="popup-btn confirm" @click="saveSettings">确定</button>
        </view>
      </view>
    </view>

    <!-- 房间管理弹窗 -->
    <view class="custom-popup" v-if="showSectionInput">
      <view class="popup-mask" @click="showSectionInput = false"></view>
      <view class="popup-content">
        <view class="popup-title">{{ isEditingSection ? '编辑房间' : '新增房间' }}</view>
        <view class="popup-input-wrap">
          <input class="popup-input" v-model="newSectionName" :placeholder="isEditingSection ? '请输入新的房间名称' : '请输入房间名称'"
            placeholder-class="input-placeholder" />
        </view>
        <view class="popup-buttons">
          <button class="popup-btn cancel" @click="showSectionInput = false">取消</button>
          <button class="popup-btn confirm" @click="confirmSection">确定</button>
        </view>
      </view>
    </view>

    <!-- 添加修改墙体名称的弹窗 -->
    <view class="custom-popup" v-if="showWallNameInput">
      <view class="popup-mask" @click="showWallNameInput = false"></view>
      <view class="popup-content">
        <view class="popup-title">修改墙体名称</view>
        <view class="popup-input-wrap">
          <input 
            class="popup-input" 
            v-model="editingWallName" 
            placeholder="请输入新的墙体名称"
            placeholder-class="input-placeholder"
          />
        </view>
        <view class="popup-buttons">
          <button class="popup-btn cancel" @click="showWallNameInput = false">取消</button>
          <button class="popup-btn confirm" @click="confirmEditWallName">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import DB from "@/api/sqlite.js";
import csvUtils from '@/utils/csvUtils.js';
import bleManager from '@/utils/bleManager.js';

export default {
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
        slopeWarning: '',
        flatnessWarning: ''
      },
      projectType: '',
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
      formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      }
    };
  },
  computed: {
    // 判断是否显示坡度输入框
    showSlope() {
      return this.projectType === '坡度' || this.projectType === '坡度加平整度';
    },
    // 判断是否显示平整度输入框
    showFlatness() {
      return this.projectType === '平整度' || this.projectType === '坡度加平整度';
    }
  },
  methods: {
    // 初始化数据表
    async initWallTable() {
      try {
        await DB.createTable('wall_data', `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "project_id" INTEGER NOT NULL,
          "section" TEXT NOT NULL,
          "wall_name" TEXT NOT NULL,
          "slope" TEXT,
          "flatness" TEXT,
          "image" TEXT,
          "measurements" TEXT DEFAULT '[]',
          FOREIGN KEY(project_id) REFERENCES project(id)
        `);
        console.log('墙体数据表创建成功');
      } catch (error) {
        console.error('创建墙体数据表失败:', error);
      }
    },

    // 添加删除单个测量数据的方法
    deleteMeasurement(wall, index) {
      uni.showModal({
        title: '确认删除',
        content: '是否删除这组测量数据？',
        success: (res) => {
          if (res.confirm) {
            wall.measurements.splice(index, 1);
            this.handleDataChange();
          }
        }
      });
    },

    // 加载墙体数据
    async loadWallData() {
      try {
        const res = await DB.selectTableData('wall_data', { project_id: this.id });
        console.log('加载到的墙体数据:', res);

        // 初始化每个房间的墙体数据为空数组
        this.sections.forEach(section => {
          this.sectionData[section] = [];
        });

        // 整理墙体数据到对应的房间
        res.forEach(item => {
          const section = item.section;
          if (section && this.sectionData[section]) {
            let measurements = [];
            try {
              measurements = JSON.parse(item.measurements || '[]');
            } catch (e) {
              console.error('解析测量数据失败:', e);
              measurements = [];
            }
            
            // 使用Vue.set确保响应式更新
            const wallData = {
              name: item.wall_name,
              slope: item.slope || "",
              flatness: item.flatness || "",
              image: item.image || "",
              id: item.id,
              measurements: measurements
            };
            
            this.sectionData[section].push(wallData);
            console.log(`添加墙体数据到${section}:`, wallData);
          }
        });

        // 强制更新视图
        this.$forceUpdate();

      } catch (error) {
        console.error('加载墙体数据失败:', error);
        uni.showToast({
          title: '加载数据失败',
          icon: 'none'
        });
      }
    },

    // 添加自动保存方法
    async autoSave() {
      if (!this.pendingSave) return;

      try {
        for (const section in this.sectionData) {
          const walls = this.sectionData[section];
          for (const wall of walls) {
            const measurements = JSON.stringify(wall.measurements || []);
            
            if (wall.id) {
              // 更新已存在的数据
              await DB.updateTableData(
                'wall_data',
                `measurements='${measurements}'`,
                'id',
                wall.id
              );
            } else {
              // 插入新数据
              await DB.insertTableData(
                'wall_data',
                `null,${this.id},'${section}','${wall.name}','${wall.slope || ""}','${wall.flatness || ""}','${wall.image || ""}','${measurements}'`,
                'id,project_id,section,wall_name,slope,flatness,image,measurements'
              );
            }
          }
        }

        this.pendingSave = false;
        console.log('自动保存成功');
      } catch (error) {
        console.error('自动保存失败:', error);
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    },

    // 修改数据变化的相关方法
    handleDataChange() {
      this.pendingSave = true;

      // 清除之前的定时器
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }

      // 设置新的定时器，延迟2秒后保存
      this.autoSaveTimer = setTimeout(() => {
        this.autoSave();
      }, 2000);
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
        // 获取平台信息
        const platform = uni.getSystemInfoSync().platform;
        console.log('当前平台:', platform);
        console.log('临时文件路径:', tempFilePath);

        if (platform === 'android' || platform === 'ios') {
          // App环境下使用plus.io的简单方式
          return new Promise((resolve, reject) => {
            // 生成文件名
            const timestamp = new Date().getTime();
            const random = Math.floor(Math.random() * 1000);
            const ext = tempFilePath.substring(tempFilePath.lastIndexOf('.'));
            const fileName = `${timestamp}_${random}${ext}`;
            
            // 使用应用专属目录 '_doc' 而不是 '_downloads'
            const targetPath = `_doc/images/${fileName}`;
            console.log('目标保存路径:', targetPath);

            // 确保目录存在
            plus.io.resolveLocalFileSystemURL('_doc/', (rootEntry) => {
              rootEntry.getDirectory('images', { create: true }, (dirEntry) => {
                // 复制文件到应用专属目录
                plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
                  entry.copyTo(dirEntry, fileName, () => {
                    console.log('文件保存成功:', targetPath);
                    resolve(targetPath);
                  }, (e) => {
                    console.error('复制文件失败:', e);
                    reject(e);
                  });
                }, (e) => {
                  console.error('解析源文件失败:', e);
                  reject(e);
                });
              }, (e) => {
                console.error('创建目录失败:', e);
                reject(e);
              });
            }, (e) => {
              console.error('获取根目录失败:', e);
              reject(e);
            });
          });
        } else {
          // H5环境使用uni.saveFile
          const res = await uni.saveFile({
            tempFilePath: tempFilePath
          });
          console.log('H5环境保存文件结果:', res);
          return res.savedFilePath;
        }
      } catch (error) {
        console.error('保存图片时发生错误:', error);
        throw error;
      }
    },

    // 修改chooseImage方法
    async chooseImage(wall) {
      try {
        // 先确保目录存在
        if (uni.getSystemInfoSync().platform === 'android' || uni.getSystemInfoSync().platform === 'ios') {
          await new Promise((resolve, reject) => {
            plus.io.resolveLocalFileSystemURL('_doc/', (entry) => {
              entry.getDirectory('images', { create: true }, () => {
                resolve();
              }, (err) => reject(err));
            }, (err) => reject(err));
          }).catch(err => {
            console.error('创建目录失败:', err);
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
        console.log('选择的临时文件路径:', tempFilePath);

        try {
          // 保存图片到本地
          const savedFilePath = await this.saveImageToLocal(tempFilePath);
          console.log('保存后的文件路径:', savedFilePath);

          // 更新数据库中的图片路径
          if (wall.id) {
            await DB.updateTableData(
              'wall_data',
              `image='${savedFilePath}'`,
              'id',
              wall.id
            );
          } else {
            // 如果是新数据，需要先插入数据库
            const section = this.sections[this.currentIndex];
            await DB.insertTableData(
              'wall_data',
              `null,${this.id},'${section}','${wall.name}','${wall.slope || ""}','${wall.flatness || ""}','${savedFilePath}'`,
              'id,project_id,section,wall_name,slope,flatness,image'
            );

            // 获取新插入数据的ID
            const result = await new Promise((resolve, reject) => {
              plus.sqlite.selectSql({
                name: DB.dbName,
                sql: "SELECT last_insert_rowid() as id",
                success: (data) => resolve(data),
                fail: (e) => reject(e)
              });
            });
            wall.id = result[0].id;
          }

          // 重新加载当前房间的墙体数据
          await this.reloadCurrentSectionData();

          uni.showToast({
            title: '图片保存成功',
            icon: 'success'
          });
        } catch (error) {
          console.error('保存图片失败:', error);
          uni.showToast({
            title: '保存图片失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('选择图片失败:', error);
        if (error.errMsg !== 'chooseImage:fail cancel') {
          uni.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      }
    },

    // 新增：重新加载当前房间的墙体数据
    async reloadCurrentSectionData() {
      try {
        const currentSection = this.sections[this.currentIndex];
        console.log('重新加载房间数据:', currentSection);

        // 查询当前房间的所有墙体数据
        const res = await DB.selectTableData('wall_data', { 
          project_id: this.id,
          section: currentSection
        });
        console.log('重新加载的墙体数据:', res);

        // 更新当前房间的数据
        this.sectionData[currentSection] = res.map(item => {
          let measurements = [];
          try {
            measurements = JSON.parse(item.measurements || '[]');
          } catch (e) {
            console.error('解析测量数据失败:', e);
            measurements = [];
          }

          return {
            name: item.wall_name,
            slope: item.slope || "",
            flatness: item.flatness || "",
            image: item.image || "",
            id: item.id,
            measurements: measurements
          };
        });

        // 强制更新视图
        this.$forceUpdate();
        console.log('数据重新加载完成');

      } catch (error) {
        console.error('重新加载数据失败:', error);
        uni.showToast({
          title: '刷新数据失败',
          icon: 'none'
        });
      }
    },

    // 删除墙体数据
    async deleteWall(index) {
      const key = this.sections[this.currentIndex];
      const wall = this.sectionData[key][index];

      uni.showModal({
        title: '确认删除',
        content: `是否确认删除${key}墙体${wall.name}？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              if (wall.id) {
                await DB.deleteTableData('wall_data', { id: wall.id });
              }

              // 从数组中移除墙体
              this.sectionData[key].splice(index, 1);

              // 触发视图更新
              this.sectionData = { ...this.sectionData };

              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } catch (error) {
              console.error('删除数据失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    // 修改原有的onLoad方法
    async initPageData(options = {}) {
      try {
        this.id = options.id || this.id; // 保存或更新ID
        await this.getProject(); // 先加载项目信息
        this.fullAddress = this.formatProjectTitle(this.project);
        await this.loadSections(); // 加载房间数据
        await this.loadWallData(); // 最后加载墙体数据
        await this.loadSettings(); // 加载预警设置
      } catch (error) {
        console.error('页面加载失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },

    // 修改原有的onShow方法
    async refreshPageData() {
      try {
        await this.getProject(); // 先加载项目信息
        this.fullAddress = this.formatProjectTitle(this.project);
        await this.loadWallData(); // 然后加载墙体数据
        await this.loadSettings(); // 加载预警设置
      } catch (error) {
        console.error('页面刷新失败:', error);
        uni.showToast({
          title: '刷新失败',
          icon: 'none'
        });
      }
    },

    goToProjectEdit(id) {
      console.log('跳转编辑页面，项目ID:', id);
      uni.navigateTo({
        url: `/pages/inProject/edit/edit?id=${this.id}`,
        fail: (err) => {
          console.error('跳转失败:', err);
          uni.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    },
    getWalls() {
      const key = this.sections[this.currentIndex];
      return this.sectionData[key] || [];
    },
    addNewWall() {
      this.newWallName = ""; // 清空输入
      this.showNameInput = true; // 显示弹出层
    },
    async confirmAddWall() {
      const key = this.sections[this.currentIndex];
      let existingWalls = this.sectionData[key];
      let wallName = this.newWallName.trim();

      // 如果用户没有输入，使用自动命名
      if (!wallName) {
        wallName = this.getNextName(existingWalls);
      } else {
        // 检查名称是否已存在
        const nameExists = existingWalls.some(wall => wall.name === wallName);
        if (nameExists) {
          uni.showToast({
            title: '墙体名称已存在',
            icon: 'none'
          });
          return;
        }
      }

      try {
        // 立即保存到数据库
        const insertFields = ['id', 'project_id', 'section', 'wall_name', 'slope', 'flatness', 'image'];
        const insertValues = [`null`, `'${this.id}'`, `'${key}'`, `'${wallName}'`, `''`, `''`, `''`];

        await DB.insertTableData(
          'wall_data',
          insertValues.join(','),
          insertFields.join(',')
        );

        // 获取刚插入的数据ID
        const newWallResult = await new Promise((resolve, reject) => {
          plus.sqlite.selectSql({
            name: DB.dbName,
            sql: "SELECT last_insert_rowid() as id",
            success: (result) => {
              resolve(result);
            },
            fail: (e) => {
              reject(e);
            }
          });
        });

        // 新增墙体数据到本地
        existingWalls.push({
          name: wallName,
          slope: "",
          flatness: "",
          image: "",
          id: newWallResult[0].id
        });

        // 触发视图更新
        this.sectionData = { ...this.sectionData };
        this.showNameInput = false;

        uni.showToast({
          title: '添加墙体成功',
          icon: 'success'
        });
      } catch (error) {
        console.error('添加墙体失败:', error);
        uni.showToast({
          title: '添加墙体失败',
          icon: 'none'
        });
      }
    },
    getNextName(walls) {
      if (!walls || walls.length === 0) return "A";

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
        if (val > maxNum) maxNum = val;
      });
      return numberToName(maxNum + 1);
    },
    previewImage(imageUrl) {
      if (!imageUrl) return;
      console.log('预览图片路径:', imageUrl);
      
      // 获取完整路径
      const fullPath = imageUrl.startsWith('_doc/') ? imageUrl : `_doc/${imageUrl}`;
      console.log('完整预览路径:', fullPath);
      
      uni.previewImage({
        urls: [fullPath],
        current: fullPath,
        fail: (err) => {
          console.error('预览图片失败:', err);
          uni.showToast({
            title: '预览失败',
            icon: 'none'
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
            if (platform === 'android' || platform === 'ios') {
              // App环境下使用plus.io删除文件
              await new Promise((resolve, reject) => {
                plus.io.resolveLocalFileSystemURL(oldImagePath, (entry) => {
                  entry.remove(() => {
                    console.log('文件删除成功');
                    resolve();
                  }, (e) => {
                    console.warn('文件删除失败:', e);
                    reject(e);
                  });
                }, (e) => {
                  console.warn('解析文件路径失败:', e);
                  reject(e);
                });
              });
            } else {
              // H5环境
              await uni.removeSavedFile({
                filePath: oldImagePath
              });
            }
          } catch (e) {
            console.warn('删除旧图片文件失败:', e);
          }
        }

        // 更新数据库中的图片路径为空
        if (wall.id) {
          await DB.updateTableData(
            'wall_data',
            "image=''",
            'id',
            wall.id
          );

          // 重新加载当前房间的墙体数据
          await this.reloadCurrentSectionData();

          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      } catch (error) {
        console.error('删除图片失败:', error);
        uni.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    },
    exportTable() {
      try {
        // 根据项目类型过滤要导出的数据
        const exportData = {
          projectInfo: this.project,
          warningSettings: {
            slopeWarning: this.showSlope ? this.warningSettings.slopeWarning : '',
            flatnessWarning: this.showFlatness ? this.warningSettings.flatnessWarning : ''
          },
          showSlope: this.showSlope,
          showFlatness: this.showFlatness,
          isOverWarning: this.isOverWarning,
          sections: this.sections,
          sectionData: {}
        };

        // 过滤每个房间的数据
        for (const section in this.sectionData) {
          exportData.sectionData[section] = this.sectionData[section].map(wall => {
            const filteredWall = {
              name: wall.name
            };
            if (this.showSlope) {
              filteredWall.slope = wall.slope;
            }
            if (this.showFlatness) {
              filteredWall.flatness = wall.flatness;
            }
            return filteredWall;
          }).filter(wall => {
            // 根据项目类型过滤数据
            const projectType = this.project.project_status;
            if (projectType === '坡度') {
              return wall.slope;
            } else if (projectType === '平整度') {
              return wall.flatness;
            } else if (projectType === '坡度加平整度') {
              return (this.showSlope && wall.slope) || (this.showFlatness && wall.flatness);
            }
            return false;
          });
        }

        // 使用csvUtils工具类生成CSV内容
        const csvContent = csvUtils.generateCSVContent(exportData);
        const fileName = `${this.fullAddress}-墙体数据.csv`;

        // 准备预览数据
        const previewData = {
          content: csvContent,
          fileName: fileName,
          projectInfo: {
            title: this.project.title || '',
            address: this.project.address || '',
            date: this.project.date || '',
            building: this.project.building || '',
            unit: this.project.unit || '',
            floor: this.project.floor || '',
            roomNumber: this.project.room_number || '',
            typeTag: this.project.type_tag || '',
            projectStatus: this.project.project_status || '',
            inspectionStatus: this.project.inspection_status || '',
            inspector: this.project.inspector || ''
          },
          warningSettings: exportData.warningSettings,
          createTime: new Date().toLocaleString()
        };

        // 将数据编码并传递到预览页面
        const encodedData = encodeURIComponent(JSON.stringify(previewData));
        uni.navigateTo({
          url: `/pages/newProject/csv/preview/preview?data=${encodedData}`,
          fail: (err) => {
            console.error('跳转预览页面失败:', err);
            uni.showToast({
              title: '跳转失败',
              icon: 'none'
            });
          }
        });
      } catch (error) {
        console.error('导出失败:', error);
        uni.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    },
    async getProject() {
      try {
        const res = await DB.selectTableData("project", { id: this.id });
        if (res && res.length > 0) {
          this.project = res[0];
          this.projectType = res[0].project_status; // 获取项目类型
          // 立即更新地址显示
          this.$nextTick(() => {
            this.fullAddress = this.formatProjectTitle(this.project);
          });
        } else {
          uni.showToast({ title: "未找到该项目", icon: "none" });
        }
      } catch (e) {
        console.error("查询失败", e);
        uni.showToast({ title: "查询出错", icon: "none" });
      }
    },
    formatProjectTitle(item) {
      if (!item) return "";
      let result = item.title || "";
      if (item.building) result += "-" + item.building;
      if (item.unit) result += "-" + item.unit + "栋";
      if (item.floor) result += "-" + item.floor;
      if (item.room_number) result += "-" + item.room_number;
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
      // 使用csvUtils工具类生成CSV内容
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
      // 使用csvUtils工具类生成CSV内容
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
        await DB.createTable('warning_settings', `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "project_id" INTEGER NOT NULL,
          "slope_warning" REAL,
          "flatness_warning" REAL,
          FOREIGN KEY(project_id) REFERENCES project(id)
        `);
        console.log('预警设置表创建成功');
      } catch (error) {
        console.error('创建预警设置表失败:', error);
      }
    },

    async loadSettings() {
      try {
        const res = await DB.selectTableData('warning_settings', { project_id: this.id });
        this.warningSettings = {
          slopeWarning: '',
          flatnessWarning: ''
        };
        
        if (res && res.length > 0) {
          // 根据项目类型加载对应的预警值
          if (this.projectType === '坡度' || this.projectType === '坡度加平整度') {
            this.warningSettings.slopeWarning = res[0].slope_warning?.toString() || '';
          }
          if (this.projectType === '平整度' || this.projectType === '坡度加平整度') {
            this.warningSettings.flatnessWarning = res[0].flatness_warning?.toString() || '';
          }
        }
      } catch (error) {
        console.error('加载预警设置失败:', error);
        // 初始化为空值
        this.warningSettings = {
          slopeWarning: '',
          flatnessWarning: ''
        };
      }
    },

    async saveSettings() {
      try {
        const data = {
          slope_warning: null,
          flatness_warning: null
        };

        // 根据项目类型设置对应的预警值
        if (this.projectType === '坡度' || this.projectType === '坡度加平整度') {
          data.slope_warning = parseFloat(this.warningSettings.slopeWarning);
          data.slope_warning = isNaN(data.slope_warning) ? null : data.slope_warning;
        }
        
        if (this.projectType === '平整度' || this.projectType === '坡度加平整度') {
          data.flatness_warning = parseFloat(this.warningSettings.flatnessWarning);
          data.flatness_warning = isNaN(data.flatness_warning) ? null : data.flatness_warning;
        }

        const res = await DB.selectTableData('warning_settings', { project_id: this.id });
        if (res && res.length > 0) {
          // 更新现有设置
          await DB.updateTableData(
            'warning_settings',
            `slope_warning=${data.slope_warning},flatness_warning=${data.flatness_warning}`,
            'project_id',
            this.id
          );
        } else {
          // 插入新设置
          await DB.insertTableData(
            'warning_settings',
            `null,${this.id},${data.slope_warning},${data.flatness_warning}`,
            'id,project_id,slope_warning,flatness_warning'
          );
        }

        this.showSettings = false;
        uni.showToast({
          title: '设置已保存',
          icon: 'success'
        });

        // 重新加载设置以确保数据一致
        await this.loadSettings();
      } catch (error) {
        console.error('保存设置失败:', error);
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    },

    handleSettingInput(field, value) {
      this.warningSettings[field] = value;
    },

    isOverWarning(value, type) {
      if (!value || !this.warningSettings[type + 'Warning']) return false;
      const numValue = parseFloat(value);
      const warningValue = parseFloat(this.warningSettings[type + 'Warning']);
      return Math.abs(numValue) > warningValue;
    },

    // 初始化房间表
    async initSectionTable() {
      try {
        await DB.createTable('sections', `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "project_id" INTEGER NOT NULL,
          "name" TEXT NOT NULL,
          "sort_order" INTEGER,
          FOREIGN KEY(project_id) REFERENCES project(id)
        `);
        console.log('房间表创建成功');
        await this.loadSections();
      } catch (error) {
        console.error('创建房间表失败:', error);
      }
    },

    // 加载房间数据
    async loadSections() {
      try {
        const res = await DB.selectTableData('sections', { project_id: this.id });
        if (res && res.length > 0) {
          // 按照sort_order排序
          this.sections = res.sort((a, b) => a.sort_order - b.sort_order).map(item => item.name);
        } else {
          // 初始化为空数组
          this.sections = [];
        }
        // 初始化sectionData
        this.sections.forEach(section => {
          if (!this.sectionData[section]) {
            this.sectionData[section] = [];
          }
        });
      } catch (error) {
        console.error('加载房间数据失败:', error);
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
            title: '房间名称不能为空',
            icon: 'none'
          });
          return;
        }

        if (this.isEditingSection) {
          // 更新房间名称
          const oldData = this.sectionData[this.editingSectionOldName];
          delete this.sectionData[this.editingSectionOldName];
          this.sectionData[sectionName] = oldData || [];

          // 更新数据库
          await DB.updateTableData(
            'sections',
            `name='${sectionName}'`,
            'name',
            this.editingSectionOldName
          );

          // 更新wall_data表中的section
          await DB.updateTableData(
            'wall_data',
            `section='${sectionName}'`,
            'section',
            this.editingSectionOldName
          );

          // 更新sections数组
          const index = this.sections.indexOf(this.editingSectionOldName);
          if (index !== -1) {
            this.sections[index] = sectionName;
          }
        } else {
          // 添加新房间
          const sortOrder = this.sections.length;
          await DB.insertTableData(
            'sections',
            `null,${this.id},'${sectionName}',${sortOrder}`,
            'id,project_id,name,sort_order'
          );
          this.sections.push(sectionName);
          this.sectionData[sectionName] = [];
        }

        this.showSectionInput = false;
        uni.showToast({
          title: this.isEditingSection ? '修改成功' : '添加成功',
          icon: 'success'
        });
      } catch (error) {
        console.error('操作房间失败:', error);
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    },

    // 删除房间
    async deleteSection(sectionName) {
      uni.showModal({
        title: '确认删除',
        content: `是否确认删除房间"${sectionName}"？删除后该房间的所有墙体数据都将被删除！`,
        success: async (res) => {
          if (res.confirm) {
            try {
              // 删除该房间的所有墙体数据
              await DB.deleteTableData('wall_data', { section: sectionName });

              // 删除房间
              await DB.deleteTableData('sections', { name: sectionName });

              // 更新前端数据
              const index = this.sections.indexOf(sectionName);
              if (index !== -1) {
                this.sections.splice(index, 1);
                delete this.sectionData[sectionName];

                // 如果删除的是当前选中的房间，切换到第一个房间
                if (this.currentIndex === index) {
                  this.currentIndex = 0;
                } else if (this.currentIndex > index) {
                  this.currentIndex--;
                }
              }

              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } catch (error) {
              console.error('删除房间失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    // 修改开始测量方法
    async startMeasure(wall) {
      // 如果当前正在测量这个墙体，则停止测量
      if (this.isMeasuring && this.currentMeasureWall === wall) {
        this.stopMeasure();
        return;
      }

      const bleState = bleManager.getState();
      // 先检查蓝牙连接状态
      await this.checkBleConnection();
      
      if (!bleState.connected || !bleState.deviceId) {
        uni.showModal({
          title: '未连接设备',
          content: '是否前往连接蓝牙设备？',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: '/pages/device/device'
              });
            }
          }
        });
        return;
      }

      try {
        // 如果之前在测量其他墙体，先停止
        if (this.isMeasuring && this.currentMeasureWall !== wall) {
          await this.stopMeasure();
        }

        // 设置测量状态为true
        this.isMeasuring = true;
        this.currentMeasureWall = wall;
        this.selectedWall = wall; // 自动选中当前测量的墙体
        
        // 确保蓝牙适配器已初始化
        await this.initBluetooth();
        
        this.tempMeasurement = null;

        // 开始监听数据
        await this.startListenBLEData();

        // 显示等待测量提示
        uni.showToast({
          title: '开始测量',
          icon: 'success'
        });

      } catch (error) {
        console.error('开始测量失败:', error);
        this.stopMeasure();
        uni.showToast({
          title: '测量初始化失败',
          icon: 'none'
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
            console.error('蓝牙初始化失败:', error);
            reject(new Error('蓝牙初始化失败'));
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
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await new Promise((resolve, reject) => {
          uni.onBLECharacteristicValueChange((result) => {
            const hex = Array.from(new Uint8Array(result.value))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(' ');
            
            console.log('收到蓝牙数据：', {
              hex,
              buffer: result.value,
              timestamp: new Date().toLocaleTimeString(),
              characteristicId: result.characteristicId,
              serviceId: result.serviceId
            });

            const value = this.parseBluetoothData(new Uint8Array(result.value));
            if (value !== null && this.currentMeasureWall && this.isMeasuring) {
              const isPzd = result.characteristicId.toLowerCase() === bleState.pzdCharacteristicId.toLowerCase() &&
                          result.serviceId.toLowerCase() === bleState.serviceId.toLowerCase();
              const isPd = result.characteristicId.toLowerCase() === bleState.pdCharacteristicId.toLowerCase() &&
                         result.serviceId.toLowerCase() === bleState.serviceId2.toLowerCase();

              // 确保measurements数组存在
              if (!this.currentMeasureWall.measurements) {
                this.currentMeasureWall.measurements = [];
              }

              // 根据项目类型处理数据
              if (this.projectType === '坡度加平整度') {
                // 如果是新的测量或临时数据不存在，创建新的临时数据
                if (!this.tempMeasurement) {
                  this.tempMeasurement = {
                    timestamp: new Date().toISOString(),
                    slope: null,
                    flatness: null
                  };
                }

                // 更新临时数据
                if (isPzd && this.showFlatness) {
                  console.log('收到平整度数据:', value);
                  this.tempMeasurement.flatness = value;
                  // 显示接收到平整度数据的提示
                  uni.showToast({
                    title: '已接收平整度',
                    icon: 'none',
                    duration: 1000
                  });
                } else if (isPd && this.showSlope) {
                  console.log('收到坡度数据:', value);
                  this.tempMeasurement.slope = value;
                  // 显示接收到坡度数据的提示
                  uni.showToast({
                    title: '已接收坡度',
                    icon: 'none',
                    duration: 1000
                  });
                }

                // 检查是否两个数据都已接收
                const hasValidData = 
                  (!this.showSlope || this.tempMeasurement.slope !== null) && 
                  (!this.showFlatness || this.tempMeasurement.flatness !== null);

                if (hasValidData) {
                  // 添加完整的数据组
                  this.currentMeasureWall.measurements.push({...this.tempMeasurement});
                  this.handleDataChange();
                  
                  // 重置临时数据，准备接收下一组
                  this.tempMeasurement = null;
                  
                  // 显示成功提示
                  uni.showToast({
                    title: '测量完成',
                    icon: 'success',
                    duration: 1500
                  });
                } else {
                  // 如果还有数据未接收，显示等待提示
                  let waitingFor = [];
                  if (this.showSlope && this.tempMeasurement.slope === null) waitingFor.push('坡度');
                  if (this.showFlatness && this.tempMeasurement.flatness === null) waitingFor.push('平整度');
                  if (waitingFor.length > 0) {
                    console.log(`等待接收: ${waitingFor.join('和')}`);
                  }
                }
              } else {
                // 对于单一类型的测量，检查是否是对应类型的数据
                if ((this.projectType === '坡度' && isPd) || 
                    (this.projectType === '平整度' && isPzd)) {
                  let newMeasurement = {
                    timestamp: new Date().toISOString(),
                    slope: this.projectType === '坡度' ? value : null,
                    flatness: this.projectType === '平整度' ? value : null
                  };

                  this.currentMeasureWall.measurements.push(newMeasurement);
                  this.handleDataChange();

                  // 显示成功提示
                  uni.showToast({
                    title: '测量完成',
                    icon: 'success',
                    duration: 1500
                  });
                }
              }
            }
          });

          // 开启特征值通知的代码保持不变...
        });

      } catch (error) {
        console.error('启动蓝牙监听失败:', error);
        throw error;
      }
    },

    // 解析蓝牙数据
    parseBluetoothData(value) {
      try {
        // 打印原始字节数组
        console.log('原始数据字节数组:', Array.from(value).map(b => b.toString(16).padStart(2, '0')));
        
        // 将ArrayBuffer转换为字符串
        let result = '';
        for (let i = 0; i < value.length; i++) {
          result += String.fromCharCode(value[i]);
        }
        console.log('转换后的字符串:', result);
        
        // 转换为数字并保留两位小数
        const number = parseFloat(result);
        console.log('解析后的数字:', number);
        
        const finalResult = isNaN(number) ? null : number.toFixed(2);
        console.log('最终结果:', finalResult);
        
        return finalResult;
      } catch (error) {
        console.error('解析数据失败:', error);
        return null;
      }
    },

    // 停止测量
    async stopMeasure() {
      // 重置所有状态
      this.isMeasuring = false;
      this.tempMeasurement = null;

      const bleState = bleManager.getState();
      
      if (bleState.deviceId && bleState.connected) {
        try {
          // 关闭特征值通知的代码保持不变...
        } catch (error) {
          console.error('停止测量时出错:', error);
        }
      }

      // 移除特征值变化监听器
      uni.offBLECharacteristicValueChange();
      this.currentMeasureWall = null;

      uni.showToast({
        title: '停止测量',
        icon: 'success'
      });
    },

    // 在组件卸载时清理
    onUnload() {
      this.stopMeasure();
      // ... 保持原有的清理代码 ...
    },

    // 添加检查蓝牙连接状态的方法
    async checkBleConnection() {
      const bleState = bleManager.getState();
      if (bleState.deviceId && bleState.connected) {
        // 验证连接是否真的存在
        try {
          await new Promise((resolve, reject) => {
            uni.getBluetoothDevices({
              success: (res) => {
                const device = res.devices.find(d => d.deviceId === bleState.deviceId);
                if (!device) {
                  reject(new Error('设备未找到'));
                } else {
                  resolve();
                }
              },
              fail: reject
            });
          });
        } catch (error) {
          console.error('蓝牙连接状态验证失败:', error);
          // 如果验证失败，清除连接状态
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
          title: '名称不能为空',
          icon: 'none'
        });
        return;
      }

      // 检查名称是否重复
      const currentSection = this.sections[this.currentIndex];
      const existingWalls = this.sectionData[currentSection];
      const isDuplicate = existingWalls.some(wall => 
        wall !== this.editingWall && wall.name === this.editingWallName.trim()
      );

      if (isDuplicate) {
        uni.showToast({
          title: '墙体名称已存在',
          icon: 'none'
        });
        return;
      }

      try {
        // 更新数据库
        await DB.updateTableData(
          'wall_data',
          `wall_name='${this.editingWallName.trim()}'`,
          'id',
          this.editingWall.id
        );

        // 更新本地数据
        this.editingWall.name = this.editingWallName.trim();

        // 关闭弹窗
        this.showWallNameInput = false;
        this.editingWall = null;
        this.editingWallName = "";

        uni.showToast({
          title: '修改成功',
          icon: 'success'
        });
      } catch (error) {
        console.error('修改墙体名称失败:', error);
        uni.showToast({
          title: '修改失败',
          icon: 'none'
        });
      }
    },
  },
  onLoad(options) {
    console.log('onLoad options:', options);
    this.initPageData(options);
  },
  onShow() {
    console.log('onShow with id:', this.id);
    if (this.id) {
      this.refreshPageData();
    }
    // 检查蓝牙连接状态
    this.checkBleConnection();
  },
};
</script>

<style scoped>
@import 'inProject.css';

.measure-btn {
  margin-left: 10rpx;
  font-size: 24rpx;
  padding: 0 20rpx;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #007aff;
  color: #fff;
  border-radius: 8rpx;
}

.measurements-list {
  width: 100%;
  margin-bottom: 20rpx;
}

.measurement-item {
  background-color: #f8f8f8;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.measurement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.measurement-time {
  font-size: 24rpx;
  color: #666;
}

.delete-measurement {
  font-size: 32rpx;
  color: #ff4444;
  padding: 0 10rpx;
  cursor: pointer;
}

.measurement-data {
  background-color: #fff;
  border-radius: 6rpx;
  padding: 10rpx;
}

.wall-card {
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  background: #fff;
  transition: all 0.3s ease;
}

.selected-wall {
  border: 2rpx solid #007aff;
  box-shadow: 0 0 10rpx rgba(0, 122, 255, 0.2);
}

.measure-btn:active {
  opacity: 0.8;
}

.wall-title-container {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.edit-wall-name {
  font-size: 28rpx;
  padding: 10rpx;
  cursor: pointer;
}

.edit-wall-name:active {
  opacity: 0.7;
}

.wall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.wall-title {
  font-size: 32rpx;
  font-weight: bold;
}
</style>
