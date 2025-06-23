<template>
	<view class="container">
		<scroll-view class="scroll-container" scroll-y>
			<!-- 内容区域 -->
			<view class="content-wrapper">
				<!-- 顶部标题栏 -->
				<view class="header">
					<view class="subtitle">请选择符合格式的CSV文件</view>
				</view>

				<!-- CSV格式说明 -->
				<view class="format-guide">
					<view class="guide-title">CSV文件格式说明：</view>
					<view class="guide-content">
						<text>1. 第一行为项目信息表头</text>
						<text>2. 第二行为项目信息数据</text>
						<text>3. 第三行为预警值设置</text>
						<text>4. 第四行为墙体数据表头</text>
						<text>5. 从第五行开始为房间数据，其中：</text>
						<text>- 房间名称为必填项（如：客厅）</text>
						<text>- 以下数据为可选项：</text>
						<text>- 墙体编号</text>
						<text>- 坡度值(mm/M)</text>
						<text>- 平整度值(mm)</text>
						<text>- 预警状态</text>
						<text>例如：</text>
						<text>完整格式："客厅","A","2.5","1.8","否"</text>
						<text>简单格式："客厅","A","",""</text>
					</view>
					<button class="download-btn" @click="downloadTemplate">下载CSV模板</button>
				</view>

				<!-- 文件选择区域 -->
				<view class="file-section">
					<view class="file-box" @click="chooseFile">
						<image v-if="!selectedFile" src="/static/image/csv.png" class="upload-icon"></image>
						<view v-if="!selectedFile" class="upload-text">点击选择CSV文件</view>
						<view v-else class="file-info">
							<text class="file-name">{{ selectedFile.name }}</text>
							<text class="file-size">{{ formatFileSize(selectedFile.size) }}</text>
						</view>
					</view>
				</view>

				<!-- 项目信息填写 -->
				<view v-if="previewData.length > 0" class="project-info">
					<view class="info-title">项目信息</view>
					<view class="input-group">
						<view class="input-row">
							<text class="input-label">项目名称：</text>
							<input class="input" v-model="projectInfo.title" placeholder="项目名称" />
						</view>
						<view class="input-row">
							<text class="input-label">项目地址：</text>
							<input class="input" v-model="projectInfo.address" placeholder="项目地址" />
						</view>
						<view class="input-row">
							<text class="input-label">验收日期：</text>
							<input class="input" v-model="projectInfo.date" placeholder="验收日期" />
						</view>
						<view class="input-row">
							<text class="input-label">栋：</text>
							<input class="input" v-model="projectInfo.building" placeholder="栋" />
						</view>
						<view class="input-row">
							<text class="input-label">单元：</text>
							<input class="input" v-model="projectInfo.unit" placeholder="单元" />
						</view>
						<view class="input-row">
							<text class="input-label">楼层：</text>
							<input class="input" v-model="projectInfo.floor" placeholder="楼层" />
						</view>
						<view class="input-row">
							<text class="input-label">房号：</text>
							<input class="input" v-model="projectInfo.roomNumber" placeholder="房号" />
						</view>
						<view class="input-row">
							<text class="input-label">项目类型：</text>
							<picker class="input" mode="selector" :range="typeOptions" range-key="name"
								@change="onProjectTypeChange">
								<view class="picker-text">{{ projectInfo.type || '选择项目类型' }}</view>
							</picker>
						</view>
						<view class="input-row">
							<text class="input-label">项目图标：</text>
							<view class="icon-wrapper">
								<image :src="projectInfo.icon" class="project-icon" mode="aspectFit" />
							</view>
						</view>
						<view class="input-row">
							<text class="input-label">验收类型：</text>
							<picker class="input" mode="selector" :range="inspectionTypes" @change="onInspectionTypeChange">
								<view class="picker-text">{{ projectInfo.inspectionType || '选择验收类型' }}</view>
							</picker>
						</view>
						<view class="input-row">
							<text class="input-label">验收状态：</text>
							<input class="input" v-model="projectInfo.inspectionStatus" placeholder="验收状态" />
						</view>
						<view class="input-row">
							<text class="input-label">项目质检员：</text>
							<input class="input" v-model="projectInfo.inspector" placeholder="项目质检员" />
						</view>
					</view>
				</view>

				<!-- 预警值设置 -->
				<view v-if="previewData.length > 0" class="warning-settings">
					<view class="info-title">预警值设置</view>
					<view class="input-group">
						<view class="input-row">
							<text class="input-label">坡度预警值(mm/M)：</text>
							<input class="input" type="number" v-model="warningSettings.slopeWarning"
								placeholder="坡度预警值(mm/M)" />
						</view>
						<view class="input-row">
							<text class="input-label">平整度预警值(mm)：</text>
							<input class="input" type="number" v-model="warningSettings.flatnessWarning"
								placeholder="平整度预警值(mm)" />
						</view>
					</view>
				</view>

				<!-- 预览区域 -->
				<view v-if="previewData.length > 0" class="preview-section">
					<view class="preview-title">数据预览</view>
					<view class="preview-table-container">
						<!-- 表头 -->
						<view class="table-header">
							<view class="table-cell" v-for="(header, index) in headers" :key="index">
								{{ header }}
							</view>
						</view>
						<!-- 数据行容器 -->
						<scroll-view scroll-y class="table-body">
							<view class="table-row" v-for="(row, rowIndex) in previewData" :key="rowIndex">
								<view class="table-cell" v-for="(cell, cellIndex) in row" :key="cellIndex">
									{{ cell || '-' }}
								</view>
							</view>
						</scroll-view>
					</view>
				</view>
				
				<!-- 底部占位，确保内容不被按钮遮挡 -->
				<view style="height: 120rpx;"></view>
			</view>
		</scroll-view>

		<!-- 底部按钮 -->
		<view class="footer">
			<button class="import-btn" :disabled="!canImport" @click="importData">
				导入数据
			</button>
		</view>
	</view>
