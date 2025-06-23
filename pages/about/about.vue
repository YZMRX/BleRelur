<template>
	<view class="about-container">
		<view class="about-content">
			<image src="/static/image/logo.png" mode="aspectFit" class="logo"></image>
			<text class="app-name">智能靠尺</text>
			<text class="version">版本 1.0.0</text>
			<view class="description">
				<text>智能靠尺是一款专业的建筑测量工具，致力于提供精确的墙面测量服务。</text>
			</view>
		</view>
		<view class="copyright" @click="openGithub">
			<text>
				Copyright © 2025 by YZMRX
				<br>
				All rights reserved
			</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				
			}
		},
		methods: {
			openGithub() {
				// 打开外部浏览器
				plus.runtime.openURL('https://github.com/YZMRX/BleRelur');
			}
		}
	}
</script>

<style>
.about-container {
	padding: 40rpx;
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.about-content {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.logo {
	width: 200rpx;
	height: 200rpx;
	margin-bottom: 30rpx;
}

.app-name {
	font-size: 36rpx;
	font-weight: bold;
	margin-bottom: 20rpx;
}

.version {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 40rpx;
}

.description {
	text-align: center;
	line-height: 1.6;
	color: #333;
	font-size: 28rpx;
	margin-bottom: 20rpx;
}

.license {
	text-align: center;
	color: #666;
	font-size: 26rpx;
}

.copyright {
	text-align: center;
	margin-bottom: 100rpx;
	color: #999;
	font-size: 24rpx;
}

.copyright text {
	text-decoration: none;
}
</style>