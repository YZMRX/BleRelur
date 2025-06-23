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
			<button class="submit-btn" @click="submit">修改项目</button>
		</view>
	</view>
</template>

<script>
import DB from "@/api/sqlite.js";

export default {
	data() {
		return {
			projectId: null,
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
				date: '',
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
				type: 'wgs84',
				success(res) {
					const qqMapKey = 'GN4BZ-LSR64-7DAUI-DB246-CUPM3-5HBMM';
					uni.request({
						url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${res.latitude},${res.longitude}&key=${qqMapKey}`,
						success(resp) {
							if (resp.data && resp.data.result) {
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
		},
		loadProjectById(id) {
			const sql = `SELECT * FROM project WHERE id = '${id}'`;
			if (!DB.isOpen()) {
				DB.openSqlite().then(() => this.fetchProject(sql));
			} else {
				this.fetchProject(sql);
			}
		},
		fetchProject(sql) {
			plus.sqlite.selectSql({
				name: DB.dbName,
				sql,
				success: (res) => {
					if (res && res.length > 0) {
						const project = res[0];
						for (const key in this.form) {
							if (project[key] !== undefined) {
								this.form[key] = project[key];
							}
						}
					}
				},
				fail: (err) => {
					console.error("查询失败", err);
					uni.showToast({ title: '加载失败', icon: 'none' });
				}
			});
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

			if (!DB.isOpen()) {
				DB.openSqlite().then(() => this.updateProject(sql));
			} else {
				this.updateProject(sql);
			}
		},
		updateProject(sql) {
			plus.sqlite.executeSql({
				name: DB.dbName,
				sql,
				success: () => {
					console.log("更新成功");
					uni.showToast({ title: '更新成功', icon: 'success' });
					setTimeout(() => uni.navigateBack(), 1000);
				},
				fail: (e) => {
					console.error("更新失败", e);
					uni.showToast({ title: '更新失败', icon: 'none' });
				}
			});
		}
	}
};
</script>

<style>
@import url('edit.css');
</style>