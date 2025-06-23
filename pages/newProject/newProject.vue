<template>
  <view class="container">
    <view class="header">
    </view>

    <view class="tip">请选择创建方式</view>

    <view class="option-list">
      <view class="option" @click="select('csv')">
        <image src="@/static/image/csv.png" class="icon" />
        <view class="info">
          <text class="main">通过CSV表格文件创建</text>
          <text class="sub">自定义验收表格的内容</text>
        </view>
      </view>

      <view class="option" @click="select('template')">
        <image src="@/static/image/template.png" class="icon" />
        <view class="info">
          <text class="main">通过通用模板创建</text>
          <text class="sub">通用性的房屋验收模板</text>
        </view>
      </view>

      <view class="option" @click="select('text')">
        <image src="@/static/image/text.png" class="icon" />
        <view class="info">
          <text class="main">通过文本创建</text>
          <text class="sub">根据规范创建文本，粘贴文本创建项目</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
	  select(type) {
	    if (type === 'csv') {
	      uni.navigateTo({ url: '/pages/newProject/csv/csv' });
	    } else if (type === 'template') {
	      uni.navigateTo({ url: '/pages/newProject/template/template' });
	    } else if (type === 'text') {
	      uni.navigateTo({ url: '/pages/newProject/text/text' });
	    }
	  }
    }
  }
</script>

<style scoped>
 @import url("newProject.css");
</style>
