<script>
import DB from "@/api/sqlite.js"
import Config from "@/api/config.js"

export default {
	globalData: {
		dbInitialized: false,
		deviceId: null,
		serviceId: null,
		characteristicId: null,
		connected: false
	},
	
	onLaunch: function () {

		this.initDatabase();
	},
	onShow: function () {
	},
	onHide: function () {
	},
	methods: {
		async initDatabase() {
			try {
				await this.openSQL();
				await this.createTables();
				
				// 检查是否首次启动
				if (Config.isFirstLaunch()) {
					await this.initSampleData();
					Config.markLaunched();
					console.log("示例数据初始化完成");
				}
				
				console.log("数据库初始化完成");
				// 设置全局状态
				this.globalData.dbInitialized = true;
			} catch (error) {
				console.error("数据库初始化失败:", error);
			}
		},
		deleteTable(table) {
				let open = DB.isOpen();
				if (open) {
					DB.deleteTable(table)
						.then(res => {
							this.showToast("删除表成功");
						})
						.catch(error => {
							console.log("删除表失败", error);
						});
				} else {
					this.showToast("数据库未打开");
				}
			},
		openSQL() {
			return new Promise((resolve, reject) => {
				let open = DB.isOpen();
				console.log("数据库状态", open ? "开启" : "关闭");
				if (!open) {
					DB.openSqlite()
						.then(res => {
							console.log("数据库已打开");
							resolve(res);
						})
						.catch(error => {
							console.log("数据库开启失败");
							reject(error);
						});
				} else {
					resolve(); // 数据库本来就已经打开
				}
			});
		},
		
		async createTables() {
			try {
				// 创建项目表
				await DB.createTable('project', `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"icon" TEXT,
					"title" TEXT NOT NULL,
					"address" TEXT NOT NULL,
					"date" TEXT NOT NULL,
					"type_tag" TEXT NOT NULL,
					"building" TEXT,
					"unit" TEXT,
					"floor" TEXT,
					"room_number" TEXT,
					"inspector" TEXT,
					"project_status" TEXT NOT NULL,
					"inspection_status" TEXT NOT NULL
				`);
				console.log('项目表创建成功');
				
				// 创建墙体数据表
				await DB.createTable('wall_data', `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"project_id" INTEGER NOT NULL,
					"section" TEXT,
					"wall_name" TEXT NOT NULL,
					"slope" TEXT,
					"flatness" TEXT,
					"image" TEXT,
					"measurements" TEXT DEFAULT '[]',
					FOREIGN KEY(project_id) REFERENCES project(id)
				`);
				console.log('墙体数据表创建成功');
				
				// 创建预警设置表
				await DB.createTable('warning_settings', `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"project_id" INTEGER NOT NULL,
					"slope_warning" REAL,
					"flatness_warning" REAL,
					FOREIGN KEY(project_id) REFERENCES project(id)
				`);
				console.log('预警设置表创建成功');
				
				// 创建房间表
				await DB.createTable('sections', `
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"project_id" INTEGER NOT NULL,
					"name" TEXT NOT NULL,
					"sort_order" INTEGER,
					FOREIGN KEY(project_id) REFERENCES project(id)
				`);
				console.log('房间表创建成功');
				
			} catch (error) {
				console.error('创建数据库表失败:', error);
				throw error;
			}
		},

		async initSampleData() {
			try {
				// 示例项目1：已验收的学校项目
				const project1 = {
					icon: '/static/image/home1.png',
					title: '示例学校项目',
					address: '北京市海淀区中关村大街1号',
					date: new Date().toISOString().split('T')[0],
					type_tag: '学校',
					building: 'A栋',
					unit: '1单元',
					floor: '3层',
					room_number: '301',
					inspector: '张工',
					project_status: '坡度加平整度',
					inspection_status: '已验收'
				};

				// 示例项目2：未验收的办公楼项目
				const project2 = {
					icon: '/static/image/home2.png',
					title: '示例办公楼项目',
					address: '上海市浦东新区陆家嘴环路1000号',
					date: new Date().toISOString().split('T')[0],
					type_tag: '办公楼',
					building: 'B栋',
					unit: '2单元',
					floor: '15层',
					room_number: '1503',
					inspector: '李工',
					project_status: '平整度',
					inspection_status: '未验收'
				};

				// 插入示例项目1
				const project1Id = await this.insertProject(project1);
				// 插入示例项目2
				const project2Id = await this.insertProject(project2);

				// 为项目1添加房间
				const sections1 = ['客厅', '主卧', '次卧', '卫生间'];
				for (let i = 0; i < sections1.length; i++) {
					await this.insertSection(project1Id, sections1[i], i + 1);
				}

				// 为项目2添加房间
				const sections2 = ['会议室', '办公区', '茶水间', '洽谈室'];
				for (let i = 0; i < sections2.length; i++) {
					await this.insertSection(project2Id, sections2[i], i + 1);
				}

				// 为项目1添加墙体数据
				const walls1 = [
					{ section: '客厅', name: '东墙', slope: '1.2', flatness: '2.5' },
					{ section: '客厅', name: '南墙', slope: '1.5', flatness: '2.8' },
					{ section: '主卧', name: '北墙', slope: '1.1', flatness: '2.3' },
					{ section: '主卧', name: '西墙', slope: '1.3', flatness: '2.6' }
				];

				for (const wall of walls1) {
					await this.insertWallData(project1Id, wall);
				}

				// 为项目2添加墙体数据
				const walls2 = [
					{ section: '会议室', name: '东墙', slope: '1.4', flatness: '2.7' },
					{ section: '会议室', name: '南墙', slope: '1.6', flatness: '2.9' },
					{ section: '办公区', name: '北墙', slope: '1.2', flatness: '2.4' }
				];

				for (const wall of walls2) {
					await this.insertWallData(project2Id, wall);
				}

				// 添加预警设置
				await this.insertWarningSettings(project1Id, 2.0, 3.0);
				await this.insertWarningSettings(project2Id, 1.8, 2.8);

				console.log("示例数据添加成功");
			} catch (error) {
				console.error("添加示例数据失败:", error);
				throw error;
			}
		},

		async insertProject(project) {
			const sql = `INSERT INTO project (
				icon, title, address, date, type_tag,
				building, unit, floor, room_number, inspector,
				project_status, inspection_status
			) VALUES (
				'${project.icon}', '${project.title}', '${project.address}', 
				'${project.date}', '${project.type_tag}', '${project.building}',
				'${project.unit}', '${project.floor}', '${project.room_number}',
				'${project.inspector}', '${project.project_status}', 
				'${project.inspection_status}'
			)`;

			return new Promise((resolve, reject) => {
				plus.sqlite.executeSql({
					name: DB.dbName,
					sql: sql,
					success: (e) => {
						// 获取插入的ID
						plus.sqlite.selectSql({
							name: DB.dbName,
							sql: 'SELECT last_insert_rowid() as id',
							success: (data) => resolve(data[0].id),
							fail: (e) => reject(e)
						});
					},
					fail: (e) => reject(e)
				});
			});
		},

		async insertSection(projectId, name, sortOrder) {
			const sql = `INSERT INTO sections (project_id, name, sort_order) 
						VALUES (${projectId}, '${name}', ${sortOrder})`;
			
			return new Promise((resolve, reject) => {
				plus.sqlite.executeSql({
					name: DB.dbName,
					sql: sql,
					success: () => resolve(),
					fail: (e) => reject(e)
				});
			});
		},

		async insertWallData(projectId, wall) {
			const sql = `INSERT INTO wall_data (
				project_id, section, wall_name, slope, flatness
			) VALUES (
				${projectId}, '${wall.section}', '${wall.name}', 
				'${wall.slope}', '${wall.flatness}'
			)`;

			return new Promise((resolve, reject) => {
				plus.sqlite.executeSql({
					name: DB.dbName,
					sql: sql,
					success: () => resolve(),
					fail: (e) => reject(e)
				});
			});
		},

		async insertWarningSettings(projectId, slopeWarning, flatnessWarning) {
			const sql = `INSERT INTO warning_settings (
				project_id, slope_warning, flatness_warning
			) VALUES (
				${projectId}, ${slopeWarning}, ${flatnessWarning}
			)`;

			return new Promise((resolve, reject) => {
				plus.sqlite.executeSql({
					name: DB.dbName,
					sql: sql,
					success: () => resolve(),
					fail: (e) => reject(e)
				});
			});
		}
	}
}

</script>

<style>
/*每个页面公共css */
</style>
