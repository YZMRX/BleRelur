<template>
	<view class="container">
		<!-- 顶部标题和说明 -->

		<!-- 文件信息 -->
		<view class="file-info">
			<view class="info-title">文件信息：</view>
			<view class="info-item">
				<text class="label">名称：</text>
				<text class="value">{{ fileName }}</text>
			</view>
			<view class="info-item">
				<text class="label">大小：</text>
				<text class="value">{{ fileSize }}</text>
			</view>
			<view class="info-item">
				<text class="label">创建时间：</text>
				<text class="value">{{ createTime }}</text>
			</view>
		</view>

		<!-- 项目信息表格 -->
		<view class="table-section">
			<view class="section-title">项目信息</view>
			<view class="table-wrapper">
				<table class="info-table">
					<tr v-for="(value, key) in formattedProjectInfo" :key="key">
						<td class="label-cell">{{ key }}：</td>
						<td class="value-cell">{{ value }}</td>
					</tr>
				</table>
			</view>
		</view>

		<!-- 预警设置表格 -->
		<view class="table-section" v-if="warningSettings">
			<view class="section-title">预警设置</view>
			<view class="table-wrapper">
				<table class="info-table">
					<tr v-if="projectInfo.projectStatus === '坡度' || projectInfo.projectStatus === '坡度加平整度'">
						<td class="label-cell">坡度预警值(mm/M)：</td>
						<td class="value-cell">{{ warningSettings.slopeWarning || '未设置' }}</td>
					</tr>
					<tr v-if="projectInfo.projectStatus === '平整度' || projectInfo.projectStatus === '坡度加平整度'">
						<td class="label-cell">平整度预警值(mm)：</td>
						<td class="value-cell">{{ warningSettings.flatnessWarning || '未设置' }}</td>
					</tr>
				</table>
			</view>
		</view>

		<!-- 墙体数据表格 -->
		<view class="table-section">
			<view class="section-title">墙体数据</view>
			<view class="table-wrapper">
				<table class="data-table">
					<thead>
						<tr>
							<th v-for="header in tableHeaders" :key="header">{{ header }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, index) in tableData" :key="index">
							<td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
						</tr>
					</tbody>
				</table>
			</view>
		</view>

		<!-- 底部操作按钮 -->
		<view class="footer">
			<view class="button-group">
				<button class="action-btn save" @click="saveAndShare">
					<text class="btn-text">保存并分享</text>
				</button>
				<button class="action-btn upload" @click="uploadToCloud">
					<text class="btn-text">上传到云端</text>
				</button>
				<button class="action-btn copy" @click="copyContent">
					<text class="btn-text">复制内容</text>
				</button>
				<button class="action-btn view" @click="viewFile">
					<text class="btn-text">查看文件</text>
				</button>
			</view>
		</view>

		<!-- 底部提示 -->
		<view class="tips">
			<view class="tips-title">提示：</view>
			<view class="tips-content">
				<text>- 支持的文件格式：CSV（逗号分隔值）</text>
				<text>- 建议使用 Excel、WPS 等表格软件打开查看</text>
				<text>- 如需编辑数据，请在编辑后重新导入系统</text>
			</view>
		</view>
	</view>
</template>

