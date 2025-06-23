<template>
	<view class="main">
		<view class="container">
			<!-- 顶部标题 -->
			<view class="title-bar">
				<text class="title">我的设备</text>
			</view>

			<!-- 我的设备卡片 -->
			<view class="device-card" @click="connectDevice">
				<image src="/static/image/blu.png" class="device-icon" mode="aspectFit"></image>
				<view class="device-info">
					<view><text class="device-title">我的设备</text></view>
					<view><text class="device-subtitle">{{ deviceInfo ? deviceInfo.name : '未连接到设备，请链接设备' }}</text></view>
				</view>
				<image src="/static/image/next.png" class="arrow-icon" mode="aspectFit"></image>
			</view>

			<!-- 我的项目标题 -->

			<view class="myproject">
				<text class="section-title">我的项目</text>
				<text class="section-subtitle">长按可删除项目</text>
			</view>

			<scroll-view scroll-y="true" class="scroll-area" @scrolltolower="loadMore">
				<view class="project-list">
					<view class="project-item" v-for="(item, index) in projects" :key="index"
						@longpress="handleLongPress(item, index)" @click="inProject(item)"
						:class="{'project-item-pressed': pressedIndex === index}">
						<image :src="item.icon" class="project-icon" mode="aspectFit" />
						<view class="project-content">
							<view class="project-title-box">
								<text class="project-title">{{ formatProjectTitle(item) }}</text>
							</view>
							<view class="project-address-box"><text class="project-address">{{ item.address }}</text>
							</view>
							<view class="project-date-box"><text class="project-date">{{ item.date }}</text>
							</view>
							<view class="project-type-box">
								<text class="project-type">项目类型：{{ item.type_tag }}</text>
								<text class="project-status">验收类型：{{ item.project_status }}</text>
							</view>
							<view class="project-type-box">
								<view>验收状态：<text class="project-inspection"
										:class="{ 'green-text': item.inspection_status === '已验收', 'gray-text': item.inspection_status !== '已验收' }">{{
											item.inspection_status }}</text></view>
								<text class="project-inspector" v-if="item.inspection_status === '已验收'">项目质检员：{{
									item.inspector }}</text>
							</view>



						</view>
						<image src="/static/image/next.png" class="arrow-icon" mode="aspectFit"></image>
					</view>
				</view>
			</scroll-view>
			<!-- 项目列表 -->
			<!-- 新建项目按钮 -->
			<view class="footer">
				<button class="new-project-btn" @click="createProject">新建项目</button>
			</view>

		</view>
	</view>
</template>

<script>
import DB from "@/api/sqlite.js"
import bleManager from '@/utils/bleManager.js';

