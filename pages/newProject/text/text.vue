<template>
	<view class="container">
		<scroll-view class="scroll-container" scroll-y>
			<!-- 格式说明 -->
			<view class="format-guide">
				<view class="guide-header">
					<text class="guide-icon">📋</text>
					<text class="guide-title">格式说明</text>
				</view>
				<view class="guide-content">
					<view class="section">
						<text class="section-title">📋 第一部分：基本信息</text>
						<text class="required">🔴 必填项：</text>
						<text class="field-item">• 项目名称：xxx</text>
						<text class="field-item">• 项目地址：xxx</text>
						<text class="field-item">• 验收日期：YYYY-MM-DD</text>
						<text class="field-item">• 项目类型：[学校/办公楼/工业厂房/公寓小区/乡镇住宅/其他]</text>
						<text class="field-item">• 验收类型：[坡度/平整度/坡度加平整度]</text>
						<text class="field-item">• 验收状态：[未验收/已验收]</text>
						<text class="optional">🟡 选填项：</text>
						<text class="field-item">• 栋：xx栋</text>
						<text class="field-item">• 单元：xx单元</text>
						<text class="field-item">• 楼层：xx层</text>
						<text class="field-item">• 房号：xxx</text>
						<text class="field-item">• 项目质检员：xxx</text>
					</view>
					<view class="section">
						<text class="section-title">🏠 第二部分：房间和墙体数据</text>
						<text class="field-item">• 房间名称：墙体编号,坡度值,平整度值</text>
						<text class="note">💡 房间名称和墙体数据均为选填，可以只填写房间名称</text>
					</view>
				</view>
			</view>

			<!-- 示例文本 -->
			<view class="example-section">
				<view class="example-header">
					<text class="example-icon">📄</text>
					<text class="example-title">示例文本</text>
				</view>
				<view class="example-content" @click="copyExample">
					<text class="example-line">项目名称：衡阳示范小区</text>
					<text class="example-line">项目地址：湖南省衡阳市珠晖区东风路123号</text>
					<text class="example-line">验收日期：2024-03-21</text>
					<text class="example-line">项目类型：公寓小区</text>
					<text class="example-line">验收类型：坡度加平整度</text>
					<text class="example-line">验收状态：未验收</text>
					<text class="example-line">栋：</text>
					<text class="example-line">单元：2单元</text>
					<text class="example-line">楼层：</text>
					<text class="example-line">房号：601</text>
					<text class="example-line">项目质检员：</text>
					<text class="example-line"></text>
					<text class="example-line">客厅：A,2.5,1.8</text>
					<text class="example-line">客厅：B,3.2,2.1</text>
					<text class="example-line">卧室1：A,2.8,1.9</text>
					<text class="example-line">卧室2：</text>
					<text class="example-line">厨房：</text>
					<text class="example-line">卫生间：</text>
				</view>
				<text class="copy-tip">👆 点击示例文本可复制到剪贴板</text>
			</view>

			<!-- 文本输入区域 -->
			<view class="input-section">
				<view class="input-header">
					<view class="input-title-group">
						<text class="input-icon">✏️</text>
						<text class="input-title">项目信息输入</text>
					</view>
					<button class="paste-btn" @click="pasteFromClipboard">
						<text>一键粘贴</text>
					</button>
				</view>
				<textarea 
					class="text-input" 
					:value="inputText"
					placeholder="请粘贴或输入项目信息..."
					:class="{ 'error': hasError }"
					@input="onInput"
					:auto-height="true"
					:maxlength="-1"
				></textarea>
				<view v-if="errorMessage" class="error-message">
					<text class="error-icon">⚠️</text>
					<text>{{ errorMessage }}</text>
				</view>
			</view>

			<!-- 预览区域 -->
			<view v-if="parsedData" class="preview-section">
				<view class="preview-header">
					<text class="preview-icon">👁️</text>
					<text class="preview-title">解析结果预览</text>
				</view>
				<view class="preview-content">
					<view class="project-info">
						<text class="info-title">📋 项目信息</text>
						<text class="info-item">项目名称：{{ parsedData.projectInfo.title }}</text>
						<text class="info-item">项目地址：{{ parsedData.projectInfo.address }}</text>
						<text class="info-item">验收日期：{{ parsedData.projectInfo.date }}</text>
						<text class="info-item">项目类型：{{ parsedData.projectInfo.typeTag }}</text>
						<text class="info-item">验收类型：{{ parsedData.projectInfo.projectStatus }}</text>
						<text class="info-item">验收状态：{{ parsedData.projectInfo.inspectionStatus }}</text>
						<text v-if="parsedData.projectInfo.building" class="info-item">栋：{{ parsedData.projectInfo.building }}</text>
						<text v-if="parsedData.projectInfo.unit" class="info-item">单元：{{ parsedData.projectInfo.unit }}</text>
						<text v-if="parsedData.projectInfo.floor" class="info-item">楼层：{{ parsedData.projectInfo.floor }}</text>
						<text v-if="parsedData.projectInfo.roomNumber" class="info-item">房号：{{ parsedData.projectInfo.roomNumber }}</text>
						<text v-if="parsedData.projectInfo.inspector" class="info-item">项目质检员：{{ parsedData.projectInfo.inspector }}</text>
					</view>
					<view class="room-data">
						<text class="info-title">🏠 房间数据</text>
						<text v-for="(room, index) in parsedData.roomData" :key="index" class="info-item">
							{{ room.room || '未分类' }}：{{ room.wall || '' }}{{ room.slope ? ',' + room.slope : '' }}{{ room.flatness ? ',' + room.flatness : '' }}
						</text>
					</view>
				</view>
			</view>

			<!-- 底部占位区域，防止内容被底部按钮遮挡 -->
			<view class="bottom-spacer"></view>
		</scroll-view>

		<!-- 底部按钮 -->
		<view class="footer">
			<button class="preview-btn" @click="parseText" :disabled="!inputText.trim()">
				<text>预览解析</text>
			</button>
			<button class="create-btn" @click="createProject" :disabled="!parsedData">
				<text>创建项目</text>
			</button>
		</view>
	</view>