<script>
	import csvUtils from '@/utils/csvUtils.js';

	export default {
		data() {
			return {
				fileName: '',
				fileSize: '',
				createTime: '',
				content: '',
				tableHeaders: ['房间', '墙体', '坡度(mm/M)', '平整度(mm)'],
				tableData: [],
				projectInfo: null,
				warningSettings: null,
				savedFilePath: ''
			}
		},
		computed: {
			formattedProjectInfo() {
				if (!this.projectInfo) return {};
				return {
					'项目名称': this.projectInfo.title,
					'项目地址': this.projectInfo.address,
					'验收日期': this.projectInfo.date,
					'栋': this.projectInfo.building,
					'单元': this.projectInfo.unit,
					'楼层': this.projectInfo.floor,
					'房号': this.projectInfo.roomNumber,
					'项目类型': this.projectInfo.typeTag,
					'验收类型': this.projectInfo.projectStatus,
					'验收状态': this.projectInfo.inspectionStatus,
					'项目质检员': this.projectInfo.inspector
				};
			}
		},
		onLoad(options) {
			// 请求存储权限
			if (plus.os.name.toLowerCase() === 'android') {
				plus.android.requestPermissions(
					['android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.READ_EXTERNAL_STORAGE'],
					function(resultObj) {
						if (resultObj.granted.length === 2) {
							console.log('存储权限已授予');
						} else {
							uni.showToast({
								title: '请授予存储权限以保存文件',
								icon: 'none',
								duration: 2000
							});
						}
					},
					function(error) {
						console.error('请求权限失败:', error);
					}
				);
			}
			
			if (options.data) {
					try {
						const data = JSON.parse(decodeURIComponent(options.data));
						this.content = data.content;
						this.fileName = data.fileName;
						this.createTime = data.createTime;
						this.projectInfo = data.projectInfo;
						this.warningSettings = data.warningSettings;
						
						// 计算文件大小
						this.fileSize = this.calculateFileSize(this.content);
						
						// 根据项目信息设置表头
						this.setTableHeadersBasedOnProjectInfo();
						
						// 解析CSV数据为表格数据
						this.parseCSVToTable(this.content);

						// 检查数据是否为空
						if (this.tableData.length === 0 || (this.tableData.length === 1 && this.tableData[0].includes('暂无数据'))) {
							uni.showToast({
								title: '没有符合条件的数据',
								icon: 'none',
								duration: 2000
							});
						}
					} catch (error) {
						console.error('解析数据失败:', error);
						uni.showToast({
							title: '数据加载失败',
							icon: 'none'
						});
					}
				}
		},
		methods: {
			calculateFileSize(content) {
				// 使用csvUtils工具类计算文件大小
				return csvUtils.calculateFileSize(content);
			},
			parseCSVToTable(csvContent) {
				try {
					// 使用csvUtils工具类解析CSV内容
					const result = csvUtils.parseCSVContent(csvContent);
					if (result) {
						// 根据项目类型过滤表头和数据
						const projectType = this.projectInfo?.projectStatus;
						if (projectType) {
							let filteredHeaders = ['房间', '墙体'];
							let headerIndices = [0, 1]; // 房间和墙体的索引
							
							// 根据项目类型决定要显示的列
							if (projectType === '坡度') {
								filteredHeaders.push('坡度(mm/M)');
								if (result.headers.includes('坡度(mm/M)')) {
									headerIndices.push(result.headers.indexOf('坡度(mm/M)'));
								}
							} else if (projectType === '平整度') {
								filteredHeaders.push('平整度(mm)');
								if (result.headers.includes('平整度(mm)')) {
									headerIndices.push(result.headers.indexOf('平整度(mm)'));
								}
							} else if (projectType === '坡度加平整度') {
								if (result.headers.includes('坡度(mm/M)')) {
									filteredHeaders.push('坡度(mm/M)');
									headerIndices.push(result.headers.indexOf('坡度(mm/M)'));
								}
								if (result.headers.includes('平整度(mm)')) {
									filteredHeaders.push('平整度(mm)');
									headerIndices.push(result.headers.indexOf('平整度(mm)'));
								}
							}

							// 过滤数据行
							const filteredData = result.tableData.map(row => {
								return headerIndices.map(index => {
									// 确保索引有效
									return index < row.length ? row[index] : '';
								});
							}).filter(row => {
								// 过滤掉没有数据的行
								if (row.length <= 2) return false; // 只有房间和墙体的行
								if (row[0] === '' || row[1] === '') return false; // 房间或墙体为空的行
								if (projectType === '坡度') {
									return row[2] && row[2] !== ''; // 有坡度数据
								} else if (projectType === '平整度') {
									return row[2] && row[2] !== ''; // 有平整度数据
								} else if (projectType === '坡度加平整度') {
									return (row[2] && row[2] !== '') || (row[3] && row[3] !== ''); // 有任一数据
								}
								return false;
							});

							this.tableHeaders = filteredHeaders;
							this.tableData = filteredData;

							// 如果没有数据，添加一行"暂无数据"
							if (this.tableData.length === 0) {
								const emptyRow = ['暂无数据'];
								// 根据表头数量补充空单元格
								while (emptyRow.length < this.tableHeaders.length) {
									emptyRow.push('');
								}
								this.tableData = [emptyRow];
							}
						} else {
							this.tableHeaders = result.headers;
							this.tableData = result.tableData;
						}
					} else {
						// 如果解析失败，根据项目信息动态设置表头
						this.setTableHeadersBasedOnProjectInfo();
					}
				} catch (error) {
					console.error('解析CSV数据失败:', error);
					// 解析失败时，根据项目信息动态设置表头
					this.setTableHeadersBasedOnProjectInfo();
				}
			},
			setTableHeadersBasedOnProjectInfo() {
				if (!this.projectInfo) {
					// 默认表头
					this.tableHeaders = ['房间', '墙体'];
					return;
				}
				
				const inspectionType = this.projectInfo.projectStatus;
				let headers = ['房间', '墙体'];
				
				if (inspectionType === '坡度') {
					headers.push('坡度(mm/M)');
				} else if (inspectionType === '平整度') {
					headers.push('平整度(mm)');
				} else if (inspectionType === '坡度加平整度') {
					headers.push('坡度(mm/M)', '平整度(mm)');
				}
				
				this.tableHeaders = headers;
			},
			async saveAndShare() {
				try {
					// 使用csvUtils工具类处理CSV内容
					const csvContent = csvUtils.processCSVContent(this.content);
					
					// 先保存文件
					if (typeof plus !== 'undefined') {
						// App环境
						const fileName = this.fileName;
						let filePath = '';
						
						try {
							if (plus.os.name.toLowerCase() === 'android') {
								// Android环境下使用应用私有目录
								const main = plus.android.runtimeMainActivity();
								const Context = plus.android.importClass('android.content.Context');
								const File = plus.android.importClass('java.io.File');
								const FileOutputStream = plus.android.importClass('java.io.FileOutputStream');
								
								// 获取应用私有目录
								const filesDir = main.getExternalFilesDir(null);
								const appDir = new File(filesDir, 'exports');
								if (!appDir.exists()) {
									appDir.mkdirs();
								}
								
								// 创建文件
								const file = new File(appDir, fileName);
								filePath = file.getAbsolutePath();
								
								// 检查内容
								console.log('准备写入的内容长度:', csvContent.length);
								
								// 写入文件内容
								try {
									const FileOutputStream = plus.android.importClass('java.io.FileOutputStream');
									const OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter');
									const BufferedWriter = plus.android.importClass('java.io.BufferedWriter');
									
									// 创建输出流，使用GBK编码
									const fos = new FileOutputStream(file);
									const writer = new BufferedWriter(new OutputStreamWriter(fos, "GBK"));
									writer.write(csvContent);
									writer.flush();
									writer.close();
									
									// 验证文件是否写入成功
									const FileInputStream = plus.android.importClass('java.io.FileInputStream');
									const InputStreamReader = plus.android.importClass('java.io.InputStreamReader');
									const BufferedReader = plus.android.importClass('java.io.BufferedReader');
									
									const fis = new FileInputStream(file);
									const reader = new BufferedReader(new InputStreamReader(fis, "GBK"));
									const StringBuilder = plus.android.importClass('java.lang.StringBuilder');
									const sb = new StringBuilder();
									let line;
									while ((line = reader.readLine()) != null) {
										sb.append(line).append('\n');
									}
									reader.close();
									fis.close();
									
									const fileContent = sb.toString();
									console.log('文件写入后的内容长度:', fileContent.length);							
									if (fileContent.length === 0) {
										throw new Error('文件写入后内容为空');
									}
								} catch (writeError) {
									console.error('文件写入失败:', writeError);
									throw writeError;
								}
								
								console.log('文件保存路径:', filePath);
								this.savedFilePath = filePath;
								
								// 使用分享Intent
								try {
									const Intent = plus.android.importClass('android.content.Intent');
									const FileProvider = plus.android.importClass('androidx.core.content.FileProvider');
									const shareIntent = new Intent(Intent.ACTION_SEND);
									shareIntent.setType("text/csv");
									
									// 获取FileProvider URI
									const authority = main.getPackageName() + '.fileprovider';
									console.log('FileProvider authority:', authority);
									
									const contentUri = FileProvider.getUriForFile(main, authority, file);				
									// 验证文件大小
									console.log('文件大小:', file.length(), 'bytes');
									
									shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
									shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
									
									const chooser = Intent.createChooser(shareIntent, '分享文件');
									chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
									main.startActivity(chooser);
									
									uni.showToast({
										title: '请选择分享方式',
										icon: 'none'
									});
								} catch (shareError) {
									console.error('创建分享Intent失败:', shareError);
									// 如果分享失败，尝试复制文件到下载目录
									try {
										const Environment = plus.android.importClass('android.os.Environment');
										const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
										const targetFile = new File(downloadDir, fileName);
										
										// 复制文件
										const source = new File(filePath);
										const FileInputStream = plus.android.importClass('java.io.FileInputStream');
										const FileOutputStream = plus.android.importClass('java.io.FileOutputStream');
										const fis = new FileInputStream(source);
										const fos = new FileOutputStream(targetFile);
										const buffer = new plus.android.invoke('byte[]', 1024);
										let length;
										while ((length = fis.read(buffer)) > 0) {
											fos.write(buffer, 0, length);
										}
										fos.close();
										fis.close();
										
										// 验证复制后的文件
										const copiedFileSize = targetFile.length();
										console.log('复制后的文件大小:', copiedFileSize, 'bytes');
										
										if (copiedFileSize > 0) {
											uni.showToast({
												title: '文件已保存到下载目录',
												icon: 'success'
											});
											
											// 尝试打开文件
											plus.runtime.openFile(targetFile.getAbsolutePath());
										} else {
											throw new Error('复制后的文件为空');
										}
									} catch (copyError) {
										console.error('复制文件失败:', copyError);
										uni.showToast({
											title: '无法保存文件',
											icon: 'none'
										});
									}
								}
							} else {
								// iOS环境使用应用沙盒目录
								const publicDir = plus.io.convertLocalFileSystemURL('_doc');
								await new Promise((resolve, reject) => {
									plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
										fs.root.getDirectory('exports', { create: true }, (dirEntry) => {
											resolve(dirEntry);
										}, reject);
									}, reject);
								});
								
								filePath = publicDir + '/exports/' + fileName;
								
								// 写入文件
								const fileEntry = await new Promise((resolve, reject) => {
									plus.io.resolveLocalFileSystemURL('_doc/exports/', (entry) => {
										entry.getFile(fileName, { create: true }, (fileEntry) => {
											resolve(fileEntry);
										}, reject);
									}, reject);
								});

								await new Promise((resolve, reject) => {
									fileEntry.createWriter((writer) => {
										writer.onwrite = resolve;
										writer.onerror = reject;
										writer.write(csvContent);
									}, reject);
								});

								this.savedFilePath = filePath;
								
								// iOS分享
								plus.share.sendWithSystem({
									type: 'file',
									filePath: this.savedFilePath,
									success: () => {
										uni.showToast({
											title: '分享成功',
											icon: 'success'
										});
									},
									fail: (e) => {
										console.error('分享失败:', e);
										uni.showToast({
											title: '分享失败',
											icon: 'none'
										});
									}
								});
							}
						} catch (error) {
							console.error('分享文件失败:', error);
							uni.showToast({
								title: '分享失败，请重试',
								icon: 'none',
								duration: 2000
							});
						}
					} else {
						// H5环境
						const blob = new Blob([csvContent], { type: 'text/csv' });
						const url = URL.createObjectURL(blob);
						const link = document.createElement('a');
						link.href = url;
						link.download = this.fileName;
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
						URL.revokeObjectURL(url);
						uni.showToast({
							title: '文件已下载',
							icon: 'success'
						});
					}
				} catch (error) {
					console.error('保存或分享文件失败:', error);
					uni.showToast({
						title: '操作失败，请检查存储权限和剩余空间',
						icon: 'none',
						duration: 2000
					});
				}
			},
			uploadToCloud() {
				// 这里需要实现云端上传功能
				uni.showToast({
					title: '云端上传功能开发中',
					icon: 'none'
				});
			},
			copyContent() {
				try {
					// 使用csvUtils工具类处理CSV内容
					const csvContent = csvUtils.processCSVContent(this.content);
					
					// 复制到剪贴板
					uni.setClipboardData({
						data: csvContent,
						success: () => {
							uni.showToast({
								title: '已复制到剪贴板',
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
				} catch (error) {
					console.error('复制内容失败:', error);
					uni.showToast({
						title: '复制失败',
						icon: 'none'
					});
				}
			},
			viewFile() {
				try {
					// 使用csvUtils工具类处理CSV内容
					const csvContent = csvUtils.processCSVContent(this.content);
					
					if (typeof plus === 'undefined') {
						// H5环境：创建临时下载
						const blob = new Blob([csvContent], { type: 'text/csv' });
						const url = URL.createObjectURL(blob);
						window.open(url);
						URL.revokeObjectURL(url);
						return;
					}

					// App环境：先保存文件再打开
					const fileName = this.fileName;
					const filePath = '_downloads/' + fileName;

					try {
						// 检查文件是否存在
						plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
							entry.remove(() => {
								console.log('已删除旧文件');
								// 创建新文件
								this.createAndOpenFile(csvContent, fileName);
							}, (e) => {
								console.error('删除旧文件失败:', e);
								// 尝试创建新文件
								this.createAndOpenFile(csvContent, fileName);
							});
						}, (e) => {
							console.log('文件不存在，直接创建新文件');
							// 文件不存在，直接创建
							this.createAndOpenFile(csvContent, fileName);
						});
					} catch (e) {
						console.error('文件操作失败:', e);
						uni.showToast({
							title: '文件操作失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('查看文件失败:', error);
					uni.showToast({
						title: '查看文件失败',
						icon: 'none'
					});
				}
			},
			
			// 创建并打开文件的辅助方法
			createAndOpenFile(content, fileName) {
				const filePath = '_downloads/' + fileName;
				plus.io.resolveLocalFileSystemURL('_downloads/', (entry) => {
					entry.getFile(fileName, { create: true }, (fileEntry) => {
						fileEntry.createWriter((writer) => {
							writer.onwrite = () => {
								console.log('文件写入成功');
								// 打开文件
								plus.runtime.openFile(filePath, '', (e) => {
									console.error('打开文件失败:', e);
									uni.showToast({
										title: '没有找到可以打开此文件的应用程序',
										icon: 'none'
									});
								});
							};
							writer.onerror = (e) => {
								console.error('文件写入失败:', e);
								uni.showToast({
									title: '文件写入失败',
									icon: 'none'
								});
							};
							writer.write(content);
						}, (e) => {
							console.error('创建文件写入器失败:', e);
							uni.showToast({
								title: '文件操作失败',
								icon: 'none'
							});
						});
					}, (e) => {
						console.error('创建文件失败:', e);
						uni.showToast({
							title: '文件创建失败',
							icon: 'none'
						});
					});
				}, (e) => {
					console.error('获取下载目录失败:', e);
					uni.showToast({
						title: '获取存储目录失败',
						icon: 'none'
					});
				});
			}
		}
	}
</script>

<style scoped lang="scss">
@import url(preview.scss);
</style>
