<template>
  <view class="container">
    <view class="header">
      <text class="title">预警值预设管理</text>
    </view>

    <view class="preset-list">
      <view class="preset-item" v-for="(preset, index) in presets" :key="index">
        <view class="preset-content">
          <text class="preset-name">{{ preset.name }}</text>
          <view class="preset-values">
            <text v-if="preset.slopeWarning !== null" class="value-item">
              坡度预警值: {{ preset.slopeWarning }}mm/M
            </text>
            <text v-if="preset.flatnessWarning !== null" class="value-item">
              平整度预警值: {{ preset.flatnessWarning }}mm
            </text>
          </view>
        </view>
        <view class="preset-actions">
          <button class="action-btn use" @click="usePreset(preset)">使用</button>
          <button class="action-btn edit" @click="editPreset(preset)">编辑</button>
          <button class="action-btn delete" @click="deletePreset(preset)">删除</button>
        </view>
      </view>
    </view>

    <button class="add-btn" @click="showAddPresetModal">+ 添加预设</button>

    <!-- 添加/编辑预设弹窗 -->
    <view class="modal" v-if="showModal">
      <view class="modal-mask" @click="closeModal"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">{{ isEditing ? '编辑预设' : '添加预设' }}</text>
        </view>
        <view class="modal-body">
          <view class="input-group">
            <text class="label">预设名称</text>
            <input class="input" v-model="currentPreset.name" placeholder="请输入预设名称" />
          </view>
          <view class="input-group">
            <text class="label">坡度预警值 (mm/M)</text>
            <input class="input" type="digit" v-model="currentPreset.slopeWarning" placeholder="请输入坡度预警值" />
          </view>
          <view class="input-group">
            <text class="label">平整度预警值 (mm)</text>
            <input class="input" type="digit" v-model="currentPreset.flatnessWarning" placeholder="请输入平整度预警值" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="closeModal">取消</button>
          <button class="modal-btn confirm" @click="savePreset">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import DB from "@/api/sqlite.js";

export default {
  data() {
    return {
      presets: [],
      showModal: false,
      isEditing: false,
      currentPreset: {
        id: null,
        name: '',
        slopeWarning: '',
        flatnessWarning: ''
      }
    };
  },
  methods: {
    // 初始化预设表
    async initPresetsTable() {
      try {
        await DB.createTable('warning_presets', `
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "name" TEXT NOT NULL,
          "slope_warning" REAL,
          "flatness_warning" REAL
        `);
        console.log('预警预设表创建成功');
      } catch (error) {
        console.error('创建预警预设表失败:', error);
      }
    },

    // 加载预设列表
    async loadPresets() {
      try {
        const res = await DB.selectTableData('warning_presets');
        this.presets = res.map(item => ({
          id: item.id,
          name: item.name,
          slopeWarning: item.slope_warning,
          flatnessWarning: item.flatness_warning
        }));
      } catch (error) {
        console.error('加载预设失败:', error);
        uni.showToast({
          title: '加载预设失败',
          icon: 'none'
        });
      }
    },

    // 显示添加预设弹窗
    showAddPresetModal() {
      this.isEditing = false;
      this.currentPreset = {
        id: null,
        name: '',
        slopeWarning: '',
        flatnessWarning: ''
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
            title: '请输入预设名称',
            icon: 'none'
          });
          return;
        }

        const data = {
          name: this.currentPreset.name.trim(),
          slope_warning: this.currentPreset.slopeWarning ? parseFloat(this.currentPreset.slopeWarning) : null,
          flatness_warning: this.currentPreset.flatnessWarning ? parseFloat(this.currentPreset.flatnessWarning) : null
        };

        if (this.isEditing) {
          // 更新预设
          await DB.updateTableData(
            'warning_presets',
            `name='${data.name}',slope_warning=${data.slope_warning},flatness_warning=${data.flatness_warning}`,
            'id',
            this.currentPreset.id
          );
        } else {
          // 添加新预设
          await DB.insertTableData(
            'warning_presets',
            `null,'${data.name}',${data.slope_warning},${data.flatness_warning}`,
            'id,name,slope_warning,flatness_warning'
          );
        }

        this.showModal = false;
        await this.loadPresets();

        uni.showToast({
          title: this.isEditing ? '更新成功' : '添加成功',
          icon: 'success'
        });
      } catch (error) {
        console.error('保存预设失败:', error);
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    },

    // 删除预设
    async deletePreset(preset) {
      uni.showModal({
        title: '确认删除',
        content: '是否确认删除该预设？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await DB.deleteTableData('warning_presets', { id: preset.id });
              await this.loadPresets();
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } catch (error) {
              console.error('删除预设失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    // 使用预设
    usePreset(preset) {
      // 将选中的预设值传回上一页
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.$vm.warningSettings = {
          slopeWarning: preset.slopeWarning?.toString() || '',
          flatnessWarning: preset.flatnessWarning?.toString() || ''
        };
        // 保存设置
        prevPage.$vm.saveSettings();
      }
      
      uni.navigateBack();
    }
  },
  onLoad() {
    this.initPresetsTable();
    this.loadPresets();
  }
};
</script>

<style>
.container {
  padding: 30rpx;
}

.header {
  margin-bottom: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
}

.preset-list {
  margin-bottom: 30rpx;
}

.preset-item {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

.preset-content {
  margin-bottom: 20rpx;
}

.preset-name {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.preset-values {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.value-item {
  font-size: 28rpx;
  color: #666;
}

.preset-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  font-size: 28rpx;
  padding: 10rpx 0;
  text-align: center;
  border-radius: 8rpx;
}

.action-btn.use {
  background-color: #007aff;
  color: #fff;
}

.action-btn.edit {
  background-color: #f0f0f0;
  color: #333;
}

.action-btn.delete {
  background-color: #ff4444;
  color: #fff;
}

.add-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background-color: #007aff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
}

.modal-header {
  padding: 30rpx;
  text-align: center;
  border-bottom: 1rpx solid #eee;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
}

.modal-body {
  padding: 30rpx;
}

.input-group {
  margin-bottom: 20rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #eee;
}

.modal-btn {
  flex: 1;
  height: 90rpx;
  line-height: 90rpx;
  text-align: center;
  font-size: 32rpx;
}

.modal-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background-color: #007aff;
  color: #fff;
}
</style> 