// 配置管理
const CONFIG_KEY = 'app_config';

export default {
	// 获取配置
	getConfig() {
		try {
			const config = uni.getStorageSync(CONFIG_KEY) || {};
			return config;
		} catch (e) {
			console.error('获取配置失败：', e);
			return {};
		}
	},

	// 保存配置
	saveConfig(config) {
		try {
			uni.setStorageSync(CONFIG_KEY, config);
		} catch (e) {
			console.error('保存配置失败：', e);
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