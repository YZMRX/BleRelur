<template>
	<view class="main">
		<scroll-view scroll-y="true" class="scroll-view">
			<view class="container">
				<view class="section">
					<view class="form-title">项目信息</view>
					<view class="form-grid">
						<view class="form-item" v-for="item in projectFields" :key="item.key" :class="{'full-width': item.key === 'address' || item.key === 'title'}">
							<view v-if="item.key === 'address'" class="label-with-button">
								<text class="label">{{ item.label }}</text>
								<button class="location-btn" type="default" size="mini" @click="getLocation">
									<text class="location-text">获取定位</text>
								</button>
							</view>
							<text v-else class="label">{{ item.label }}</text>
							<view v-if="item.key === 'address'" class="address-container">
								<input class="input address-input" v-model="form[item.key]" :placeholder="'请输入' + item.label" />
							</view>
							<picker v-else-if="item.key === 'date'" mode="date" :value="form[item.key]" @change="onDateChange">
								<view class="picker-view">
									{{ form[item.key] || '请选择' + item.label }}
								</view>
							</picker>
							<input v-else class="input" v-model="form[item.key]" :placeholder="'请输入' + item.label" />
						</view>
					</view>
				</view>

				<view class="section">
					<view class="form-title">项目类型</view>
					<view class="type-grid">
						<view 
							v-for="(item, index) in typeOptions" 
							:key="item.name" 
							class="type-item"
							:class="{'active': form.type_tag === item.name}"
							@tap="onTypeSelect(index)"
						>
							<image :src="item.icon" class="type-icon" mode="aspectFit" />
							<text class="type-name">{{ item.name }}</text>
						</view>
					</view>
				</view>

				<view class="section">
					<view class="form-title">状态信息</view>
					<view class="form-grid">
						<view class="form-item">
							<text class="label">验收类型</text>
							<picker :range="packageOptions" @change="onPackageChange">
								<view class="picker-view">
									{{ form.project_status || '请选择验收类型' }}
								</view>
							</picker>
						</view>
						<view class="form-item">
							<text class="label">验收状态</text>
							<picker :range="inspectionStatusOptions" @change="onInspectionStatusChange">
								<view class="picker-view">
									{{ form.inspection_status || '请选择验收状态' }}
								</view>
							</picker>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>

		<view class="footer">
			<button class="submit-btn" @click="submit">提交项目</button>
		</view>
	</view>
</template>

<script>
import DB from "@/api/sqlite.js";

export default {
	data() {
		return {
			typeOptions: [
				{ name: '学校', icon: '/static/image/home1.png' },
				{ name: '办公楼', icon: '/static/image/home2.png' },
				{ name: '工业厂房', icon: '/static/image/home3.png' },
				{ name: '公寓小区', icon: '/static/image/home4.png' },
				{ name: '乡镇住宅', icon: '/static/image/home5.png' },
				{ name: '其他', icon: '/static/image/home6.png' }
			],
			packageOptions: ['坡度', '平整度', '坡度加平整度'],
			inspectionStatusOptions: ['未验收', '已验收'],
			projectFields: [
				{ key: 'title', label: '项目名称' },
				{ key: 'address', label: '项目地址' },
				{ key: 'date', label: '验收日期' },
				{ key: 'building', label: '栋' },
				{ key: 'unit', label: '单元' },
				{ key: 'floor', label: '楼层' },
				{ key: 'room_number', label: '房号' },
				{ key: 'inspector', label: '质检员' }
			],
			form: {
				icon: '/static/image/home1.png',
				type_tag: '',
				title: '',
				address: '',
				date: new Date().toISOString().split('T')[0],
				building: '',
				unit: '',
				floor: '',
				room_number: '',
				inspector: '',
				project_status: '坡度加平整度',
				inspection_status: '未验收'
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
				uni.showToast({ title: '请输入项目名称', icon: 'none' });
				return;
			}
			if (!this.form.address.trim()) {
				uni.showToast({ title: '请输入项目地址', icon: 'none' });
				return;
			}
			if (!this.form.date.trim()) {
				uni.showToast({ title: '请输入验收日期', icon: 'none' });
				return;
			}

			const values = [
				this.form.icon, this.form.title, this.form.address, this.form.date,
				this.form.type_tag, this.form.building, this.form.unit, this.form.floor,
				this.form.room_number, this.form.inspector, this.form.project_status,
				this.form.inspection_status
			].map(val => `'${val}'`).join(', ');

			const sql = `INSERT INTO project (
				icon, title, address, date, type_tag,
				building, unit, floor, room_number, inspector,
				project_status, inspection_status
			) VALUES (${values})`;

			if (!DB.isOpen()) {
				DB.openSqlite().then(() => this.insertProject(sql));
			} else {
				this.insertProject(sql);
			}
		},
		insertProject(sql) {
			plus.sqlite.executeSql({
				name: DB.dbName,
				sql,
				success: () => {
					console.log("插入成功");
					uni.showToast({ title: '添加成功', icon: 'success' });
					setTimeout(() => uni.navigateBack(), 1000);
				},
				fail: (e) => {
					console.error("插入失败", e);
					uni.showToast({ title: '添加失败', icon: 'none' });
				}
			});
		},
		async getLocation() {
			const that = this;
			uni.getLocation({
				type: 'wgs84',
				success(res) {
					// 逆地理编码（这里以腾讯位置服务为例，需替换为你自己的key）
					const qqMapKey = 'GN4BZ-LSR64-7DAUI-DB246-CUPM3-5HBMM';
					uni.request({
						url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${res.latitude},${res.longitude}&key=${qqMapKey}`,
						success(resp) {
							if (resp.data && resp.data.result) {
								// 优先用 recommend 字段
								const recommend = resp.data.result.formatted_addresses && resp.data.result.formatted_addresses.standard_address;
								const address = recommend || resp.data.result.address;
								that.form.address = address;
							} else {
								uni.showToast({ title: '定位失败', icon: 'none' });
							}
						},
						fail() {
							uni.showToast({ title: '定位失败', icon: 'none' });
						}
					});
				},
				fail() {
					uni.showToast({ title: '获取定位失败', icon: 'none' });
				}
			});
		}
	}
};
</script>

<style>
@import url('template.css');

</style>