</template>

<script>
	import DB from '@/api/sqlite.js';
	import csvUtils from '@/utils/csvUtils.js';
	export default {
	data() {
		return {
			selectedFile: null,
			headers: ['房间', '墙体', '坡度(mm/M)', '平整度(mm)', '预警状态'], // 默认表头，会根据验收类型动态调整
			previewData: [],
			projectInfo: {
				title: '',
				address: '',
				date: '',
				building: '',
				unit: '',
				floor: '',
				roomNumber: '',
				type: '',
				inspectionType: '',
				inspectionStatus: '',
				inspector: '',
				icon: '/static/image/home1.png'
			},
			typeOptions: [
				{ name: '学校', icon: '/static/image/home1.png' },
				{ name: '办公楼', icon: '/static/image/home2.png' },
				{ name: '工业厂房', icon: '/static/image/home3.png' },
				{ name: '公寓小区', icon: '/static/image/home4.png' },
				{ name: '乡镇住宅', icon: '/static/image/home5.png' },
				{ name: '其他', icon: '/static/image/home6.png' }
			],
			projectTypes: ['学校', '办公楼', '工业厂房', '住宅小区', '别墅'],
			inspectionTypes: ['坡度', '平整度', '坡度加平整度'],
			importInProgress: false,
			allData: [],
			warningSettings: {
				slopeWarning: '',
				flatnessWarning: ''
			}
		}
	},
	computed: {
		canImport() {
			return this.previewData.length > 0 &&
				this.projectInfo.title &&
				this.projectInfo.address &&
				this.projectInfo.type &&
				this.projectInfo.inspectionType &&
				!this.importInProgress;
		}
	},
	methods: {
		formatFileSize(bytes) {
			if (bytes === 0) return '0 B';
			const k = 1024;
			const sizes = ['B', 'KB', 'MB', 'GB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
		},
		showInspectionTypeEditTip() {
			const index = this.inspectionTypes.indexOf(this.projectInfo.inspectionType);
			uni.showActionSheet({
				itemList: this.inspectionTypes,
				success: (res) => {
					this.projectInfo.inspectionType = this.inspectionTypes[res.tapIndex];
					this.updatePreviewDataForHeaders();
				}
			});
		},
		chooseFile() {
			if (typeof plus !== 'undefined') {
				// App端使用plus的原生接口
				try {
					const main = plus.android.runtimeMainActivity();
					const Intent = plus.android.importClass('android.content.Intent');
					const intent = new Intent(Intent.ACTION_GET_CONTENT);
					intent.addCategory(Intent.CATEGORY_OPENABLE);
					intent.setType("text/comma-separated-values");  // 指定CSV类型

					main.onActivityResult = (requestCode, resultCode, data) => {
						if (requestCode === 1 && resultCode === -1) { // RESULT_OK = -1
							try {
								const uri = data.getData();
								const uriString = uri.toString();

								// 从URI中获取文件名
								let fileName = "unknown.csv";
								if (uriString.lastIndexOf('/') !== -1) {
									fileName = uriString.substring(uriString.lastIndexOf('/') + 1);
									// 解码URI，确保中文文件名正确显示
									try {
										fileName = decodeURIComponent(fileName);
									} catch (e) {
										console.error('解码文件名失败:', e);
									}
								}

								// 检查是否为CSV文件
								if (!fileName.toLowerCase().endsWith('.csv')) {
									uni.showToast({
										title: '请选择CSV文件',
										icon: 'none'
									});
									return;
								}

								// 导入所需的Java类
								const InputStream = plus.android.importClass("java.io.InputStream");
								const InputStreamReader = plus.android.importClass("java.io.InputStreamReader");
								const BufferedReader = plus.android.importClass("java.io.BufferedReader");
								const StringBuilder = plus.android.importClass("java.lang.StringBuilder");

								// 获取输入流
								const inputStream = plus.android.invoke(main.getContentResolver(), "openInputStream", uri);
								const isr = new InputStreamReader(inputStream, "UTF-8");
								const br = new BufferedReader(isr);
								const sb = new StringBuilder();

								// 读取文件内容
								let line = null;
								try {
									while ((line = br.readLine()) != null) {
										sb.append(line).append("\n");
									}
								} finally {
									// 确保关闭所有流
									try { br.close(); } catch (e) { console.error('关闭BufferedReader失败:', e); }
									try { isr.close(); } catch (e) { console.error('关闭InputStreamReader失败:', e); }
									try { inputStream.close(); } catch (e) { console.error('关闭InputStream失败:', e); }
								}

								const content = sb.toString();

								// 更新选中文件信息
								this.selectedFile = {
									name: fileName,
									path: uriString,
									size: content.length
								};

								// 解析CSV内容
								this.parseCSV(content);

							} catch (error) {
								console.error('读取文件失败:', error);
								uni.showToast({
									title: '读取文件失败',
									icon: 'none'
								});
							}
						}
					};

					// 启动文件选择器
					main.startActivityForResult(intent, 1);

				} catch (error) {
					console.error('启动文件选择器失败:', error);
					uni.showToast({
						title: '无法打开文件选择器',
						icon: 'none'
					});
				}
			} else {
				// H5环境下使用chooseFile
				uni.chooseFile({
					count: 1,
					extension: ['.csv'],
					success: (res) => {
						const file = res.tempFiles[0];
						this.selectedFile = {
							name: file.name,
							size: file.size,
							path: file.path
						};
						this.readCSVFile(file);
					},
					fail: (error) => {
						if (error.errMsg !== 'chooseFile:fail cancel') {
							uni.showToast({
								title: '选择文件失败',
								icon: 'none'
							});
						}
					}
				});
			}
		},
		readCSVFile(fileEntry) {
			if (typeof plus !== 'undefined') {
				// APP环境
				if (fileEntry.file) {
					fileEntry.file((file) => {
						const reader = new plus.io.FileReader();
						reader.onloadend = (e) => {
							if (e.target.result) {
								this.parseCSV(e.target.result);
							} else {
								uni.showToast({
									title: '文件内容为空',
									icon: 'none'
								});
							}
						};
						reader.onerror = (error) => {
							console.error('读取文件失败:', error);
							uni.showToast({
								title: '读取文件失败',
								icon: 'none'
							});
						};
						reader.readAsText(file, 'utf-8');
					}, (error) => {
						console.error('获取文件对象失败:', error);
						uni.showToast({
							title: '无法读取文件',
							icon: 'none'
						});
					});
				} else {
					plus.io.resolveLocalFileSystemURL(fileEntry.path || fileEntry, (entry) => {
						entry.file((file) => {
							const reader = new plus.io.FileReader();
							reader.onloadend = (e) => {
								if (e.target.result) {
									this.parseCSV(e.target.result);
								} else {
									uni.showToast({
										title: '文件内容为空',
										icon: 'none'
									});
								}
							};
							reader.onerror = (error) => {
								console.error('读取文件失败:', error);
								uni.showToast({
									title: '读取文件失败',
									icon: 'none'
								});
							};
							reader.readAsText(file, 'utf-8');
						});
					});
				}
			} else {
				// H5环境
				const reader = new FileReader();
				reader.onload = (e) => {
					this.parseCSV(e.target.result);
				};
				reader.onerror = (error) => {
					console.error('读取文件失败:', error);
					uni.showToast({
						title: '读取文件失败',
						icon: 'none'
					});
				};
				reader.readAsText(fileEntry);
			}
		},
		parseCSV(content) {
			try {
				console.log('开始解析CSV文件');
				// 处理不同的换行符
				content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

				// 按行分割
				const rows = content.split('\n')
					.map(row => row.trim())
					.filter(row => row); // 过滤空行

				console.log('CSV文件总行数:', rows.length);
				console.log('第一行内容:', rows[0]);
				console.log('第二行内容:', rows[1]);
				console.log('第三行内容:', rows[2]);

				// 解析项目基本信息
				const projectHeaders = rows[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
				const projectValues = rows[1].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

				console.log('项目信息表头:', projectHeaders);
				console.log('项目信息值:', projectValues);

				// 创建项目信息对象
				const projectInfo = {};
				projectHeaders.forEach((header, index) => {
					projectInfo[header] = projectValues[index] || '';
				});

				// 解析预警值设置（第三行）
				const warningLine = rows[2].split(',')[0] || '';
				const warningMatches = {
					slope: warningLine.match(/坡度预警值\(mm\/M\)：(\d+(\.\d+)?)/),
					flatness: warningLine.match(/平整度预警值\(mm\)：(\d+(\.\d+)?)/),
				};
				
				this.warningSettings = {
					slopeWarning: warningMatches.slope ? warningMatches.slope[1] : '',
					flatnessWarning: warningMatches.flatness ? warningMatches.flatness[1] : ''
				};

				console.log('解析到的预警值设置:', this.warningSettings);

				// 更新项目信息到表单，并确保正确的图标映射
				const typeIconMap = {
					'学校': '/static/image/home1.png',
					'办公楼': '/static/image/home2.png',
					'工业厂房': '/static/image/home3.png',
					'公寓小区': '/static/image/home4.png',
					'乡镇住宅': '/static/image/home5.png',
					'其他': '/static/image/home6.png'
				};

				const projectType = projectInfo['项目类型'] || '';
				const icon = typeIconMap[projectType] || '/static/image/home1.png';

				this.projectInfo = {
					title: projectInfo['项目名称'] || '',
					address: projectInfo['项目地址'] || '',
					date: projectInfo['验收日期'] || '',
					building: projectInfo['栋'] || '',
					unit: projectInfo['单元'] || '',
					floor: projectInfo['楼层'] || '',
					roomNumber: projectInfo['房号'] || '',
					type: projectType,
					inspectionType: projectInfo['验收类型'] || '',
					inspectionStatus: projectInfo['验收状态'] || '',
					inspector: projectInfo['项目质检员'] || '',
					icon: icon
				};

				// 跳过前两行（项目信息）和预警值设置行
				const dataRows = rows.slice(3);  // 修改这里，跳过前三行
				console.log('数据行数:', dataRows.length);

				// 验证数据表头（第四行是表头）
				const headers = dataRows[0].split(',')
					.map(h => h.trim().replace(/^["']|["']$/g, ''))
					.filter(h => h); // 过滤空的表头

				console.log('解析到的数据表头:', headers);
				
				const requiredHeaders = ['房间'];
				
				// 检查必需的表头是否存在
				if (!this.validateHeaders(headers, requiredHeaders)) {
					console.log('表头验证失败');
					uni.showToast({
						title: 'CSV格式不正确：缺少必需的房间列',
						icon: 'none',
						duration: 3000
					});
					return;
				}

				console.log('表头验证通过');

				// 确定各列的索引位置（不区分大小写，支持带引号的表头）
				const roomIndex = headers.findIndex(h => {
					const cleanHeader = h.toLowerCase().trim();
					return cleanHeader === '房间' || cleanHeader === '区域';
				});
				
				console.log('房间列索引:', roomIndex);

				const wallIndex = headers.findIndex(h => h.toLowerCase().trim() === '墙体');
				const slopeIndex = headers.findIndex(h => {
					const cleanHeader = h.toLowerCase().trim();
					return cleanHeader === '坡度(mm/m)' || 
						   cleanHeader === '坡度' || 
						   cleanHeader === '坡度（mm/m）';
				});
				const flatnessIndex = headers.findIndex(h => {
					const cleanHeader = h.toLowerCase().trim();
					return cleanHeader === '平整度(mm)' || 
						   cleanHeader === '平整度' || 
						   cleanHeader === '平整度（mm）';
				});

				console.log('列索引:', {
					roomIndex,
					wallIndex,
					slopeIndex,
					flatnessIndex
				});

				// 验证数据行
				console.log('开始处理数据行，原始数据行数:', dataRows.length);
				const validData = dataRows.slice(1).filter(row => {
					const cells = row.split(',')
						.map(cell => cell.trim().replace(/^["']|["']$/g, ''));
					
					// 检查是否有房间名
					const roomName = cells[roomIndex];
					console.log('检查房间名:', roomName);
					
					// 只要房间名不为空，就保留该行
					return roomName && roomName.length > 0;
				}).map(row => {
					const cells = row.split(',')
						.map(cell => {
							const value = cell.trim().replace(/^["']|["']$/g, '');
							// 如果值是"暂无数据"或空字符串，返回空字符串
							return (!value || value === '暂无数据') ? '' : value;
						});
					
					console.log('处理行数据:', cells);
					
					// 初始化结果数组
					const result = new Array(4).fill('');
					
					// 房间名称（必需）
					result[0] = cells[roomIndex] || '';
					
					// 墙体编号（可选）
					if (wallIndex > -1) {
						result[1] = cells[wallIndex] || '';
					}
					
					// 坡度数据（可选）
					if (slopeIndex > -1) {
						const slopeValue = cells[slopeIndex];
						result[2] = (slopeValue && !isNaN(parseFloat(slopeValue))) ? slopeValue : '';
					}
					
					// 平整度数据（可选）
					if (flatnessIndex > -1) {
						const flatnessValue = cells[flatnessIndex];
						result[3] = (flatnessValue && !isNaN(parseFloat(flatnessValue))) ? flatnessValue : '';
					}
					
					console.log('处理后的数据:', result);
					return result;
				});

				// 保存所有有效数据
				this.allData = validData;
				console.log('保存的所有数据:', this.allData);
				
				// 更新预览数据
				this.updatePreviewDataForHeaders();

				if (this.previewData.length > 0) {
					uni.showToast({
						title: '文件读取成功',
						icon: 'success'
					});
				}
			} catch (error) {
				console.error('解析CSV失败:', error);
				console.error('错误详情:', error.stack);
				uni.showToast({
					title: '解析文件失败',
					icon: 'none',
					duration: 3000
				});
			}
		},
		parseCSVContent(content) {
			try {
				// 使用csvUtils工具类解析CSV内容
				const result = csvUtils.parseCSVContent(content);
				if (!result) {
					uni.showToast({
						title: '解析CSV内容失败',
						icon: 'none'
					});
					return false;
				}
				
				// 项目信息字段映射
				const projectInfoMap = {
					'项目名称': 'title',
					'项目地址': 'address',
					'验收日期': 'date',
					'栋': 'building',
					'单元': 'unit',
					'楼层': 'floor',
					'房号': 'roomNumber',
					'项目类型': 'type',
					'验收类型': 'inspectionType',
					'验收状态': 'inspectionStatus',
					'项目质检员': 'inspector'
				};
				
				// 提取项目信息
				if (result.projectInfo) {
					// 初始化项目信息对象
					const projectInfo = {
						title: '',
						address: '',
						date: '',
						building: '',
						unit: '',
						floor: '',
						roomNumber: '',
						type: '',
						inspectionType: '',
						inspectionStatus: '',
						inspector: ''
					};
					
					// 使用映射关系填充项目信息
					Object.keys(result.projectInfo).forEach(key => {
						const mappedKey = projectInfoMap[key];
						if (mappedKey) {
							projectInfo[mappedKey] = result.projectInfo[key] || '';
						}
					});
					
					this.projectInfo = projectInfo;
				}
				
				// 提取预警设置
				if (result.warningSettings) {
					this.warningSettings = {
						slopeWarning: result.warningSettings.slopeWarning || '',
						flatnessWarning: result.warningSettings.flatnessWarning || ''
					};
				}
				
				// 验证表头
				const requiredHeaders = ['房间', '区域'];
				const hasRequiredHeader = requiredHeaders.some(h => result.headers.includes(h));
				
				if (!hasRequiredHeader) {
					uni.showToast({
						title: 'CSV格式不正确，缺少必要的房间/区域列',
						icon: 'none'
					});
					return false;
				}
				
				// 确定各列的索引位置
				const roomIndex = result.headers.findIndex(h => h === '房间' || h === '区域');
				const wallIndex = result.headers.findIndex(h => h === '墙体');
				const slopeIndex = result.headers.findIndex(h => h === '坡度(mm/M)' || h === '坡度');
				const flatnessIndex = result.headers.findIndex(h => h === '平整度(mm)' || h === '平整度');
				// 不再使用预警状态索引
				
				// 保存所有有效数据
				this.allData = result.tableData
					.filter(row => row[roomIndex] && row[roomIndex].length > 0) // 确保房间名称有效
					.map(row => {
						// 按照固定顺序返回数据
						return [
							row[roomIndex] || '', // 房间（必需）
							wallIndex > -1 ? (row[wallIndex] || '') : '', // 墙体（可选）
							slopeIndex > -1 ? (row[slopeIndex] || '') : '', // 坡度（可选）
							flatnessIndex > -1 ? (row[flatnessIndex] || '') : '' // 平整度（可选）
							// 不再包含预警状态
						];
					});
				
				// 根据验收类型更新表头和预览数据
				this.updatePreviewDataForHeaders();
				
				return true;
			} catch (error) {
				console.error('解析CSV内容失败:', error);
				uni.showToast({
					title: '解析CSV内容失败',
					icon: 'none'
				});
				return false;
			}
		},
		validateHeaders(headers, requiredHeaders) {
			if (!headers || headers.length === 0) {
				console.log('表头为空或不存在');
				return false;
			}
			
			console.log('当前表头:', headers);
			console.log('需要的表头:', requiredHeaders);
			
			// 检查必需的列是否存在（不区分大小写，支持带引号的表头）
			const result = requiredHeaders.every(required => {
				const found = headers.some(header => {
					// 移除可能的引号并清理空格
					const cleanHeader = header.replace(/^["']|["']$/g, '').trim();
					console.log(`比较: "${cleanHeader.toLowerCase()}" 与 "${required.toLowerCase()}"`);
					return cleanHeader.toLowerCase() === required.toLowerCase();
				});
				console.log(`查找表头 "${required}" 的结果:`, found);
				return found;
			});
			
			console.log('验证结果:', result);
			return result;
		},
		onProjectTypeChange(e) {
			const selected = this.typeOptions[e.detail.value];
			this.projectInfo.type = selected.name;
			this.projectInfo.icon = selected.icon;
		},
		onInspectionTypeChange(e) {
			this.projectInfo.inspectionType = this.inspectionTypes[e.detail.value];
			this.updatePreviewDataForHeaders();
		},
		updatePreviewDataForHeaders() {
			console.log('开始更新预览数据');
			console.log('当前验收类型:', this.projectInfo.inspectionType);
			console.log('可用数据:', this.allData);
			
			if (this.allData && this.allData.length > 0) {
				const inspectionType = this.projectInfo.inspectionType;
				
				// 更新表头
				if (inspectionType === '坡度') {
					this.headers = ['房间', '墙体', '坡度(mm/M)'];
				} else if (inspectionType === '平整度') {
					this.headers = ['房间', '墙体', '平整度(mm)'];
				} else {
					this.headers = ['房间', '墙体', '坡度(mm/M)', '平整度(mm)'];
				}
				
				console.log('设置的表头:', this.headers);
				
				// 处理预览数据
				this.previewData = this.allData.map((row, index) => {
					console.log(`处理第${index + 1}行数据:`, row);
					
					// 确保至少显示房间名和墙体名
					let displayRow;
					if (inspectionType === '坡度') {
						displayRow = [
							row[0] || '-',  // 房间名
							row[1] || '-',  // 墙体名
							row[2] || '-'   // 坡度数据
						];
					} else if (inspectionType === '平整度') {
						displayRow = [
							row[0] || '-',  // 房间名
							row[1] || '-',  // 墙体名
							row[3] || '-'   // 平整度数据
						];
					} else {
						displayRow = [
							row[0] || '-',  // 房间名
							row[1] || '-',  // 墙体名
							row[2] || '-',  // 坡度数据
							row[3] || '-'   // 平整度数据
						];
					}
					
					console.log('生成的显示行:', displayRow);
					return displayRow;
				});

				console.log('最终预览数据:', this.previewData);
			} else {
				this.previewData = [];
				console.log('没有数据可供预览');
			}
		},
		async importData() {
			if (this.importInProgress) return;

			// 验证必要信息
			if (!this.projectInfo.title || !this.projectInfo.address ||
				!this.projectInfo.type || !this.projectInfo.inspectionType) {
				uni.showToast({
					title: '请填写完整项目信息',
					icon: 'none'
				});
				return;
			}

			if (!this.allData || this.allData.length === 0) {
				uni.showToast({
					title: '没有可导入的数据',
					icon: 'none'
				});
				return;
			}

			this.importInProgress = true;
			uni.showLoading({
				title: '正在导入...'
			});

			try {
				// 1. 创建项目
				const projectId = await this.createProject();

				// 2. 创建房间和墙体数据
				await this.createSectionsAndWalls(projectId);

				uni.hideLoading();
				uni.showToast({
					title: '导入成功',
					icon: 'success'
				});

				// 导入成功后返回首页
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/index/index'
					});
				}, 1500);
			} catch (error) {
				uni.hideLoading();
				console.error('导入失败:', error);
				uni.showToast({
					title: '导入失败',
					icon: 'none'
				});
			} finally {
				this.importInProgress = false;
			}
		},
		async createProject() {
			try {
				// 获取正确的图标路径
				const typeIconMap = {
					'学校': '/static/image/home1.png',
					'办公楼': '/static/image/home2.png',
					'工业厂房': '/static/image/home3.png',
					'公寓小区': '/static/image/home4.png',
					'乡镇住宅': '/static/image/home5.png',
					'其他': '/static/image/home6.png'
				};

				// 构建项目数据
				const projectData = {
					icon: typeIconMap[this.projectInfo.type] || '/static/image/home1.png',
					title: this.projectInfo.title,
					address: this.projectInfo.address,
					date: this.projectInfo.date,
					type_tag: this.projectInfo.type,
					building: this.projectInfo.building,
					unit: this.projectInfo.unit,
					floor: this.projectInfo.floor,
					room_number: this.projectInfo.roomNumber,
					inspector: this.projectInfo.inspector,
					project_status: this.projectInfo.inspectionType,
					inspection_status: this.projectInfo.inspectionStatus || '未验收'
				};

				// 插入项目数据
				await DB.insertTableData(
					'project',
					`'${projectData.icon}','${projectData.title}','${projectData.address}','${projectData.date}','${projectData.type_tag}','${projectData.building}','${projectData.unit}','${projectData.floor}','${projectData.room_number}','${projectData.inspector}','${projectData.project_status}','${projectData.inspection_status}'`,
					'icon,title,address,date,type_tag,building,unit,floor,room_number,inspector,project_status,inspection_status'
				);

				// 获取刚插入的项目ID
				const projectIdResult = await new Promise((resolve, reject) => {
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

				if (!projectIdResult || projectIdResult.length === 0) {
					throw new Error('获取项目ID失败');
				}

				const projectId = projectIdResult[0].id;

				// 保存预警值设置
				if (this.warningSettings.slopeWarning || this.warningSettings.flatnessWarning) {
					const slopeWarning = this.warningSettings.slopeWarning ? parseFloat(this.warningSettings.slopeWarning) : null;
					const flatnessWarning = this.warningSettings.flatnessWarning ? parseFloat(this.warningSettings.flatnessWarning) : null;
					
					const warningValues = [];
					const warningColumns = [];
					
					if (slopeWarning !== null) {
						warningValues.push(slopeWarning);
						warningColumns.push('slope_warning');
					}
					
					if (flatnessWarning !== null) {
						warningValues.push(flatnessWarning);
						warningColumns.push('flatness_warning');
					}
					
					if (warningValues.length > 0) {
						await DB.insertTableData(
							'warning_settings',
							`${projectId},${warningValues.join(',')}`,
							`project_id,${warningColumns.join(',')}`
						);
					}
				}

				return projectId;
			} catch (error) {
				console.error('创建项目失败:', error);
				throw error;
			}
		},
		async createSectionsAndWalls(projectId) {
			try {
				// 收集所有唯一的房间名
				const sections = [...new Set(this.allData.map(row => row[0]))];				

				// 创建房间
				for (let i = 0; i < sections.length; i++) {
					await DB.insertTableData(
						'sections',
						`null,${projectId},'${sections[i]}',${i}`,
						'id,project_id,name,sort_order'
					);
				}

				// 创建墙体数据
				for (const row of this.allData) {
					const section = row[0] || '';
					const wallName = row[1] || '';
					let slope = row[2] || '';
					let flatness = row[3] || '';
					
					// 如果没有墙体名称，跳过创建墙体数据
					if (!wallName || wallName === '暂无数据') {
						continue;
					}

					// 根据验收类型处理数据
					const inspectionType = this.projectInfo.inspectionType;
					if (inspectionType === '坡度') {
						flatness = ''; // 清空平整度数据
					} else if (inspectionType === '平整度') {
						slope = ''; // 清空坡度数据
					}

					// 创建墙体数据
					await DB.insertTableData(
						'wall_data',
						`null,${projectId},'${section}','${wallName}','${slope}','${flatness}',''`,
						'id,project_id,section,wall_name,slope,flatness,image'
					);
				}
			} catch (error) {
				console.error('创建房间和墙体数据失败:', error);
				throw error;
			}
		},
		async downloadTemplate() {
			const templateContent =
				`项目名称,项目地址,验收日期,栋,单元,楼层,房号,项目类型,验收类型,验收状态,项目质检员
"示例小区","湖南省长沙市岳麓区xxx路123号","2024-03-21","1栋","2单元","3层","301","公寓小区","坡度加平整度","未验收","张工"
预警值设置：坡度预警值(mm/M)：3，平整度预警值(mm)：2
房间,墙体,坡度(mm/M),平整度(mm),预警状态
"客厅","A","2.5","1.8","是"
"客厅","B","3.2","2.1","是"
"客厅","C","","",""
"卧室1","A","2.8","1.9","是"
"卧室1","B","","",""
"卧室2","暂无数据","","",""
"厨房","A","2.7","1.7","是"
"厨房","B","","",""
"卫生间","A","2.5","1.8","是"
"阳台","暂无数据","","",""`;

			try {
				if (typeof plus !== 'undefined') {
					// App环境
					const fileName = 'wall_measurement_template.csv';
					const filePath = '_downloads/' + fileName;

					// 写入文件
					const fileEntry = await new Promise((resolve, reject) => {
						plus.io.resolveLocalFileSystemURL('_downloads/', (entry) => {
							entry.getFile(fileName, { create: true }, (fileEntry) => {
								resolve(fileEntry);
							}, reject);
						}, reject);
					});

					await new Promise((resolve, reject) => {
						fileEntry.createWriter((writer) => {
							writer.onwrite = resolve;
							writer.onerror = reject;
							writer.write(templateContent);
						}, reject);
					});

					uni.showToast({
						title: '模板已保存到下载目录',
						icon: 'success'
					});

					// 打开文件
					plus.runtime.openFile('_downloads/' + fileName);
				} else {
					// H5环境
					const blob = new Blob([templateContent], { type: 'text/csv' });
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = 'wall_measurement_template.csv';
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}
			} catch (error) {
				console.error('下载模板失败:', error);
				uni.showToast({
					title: '下载模板失败',
					icon: 'none'
				});
			}
		}
	}
}
</script>

<style scoped lang="scss">
@import './csv.scss';

.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f5f5f5;
	position: relative;
}

.scroll-container {
	flex: 1;
	height: calc(100vh - 120rpx); // 减去底部按钮的高度
}

.content-wrapper {
	padding-bottom: 20rpx;
}

.footer {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 120rpx;
	background-color: #fff;
	padding: 20rpx;
	box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
	z-index: 100;

	.import-btn {
		width: 100%;
		height: 80rpx;
		line-height: 80rpx;
		background-color: #007AFF;
		color: #fff;
		border-radius: 40rpx;
		font-size: 32rpx;
		border: none;

		&:disabled {
			background-color: #ccc;
			color: #fff;
		}

		&:active {
			opacity: 0.8;
		}
	}
}

// 确保内容不会被底部按钮遮挡
.preview-section {
	margin: 20rpx;
	background-color: #fff;
	border-radius: 10rpx;
	padding: 20rpx;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.preview-title {
	font-size: 32rpx;
	font-weight: bold;
	margin-bottom: 20rpx;
	color: #333;
}

.preview-table-container {
	width: 100%;
	border: 1px solid #eee;
	border-radius: 8rpx;
}

.table-header {
	display: flex;
	background-color: #f8f9fa;
	border-bottom: 1px solid #eee;
}

.table-body {
	max-height: 600rpx;
}

.table-row {
	display: flex;
	border-bottom: 1px solid #eee;
}

.table-row:last-child {
	border-bottom: none;
}

.table-cell {
	flex: 1;
	padding: 20rpx;
	text-align: center;
	font-size: 28rpx;
	color: #333;
	word-break: break-all;
	min-width: 120rpx;
}

.table-header .table-cell {
	font-weight: bold;
	color: #666;
}
</style>