</template>

<script>
import DB from "@/api/sqlite.js";

export default {
	data() {
		return {
			inputText: '',
			parsedData: null,
			hasError: false,
			errorMessage: '',
			projectTypes: ['学校', '办公楼', '工业厂房', '公寓小区', '乡镇住宅', '其他'],
			packageTypes: ['坡度', '平整度', '坡度加平整度'],
			inspectionStatus: ['未验收', '已验收']
		}
	},
	methods: {
		onInput(e) {
			const value = e.detail ? e.detail.value : e.target.value;
			this.inputText = value;
			this.hasError = false;
			this.errorMessage = '';
			this.parsedData = null;
		},
		
		pasteFromClipboard() {
			uni.getClipboardData({
				success: (res) => {
					if (res.data && res.data.trim()) {
						this.$nextTick(() => {
							this.inputText = res.data.trim();
							this.hasError = false;
							this.errorMessage = '';
							this.parsedData = null;
						uni.showToast({
							title: '粘贴成功',
							icon: 'success'
							});
						});
					} else {
						uni.showToast({
							title: '剪贴板为空',
							icon: 'none'
						});
					}
				},
				fail: () => {
					uni.showToast({
						title: '粘贴失败',
						icon: 'none'
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
			
			// 复制到剪贴板
			uni.setClipboardData({
				data: exampleText,
				success: () => {
					uni.showToast({
						title: '示例文本已复制到剪贴板',
						icon: 'success'
					});
				},
				fail: () => {
					uni.showToast({
						title: '复制失败',
						icon: 'none'
					});
				}
			});
		},
		
		parseText() {
			if (!this.inputText.trim()) {
				this.showError('请输入项目信息');
				return;
			}
			
			try {
				const lines = this.inputText.split('\n').filter(line => line.trim());
				const projectInfo = {};
				const roomData = [];
				let currentSection = 'project'; // project 或 room
				
				for (let line of lines) {
					line = line.trim();
					if (!line) {
						continue;
					}
					
					if (line.includes('：')) {
						const [key, value] = line.split('：', 2);
						const cleanKey = key.trim();
						const cleanValue = value ? value.trim() : '';
						
						// 如果是项目基本信息字段
						if (['项目名称', '项目地址', '验收日期', '项目类型', '验收类型', '验收状态', 
							'栋', '单元', '楼层', '房号', '项目质检员'].includes(cleanKey)) {
							switch (cleanKey) {
								case '项目名称':
									projectInfo.title = cleanValue;
									break;
								case '项目地址':
									projectInfo.address = cleanValue;
									break;
								case '验收日期':
									projectInfo.date = cleanValue;
									break;
								case '项目类型':
									projectInfo.typeTag = cleanValue;
									break;
								case '验收类型':
									projectInfo.projectStatus = cleanValue;
									break;
								case '验收状态':
									projectInfo.inspectionStatus = cleanValue;
									break;
								case '栋':
									projectInfo.building = cleanValue;
									break;
								case '单元':
									projectInfo.unit = cleanValue;
									break;
								case '楼层':
									projectInfo.floor = cleanValue;
									break;
								case '房号':
									projectInfo.roomNumber = cleanValue;
									break;
								case '项目质检员':
									projectInfo.inspector = cleanValue;
									break;
							}
						} else {
							// 房间数据
							const roomName = cleanKey;
							const parts = cleanValue ? cleanValue.split(',').map(part => part.trim()) : [];
							
							roomData.push({
								room: roomName,
								wall: parts[0] || '',
								slope: parts[1] || '',
								flatness: parts[2] || ''
							});
						}
					}
				}
				
				// 验证必填项
				const requiredFields = ['title', 'address', 'date', 'typeTag', 'projectStatus', 'inspectionStatus'];
				for (let field of requiredFields) {
					if (!projectInfo[field]) {
						this.showError(`缺少必填项：${this.getFieldName(field)}`);
						return;
					}
				}
				
				// 验证项目类型
				if (!this.projectTypes.includes(projectInfo.typeTag)) {
					this.showError(`项目类型必须是：${this.projectTypes.join('、')}`);
					return;
				}
				
				// 验证验收类型
				if (!this.packageTypes.includes(projectInfo.projectStatus)) {
					this.showError(`验收类型必须是：${this.packageTypes.join('、')}`);
					return;
				}
				
				// 验证验收状态
				if (!this.inspectionStatus.includes(projectInfo.inspectionStatus)) {
					this.showError(`验收状态必须是：${this.inspectionStatus.join('、')}`);
					return;
				}
				
				// 验证日期格式
				const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
				if (!dateRegex.test(projectInfo.date)) {
					this.showError('验收日期格式必须为：YYYY-MM-DD');
					return;
				}
				
				// 验证房间数据
				if (roomData.length === 0) {
					this.showError('至少需要输入一个房间');
					return;
				}
				
				this.parsedData = {
					projectInfo,
					roomData
				};
				
				this.hasError = false;
				this.errorMessage = '';
				
				uni.showToast({
					title: '解析成功',
					icon: 'success'
				});
				
			} catch (error) {
				console.error('解析失败:', error);
				this.showError('解析失败，请检查格式');
			}
		},
		
		getFieldName(field) {
			const fieldNames = {
				title: '项目名称',
				address: '项目地址',
				date: '验收日期',
				typeTag: '项目类型',
				projectStatus: '验收类型',
				inspectionStatus: '验收状态'
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
					title: '请先解析文本',
					icon: 'none'
				});
				return;
			}
			
			const { projectInfo, roomData } = this.parsedData;
			
			// 设置默认图标
			const iconMap = {
				'学校': '/static/image/home1.png',
				'办公楼': '/static/image/home2.png',
				'工业厂房': '/static/image/home3.png',
				'公寓小区': '/static/image/home4.png',
				'乡镇住宅': '/static/image/home5.png',
				'其他': '/static/image/home6.png'
			};
			
			const values = [
				iconMap[projectInfo.typeTag] || '/static/image/home1.png',
				projectInfo.title,
				projectInfo.address,
				projectInfo.date,
				projectInfo.typeTag,
				projectInfo.building || '',
				projectInfo.unit || '',
				projectInfo.floor || '',
				projectInfo.roomNumber || '',
				projectInfo.inspector || '',
				projectInfo.projectStatus,
				projectInfo.inspectionStatus
			].map(val => `'${val}'`).join(', ');

			const sql = `INSERT INTO project (
				icon, title, address, date, type_tag,
				building, unit, floor, room_number, inspector,
				project_status, inspection_status
			) VALUES (${values})`;

			if (!DB.isOpen()) {
				DB.openSqlite().then(() => this.insertProject(sql, roomData));
			} else {
				this.insertProject(sql, roomData);
			}
		},
		
		insertProject(sql, roomData) {
			plus.sqlite.executeSql({
				name: DB.dbName,
				sql,
				success: () => {
					console.log("项目插入成功");
					// 获取最后插入的ID
					plus.sqlite.selectSql({
						name: DB.dbName,
						sql: "SELECT last_insert_rowid() as id",
						success: (result) => {
							const projectId = result[0].id;
							this.insertRoomData(projectId, roomData);
						},
						fail: (e) => {
							console.error("获取项目ID失败", e);
							uni.showToast({ title: '创建项目失败', icon: 'none' });
						}
					});
				},
				fail: (e) => {
					console.error("项目插入失败", e);
					uni.showToast({ title: '创建项目失败', icon: 'none' });
				}
			});
		},
		
		insertRoomData(projectId, roomData) {
			// 首先获取所有唯一的房间名称
			const uniqueSections = [...new Set(roomData.map(room => room.room))];
			let sectionsInserted = 0;
			let roomsInserted = 0;
			const totalSections = uniqueSections.length;
			const totalRooms = roomData.length;
			
			// 先插入sections表
			const insertSection = (section, index) => {
				const sectionSql = `INSERT INTO sections (
					project_id, name, sort_order
				) VALUES (${projectId}, '${section}', ${index})`;
				
				plus.sqlite.executeSql({
					name: DB.dbName,
					sql: sectionSql,
					success: () => {
						sectionsInserted++;
						if (sectionsInserted === totalSections) {
							// 所有sections插入完成后，开始插入wall_data
							roomData.forEach(room => insertRoom(room));
						}
					},
					fail: (e) => {
						console.error("房间数据插入失败", e);
						uni.showToast({ title: '房间数据插入失败', icon: 'none' });
					}
				});
			};
			
			const insertRoom = (room) => {
				const wallName = room.wall || '默认墙体';
				const roomSql = `INSERT INTO wall_data (
					project_id, section, wall_name, slope, flatness
				) VALUES (${projectId}, '${room.room || ''}', '${wallName}', '${room.slope || ''}', '${room.flatness || ''}')`;
				
				plus.sqlite.executeSql({
					name: DB.dbName,
					sql: roomSql,
					success: () => {
						roomsInserted++;
						if (roomsInserted === totalRooms) {
							uni.showToast({ title: '添加成功', icon: 'success' });
							setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000);
						}
					},
					fail: (e) => {
						console.error("墙体数据插入失败", e);
						uni.showToast({ title: '墙体数据插入失败', icon: 'none' });
					}
				});
			};
			
			// 开始插入sections
			uniqueSections.forEach((section, index) => insertSection(section, index));
		}
	}
}
</script>

<style scoped>
@import 'text.css';
</style>
