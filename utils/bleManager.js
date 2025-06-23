// 蓝牙连接状态管理
class BLEManager {
    constructor() {
        this.state = {
            deviceId: '',
            serviceId: '',
            serviceId2: '', // 第二个服务ID
            pzdCharacteristicId: '', // 平整度特征值ID
            pdCharacteristicId: '', // 坡度特征值ID
            connected: false,
            notifyEnabled: false,
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
            deviceId: '',
            serviceId: '',
            serviceId2: '',
            pzdCharacteristicId: '',
            pdCharacteristicId: '',
            connected: false,
            notifyEnabled: false,
        };
    }
}

export default new BLEManager(); 