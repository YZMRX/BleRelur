<template>
	<view class="container">
		<view class="header">
			<text class="title">附近蓝牙设备</text>
			<button class="refresh-btn" @click="startBluetoothDiscovery">刷新</button>
		</view>

		<scroll-view scroll-y class="device-list">
			<view v-if="scanning" class="scanning-tip">正在搜索设备...</view>
			<view v-if="!scanning && devices.length === 0" class="no-device-tip">
				未找到设备，请确保：
				<text>1. 设备已开启并在附近</text>
				<text>2. 手机蓝牙已开启</text>
				<text>3. 已授予蓝牙权限</text>
			</view>
			<view class="device-item" v-for="(item, index) in devices" :key="index"
				@click="connectToDevice(item.deviceId, index)">
				<view class="device-icon-box">
					<image src="/static/image/blu.png" class="device-icon" mode="aspectFit" />
				</view>
				<view class="device-info-box">
					<text class="device-name">{{ item.name || '未知设备' }}</text>
					<text class="device-id">{{ item.deviceId }}</text>
					<text class="device-rssi">信号强度: {{ item.RSSI }}dBm</text>
					<text class="device-status">{{ item.status || '未连接' }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import bleManager from '@/utils/bleManager.js';

export default {
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
				console.error('蓝牙初始化失败:', error);
			}
		},

		async getConnectedDevices() {
			return new Promise((resolve, reject) => {
				uni.getBluetoothDevices({
					success: (res) => {
						const bleState = bleManager.getState();
						if (bleState.deviceId) {
							const connectedDevice = res.devices.find(device => device.deviceId === bleState.deviceId);
							if (connectedDevice) {
								this.connectedDeviceId = connectedDevice.deviceId;
								this.updateDeviceStatus(connectedDevice.deviceId, '已连接');
							} else {
								bleManager.clear();
								this.connectedDeviceId = null;
							}
						}
						resolve();
					},
					fail: (err) => {
						console.error('获取蓝牙设备列表失败:', err);
						reject(err);
					}
				});
			});
		},

		async checkBluetoothPermission() {
			return new Promise((resolve, reject) => {
				if (uni.getSystemInfoSync().platform === 'android') {
					const permissions = [
						'android.permission.BLUETOOTH_ADMIN',
						'android.permission.BLUETOOTH',
						'android.permission.ACCESS_FINE_LOCATION',
						'android.permission.ACCESS_COARSE_LOCATION'
					];
					
					plus.android.requestPermissions(
						permissions,
						function(resultObj) {
							if (resultObj.granted.length === permissions.length) {
								resolve();
							} else {
								uni.showModal({
									title: '提示',
									content: '请授予蓝牙和位置权限以搜索设备',
									showCancel: false
								});
								reject(new Error('Permission denied'));
							}
						},
						function(error) {
							console.error('Request permissions error:', error);
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
						console.log('蓝牙适配器初始化成功');
						resolve(res);
					},
					fail: (err) => {
						console.error('蓝牙适配器初始化失败:', err);
						uni.showModal({
							title: '提示',
							content: '请开启手机蓝牙后重试',
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
									console.log('开始搜索设备');
								},
								fail: (err) => {
									console.error('搜索设备失败:', err);
									this.scanning = false;
									uni.showToast({
										title: '搜索设备失败',
										icon: 'none'
									});
								}
							});

							setTimeout(() => {
								if (this.scanning) {
									this.scanning = false;
									uni.stopBluetoothDevicesDiscovery();
								}
							}, 30000);
						}
					});
				},
				fail: (err) => {
					console.error('蓝牙适配器初始化失败:', err);
					this.scanning = false;
					uni.showModal({
						title: '提示',
						content: '请开启手机蓝牙后重试',
						showCancel: false
					});
				}
			});
		},

		listenForDevices() {
			if (this.hasListener) {
				return;
			}
			
			uni.onBluetoothDeviceFound(res => {
				if (!this.scanning) return;

				res.devices.forEach(device => {
					if (!device.name && !device.localName) return;
					
					const isConnectedDevice = device.deviceId === this.connectedDeviceId;
					
					const existingIndex = this.devices.findIndex(d => d.deviceId === device.deviceId);
					const deviceInfo = {
						...device,
						name: device.name || device.localName || '未知设备',
						status: isConnectedDevice ? '已连接' : '未连接',
						RSSI: device.RSSI
					};

					if (existingIndex >= 0) {
						const currentStatus = this.devices[existingIndex].status;
						deviceInfo.status = currentStatus === '已连接' ? '已连接' : deviceInfo.status;
						this.devices.splice(existingIndex, 1, deviceInfo);
					} else {
						this.devices.push(deviceInfo);
					}

					this.devices.sort((a, b) => {
						if (a.status === '已连接') return -1;
						if (b.status === '已连接') return 1;
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

				uni.showToast({ title: '连接成功', icon: 'success' });
				this.connectedDeviceId = deviceId;
				this.updateDeviceStatus(deviceId, '已连接');
				
				bleManager.setDeviceId(deviceId);
				bleManager.setConnected(true);

				setTimeout(() => {
					this.getDeviceServices(deviceId);
				}, 1500);

			} catch (error) {
				console.error('连接失败', error);
				this.handleDisconnect();
				uni.showToast({ title: '连接失败', icon: 'none' });
			}
		},

		getDeviceServices(deviceId) {
			uni.getBLEDeviceServices({
				deviceId,
				success: (res) => {
					console.log('所有服务列表：');
					res.services.forEach((service, index) => {
						console.log(`服务${index + 1} UUID: ${service.uuid}`);
					});
					
					// 获取第7个服务
					const service7 = res.services[6];  // 索引6对应第7个服务（用于所有数据传输）
					
					if (service7) {
						console.log('找到目标服务：', {
							'数据服务(7)': service7.uuid
						});
						
						// 设置服务ID（使用serviceId2作为主服务ID）
						bleManager.setServiceId2(service7.uuid);
						
						console.log('设置服务ID后的状态：', bleManager.getState());
						
						// 获取服务的特征值
						uni.getBLEDeviceCharacteristics({
							deviceId,
							serviceId: service7.uuid,
							success: (res) => {
								const charList = res.characteristics.map(c => ({
									uuid: c.uuid,
									properties: c.properties
								}));
								console.log('服务7特征值列表：', charList);
								
								if (res.characteristics && res.characteristics.length > 0) {
									const dataCharacteristic = res.characteristics[0];  // 使用第一个特征值
									console.log('设置数据特征值：', dataCharacteristic.uuid);
									bleManager.setPdCharacteristicId(dataCharacteristic.uuid);
									
									console.log('最终蓝牙状态：', bleManager.getState());
									
									// 开启通知
									this.enableNotify(deviceId, service7.uuid, dataCharacteristic.uuid);
									
									setTimeout(() => {
										uni.navigateBack();
									}, 1000);
								} else {
									uni.showModal({
										title: '连接失败',
										content: '未找到数据特征值',
										showCancel: false
									});
								}
							},
							fail: (err) => {
								console.error('获取特征值失败', err);
								uni.showModal({
									title: '连接失败',
									content: '获取特征值失败',
									showCancel: false
								});
							}
						});
					} else {
						uni.showModal({
							title: '连接失败',
							content: '未找到目标服务',
							showCancel: false
						});
					}
				},
				fail: (err) => {
					console.error('获取服务失败', err);
					uni.showModal({
						title: '连接失败',
						content: '获取设备服务失败',
						showCancel: false
					});
				}
			});
		},

		enableNotify(deviceId, serviceId, characteristicId) {
			console.log('开启通知，参数：', {
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
					console.log('监听特征值变化开启成功');
					bleManager.setNotifyEnabled(true);
				},
				fail: (err) => {
					console.error('开启监听失败', err);
					uni.showModal({
						title: '提示',
						content: '开启数据监听失败，请重新连接设备',
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
						this.updateDeviceStatus(deviceId, '未连接');
						this.connectedDeviceId = null;
						bleManager.clear();
						resolve();
					},
					fail: (err) => {
						console.error('断开连接失败:', err);
						this.connectedDeviceId = null;
						bleManager.clear();
						resolve();
					}
				});
			});
		},

		updateDeviceStatus(deviceId, status) {
			console.log('更新设备状态:', deviceId, status);
			
			const device = this.devices.find(item => item.deviceId === deviceId);
			if (device) {
				device.status = status;
				this.devices = [...this.devices];
			}
			
			if (status === '已连接') {
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
			console.log('当前蓝牙状态:', bleState);
			
			if (bleState.connected && bleState.deviceId) {
				this.connectedDeviceId = bleState.deviceId;
				
				const existingDevice = this.devices.find(d => d.deviceId === bleState.deviceId);
				if (existingDevice) {
					existingDevice.status = '已连接';
					this.devices = [...this.devices];
				} else {
					try {
						const deviceInfo = await this.getDeviceInfo(bleState.deviceId);
						if (deviceInfo) {
							this.devices.unshift({
								...deviceInfo,
								status: '已连接'
							});
						}
					} catch (error) {
						console.error('获取设备信息失败:', error);
					}
				}
			} else {
				this.devices = this.devices.map(device => ({
					...device,
					status: '未连接'
				}));
				this.connectedDeviceId = null;
			}
		},

		async getDeviceInfo(deviceId) {
			return new Promise((resolve, reject) => {
				uni.getBluetoothDevices({
					success: (res) => {
						const device = res.devices.find(d => d.deviceId === deviceId);
						if (device) {
							resolve({
								...device,
								name: device.name || device.localName || '未知设备',
								RSSI: device.RSSI || 0
							});
						} else {
							reject(new Error('设备未找到'));
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
			}, 3000);
		},

		handleDisconnect() {
			console.log('检测到设备断开');
			if (this.connectedDeviceId) {
				this.updateDeviceStatus(this.connectedDeviceId, '未连接');
			}
		},
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
		console.log('设备页面显示');
		this.syncConnectedStatus();
		if (this.devices.length === 0) {
			this.startBluetoothDiscovery();
		}
		this.startStatusCheck();
	}
};
</script>

<style>
.container {
	padding: 24rpx;
	background-color: #f2f2f2;
	height: 100vh;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.refresh-btn {
	background-color: #007aff;
	color: #fff;
	font-size: 28rpx;
	border-radius: 12rpx;
}

.scanning-tip {
	text-align: center;
	padding: 20rpx;
	color: #666;
	font-size: 28rpx;
}

.no-device-tip {
	padding: 40rpx 20rpx;
	color: #666;
	font-size: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.device-list {
	max-height: calc(100vh - 200rpx);
}

.device-item {
	display: flex;
	background-color: #fff;
	border-radius: 20rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
	align-items: center;
}

.device-icon-box {
	width: 120rpx;
	height: 120rpx;
	margin-right: 20rpx;
}

.device-icon {
	width: 100%;
	height: 100%;
	border-radius: 16rpx;
}

.device-info-box {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.device-name {
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
}

.device-id {
	font-size: 24rpx;
	color: #999;
	word-break: break-all;
}

.device-rssi {
	font-size: 24rpx;
	color: #666;
}

.device-status {
	font-size: 24rpx;
	color: #007aff;
}
</style>