<template>
	<view>
		<view class="uni-divider uni-divider__content">Demo</view>
		<button @click="openSQL">打开数据库</button>
		<button @click="createTable">创建表</button>
		<button @click="insertTableData">新增表数据</button>
		<button @click="selectTableData">查询表数据</button>
		<button @click="updateTableData">修改表数据</button>
		<button @click="deleteTableData">按条件删除表数据</button>
		<button @click="closeSQL">关闭数据库</button>

		<view class="uni-divider__content" v-for="(item,index) in listData" :key='index'>
			<view>名字:{{item.title}}</view>
			<view>内容:{{item.address}}</view>
			<view>时间:{{item.date}}</view>
		</view>
	</view>
</template>

<script>
	import DB from "@/api/sqlite.js"
	export default {
		data() {
			return {
				listData: []
			};
		},
		onLoad() {
			this.openSQL();
		},

		methods: {
			// 打开数据库
			openSQL() {
				// 这个是查询有没有打开数据库
				let open = DB.isOpen();
				console.log("数据库状态", open ? "开启" : "关闭");
				if (!open) {
					DB.openSqlite()
						.then(res => {
							console.log("数据库已打开");
						})
						.catch(error => {
							console.log("数据库开启失败");
						});
				}
			},

			// 关闭数据库
			closeSQL() {
				// 这个是查询有没有打开数据库
				let open = DB.isOpen();
				if (open) {
					DB.closeSqlite()
						.then(res => {
							console.log("数据库已关闭");
						})
						.catch(error => {
							console.log("数据库关闭失败");
						});
				}
			},

			// 创建表
			createTable() {
				let open = DB.isOpen();
				if (open) {
					this.openSQL();
					let sql =
						'"id" INTEGER PRIMARY KEY AUTOINCREMENT,"icon" TEXT NOT NULL,"title" TEXT NOT NULL,"address" TEXT,"date" TEXT NOT NULL,"type_tag" TEXT,"building" TEXT,"unit" TEXT,"floor" TEXT,"room_number" TEXT,"inspector" TEXT,"project_status" TEXT,"inspection_status" TEXT';
					// 创建表 DB.createTable(表名, 表的列)
					DB.createTable("project", sql)
						.then(res => {
							console.log("创建project表成功");
						})
						.catch(error => {
							console.log("创建表失败");
						});
				} else {
					console.log("数据库未打开");
				}
			},
			// 新增表数据
			insertTableData() {
				let open = DB.isOpen();
				if (open) {
					let arr = [{
							icon: '/static/image/home1.png',
							title: '衡阳项目',
							address: '湖南省衡阳市蒸湘区蔡伦大道',
							date: '2023-08-01',
							type_tag: '校园',
							building: 'A栋',
							unit: '2单元',
							floor: '6层',
							room_number: 'A603',
							inspector: '张工',
							project_status: '进行中',
							inspection_status: '未验收'
						},
						{
							icon: '/static/image/home1.png',
							title: '衡阳项目',
							address: '湖南省衡阳市蒸湘区蔡伦大道',
							date: '2023-08-01',
							type_tag: '校园',
							building: 'A栋',
							unit: '2单元',
							floor: '6层',
							room_number: 'A603',
							inspector: '张工',
							project_status: '进行中',
							inspection_status: '未验收'
						},
						{
							icon: '/static/image/home1.png',
							title: '衡阳项目',
							address: '湖南省衡阳市蒸湘区蔡伦大道',
							date: '2023-08-01',
							type_tag: '校园',
							building: 'A栋',
							unit: '2单元',
							floor: '6层',
							room_number: 'A603',
							inspector: '张工',
							project_status: '进行中',
							inspection_status: '未验收'
						},
						{
							icon: '/static/image/home1.png',
							title: '衡阳项目',
							address: '湖南省衡阳市蒸湘区蔡伦大道',
							date: '2023-08-01',
							type_tag: '校园',
							building: 'A栋',
							unit: '2单元',
							floor: '6层',
							room_number: 'A603',
							inspector: '张工',
							project_status: '进行中',
							inspection_status: '未验收'
						},
						{
							icon: '/static/image/home1.png',
							title: '衡阳项目',
							address: '湖南省衡阳市蒸湘区蔡伦大道',
							date: '2023-08-01',
							type_tag: '校园',
							building: 'A栋',
							unit: '2单元',
							floor: '6层',
							room_number: 'A603',
							inspector: '张工',
							project_status: '进行中',
							inspection_status: '未验收'
						},
						{
							icon: '/static/image/home1.png',
							title: '衡阳项目',
							address: '湖南省衡阳市蒸湘区蔡伦大道',
							date: '2023-08-01',
							type_tag: '校园',
							building: 'A栋',
							unit: '2单元',
							floor: '6层',
							room_number: 'A603',
							inspector: '张工',
							project_status: '进行中',
							inspection_status: '未验收'
						}
					]
					let condition = ['icon', 'title', 'address', 'date', 'type_tag','building','unit','floor','room_number','inspector','project_status','inspection_status'];
					arr.map(item => {
						let sql =
							`'${item.icon}','${item.title}','${item.address}','${item.date}','${item.type_tag}','${item.building}','${item.unit}','${item.floor}','${item.room_number}','${item.inspector}','${item.project_status}','${item.inspection_status}'`;
						// 新增 DB.insertTableData(表名, 对应表头列的数据)
						DB.insertTableData("project", sql, condition)
							.then(res => {
								console.log("新增数据成功");
								this.selectTableData();
							})
							.catch(error => {
								console.log("失败", error);
							});
					})
				} else {
					this.showToast("数据库未打开");
				}
			},
			// 查询表数据
			selectTableData() {
				let open = DB.isOpen();
				if (open) {
					// 查询表 DB.selectTableData(表名,查询条件列名,查询条件列值)
					DB.selectTableData("project")
						.then(res => {
							console.log("contact表数据", res);
							this.listData = res;
						})
						.catch(error => {
							console.log("查询失败", error);
						});
				} else {
					this.showToast("数据库未打开");
				}
			},
			// 修改表数据
			updateTableData() {
				let open = DB.isOpen();
				if (open) {
					let time = this.formatDate(new Date().getTime());
					let data = `content = '我被修改了',time = '${time}'`;
					// 修改表数据 DB.updateTableData(表名, 要修改的列名=修改后列值, 修改条件的列名, 修改条件的列值)
					DB.updateTableData("chat", data, "name", "小明")
						.then(res => {
							this.showToast("更新chat表成功");
							this.selectTableData();
						})
						.catch(error => {
							console.log("修改失败", error);
						});
				} else {
					this.showToast("数据库未打开");
				}
			},
			//删除表	
			deleteTable() {
				let open = DB.isOpen();
				if (open) {
					DB.deleteTable("project")
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

			// 删除表数据
			deleteTableData() {
				let open = DB.isOpen();
				if (open) {
					// 删除表 DB.deleteTableData(表名,查询条件列名,查询条件列值)
					DB.deleteTableData("chat", "name", "小红")
						.then(res => {
							this.showToast("删除表数据成功");
							this.selectTableData();
						})
						.catch(error => {
							console.log("删除失败", error);
						});
				} else {
					this.showToast("数据库未打开");
				}
			},





			// 提示框
			showToast: function(str) {
				uni.showToast({
					icon: "none",
					title: str,
					mask: true
				});
			},

			// 时间戳转年月日
			formatDate(data) {
				let now = new Date(data);
				var year = now.getFullYear(); //取得4位数的年份
				var month =
					now.getMonth() + 1 < 10 ?
					"0" + (now.getMonth() + 1) :
					now.getMonth() + 1;
				var date = now.getDate() < 10 ? "0" + now.getDate() : now.getDate();
				var hour = now.getHours() < 10 ? "0" + now.getHours() : now.getHours();
				var minute =
					now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes();
				var second =
					now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds();
				return (
					year +
					"-" +
					month +
					"-" +
					date +
					" " +
					hour +
					":" +
					minute +
					":" +
					second
				);
			}
		}
	};
</script>
<style>

</style>