export default {
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

	async onLoad(options) {
		// 等待数据库初始化
		await this.waitForDatabase();
		await this.resetAndLoad();
	},

	onShow() {
		// 检查蓝牙连接状态
		const bleState = bleManager.getState();
		if (bleState.connected && bleState.deviceId) {
			// 获取已连接设备的信息
			uni.getBluetoothDevices({
				success: (res) => {
					const device = res.devices.find(d => d.deviceId === bleState.deviceId);
					if (device) {
						this.deviceInfo = {
							name: device.name || device.localName || '未知设备',
							deviceId: device.deviceId
						};
					}
				}
			});
		} else {
			this.deviceInfo = null;
		}
		
		// 原有的 onShow 逻辑
		const app = getApp();
		if (app && app.globalData && app.globalData.dbInitialized) {
			this.resetAndLoad();
		}
	},

	methods: {
		// 新增：重置并加载数据的方法
		async resetAndLoad() {
			if (this.isLoading) return; // 防止并发加载
			
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
				url: '/pages/newProject/newProject'
			});
		},
		//查看项目
		inProject(s) {
			uni.showToast({
				title: s.title,
				icon: 'none'
			});
			uni.navigateTo({
				url: `/pages/inProject/inProject?id=${s.id}`
			});
		},
		//查询数据库
		selectTableDataByPage() {
			return new Promise((resolve, reject) => {
				DB.selectTableDataByPage("project", this.page, this.pageSize)
					.then(res => {
						resolve(res);
					})
					.catch(error => {
						reject(error);
					});
			});
		},
		async loaddata() {
			const app = getApp();
			if (!app || !app.globalData || !app.globalData.dbInitialized) {
				console.log("数据库未初始化，跳过加载");
				return;
			}

			if (this.isLoading) {
				console.log("正在加载中，跳过重复加载");
				return;
			}

			this.isLoading = true;
			try {
				console.log("加载第", this.page, "页，每页", this.pageSize, "条");
				const res = await this.selectTableDataByPage();
				
				// 如果是第一页，直接替换数据
				if (this.page === 1) {
					this.projects = res;
				} else {
					// 如果不是第一页，追加数据
					this.projects = [...this.projects, ...res];
				}
				
				// 更新是否有更多数据的状态
				this.hasMore = res.length >= this.pageSize;
				
			} catch (error) {
				console.error("数据载入失败：", error);
				uni.showToast({
					title: '数据载入失败',
					icon: 'none'
				});
			} finally {
				this.isLoading = false;
			}
		},
		
		async loadMore() {
			if (!this.hasMore || this.isLoading || this.isLoadingMore) return;
			
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
			// 触发震动
			uni.vibrateShort({
				success: () => {
					this.pressedIndex = index;
					this.confirmDelete(item, index);
				}
			});
		},
		confirmDelete(item, index) {
			if (this.isDeleting) return; // 如果正在删除中，不允许再次触发
			
			uni.showModal({
				title: "删除项目",
				content: `确定要删除项目「${this.formatProjectTitle(item)}」吗？\n删除后数据将无法恢复。`,
				confirmText: "删除",
				cancelText: "取消",
				confirmColor: "#e64340",
				success: async (res) => {
					if (res.confirm) {
						await this.deleteProject(item.id, index);
					}
					this.pressedIndex = -1; // 重置长按状态
				},
				fail: () => {
					this.pressedIndex = -1; // 重置长按状态
				}
			});
		},
		async deleteProject(id, index) {
			if (this.isDeleting) return;
			this.isDeleting = true;
			
			uni.showLoading({
				title: '正在删除...',
				mask: true
			});
			
			try {
				// 删除项目相关的所有数据
				await DB.deleteTableData("wall_data", { "project_id": id });
				await DB.deleteTableData("sections", { "project_id": id });
				await DB.deleteTableData("warning_settings", { "project_id": id });
				await DB.deleteTableData("project", { "id": id });
				
				// 更新界面
				this.projects.splice(index, 1);
				
				uni.showToast({ 
					title: "删除成功", 
					icon: "success" 
				});
			} catch (err) {
				console.error("删除失败", err);
				uni.showToast({ 
					title: "删除失败", 
					icon: "none",
					duration: 2000
				});
			} finally {
				uni.hideLoading();
				this.isDeleting = false;
			}
		},
		formatProjectTitle(item) {
			let result = item.title || '';
			if (item.building) result += '-' + item.building;
			if (item.unit) result += '-' + item.unit;
			if (item.floor) result += '-' + item.floor;
			if (item.room_number) result += '-' + item.room_number;
			return result;
		}
	}
};
</script>

<style>
@import url("index.css");
.device-status {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background-color: #fff;
	border-radius: 12rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.device-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 20rpx;
}

.device-card {
	margin: 25rpx 0;
	background-color: #eafdfd;
	border-radius: 16rpx;
	padding: 24rpx;
	height: 140rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.device-icon {
	width: 120rpx;
	height: 120rpx;
}

.device-info {
	flex: 1;
	margin-left: 20rpx;
}

.device-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
}

.device-subtitle {
	font-size: 26rpx;
	color: #666;
	margin-top: 4rpx;
}

.arrow-icon {
	width: 32rpx;
	height: 32rpx;
	opacity: 0.6;
}
</style>