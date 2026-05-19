/*
 * @Author       : TobeRey@Isrey.Com
 * @Date         : 2019-12-17
 * @FilePath     : \survey\index.js
 * @Description  :  Vue实例
 */

  // var App1 = new Vue({
    /*绑定标签的id*/
    //el: '#app2',
    /*标签上绑定的数据*/
    // data: {
     // show:true;
    //},
   // methods:{
    // btnClick: function () {
     //  document.getElementById('page').style.display = "none";  
	 //  document.getElementById('app1').style.display = "";  
	   
     //},
    //},
  //}); 
 
 // Vue实例

var app = new Vue({
    el: "#app1",
    data: {
        questions: [ // 题目数据
		
			{
                id: 1,
                title: '您是送货人员还是领料人员?',
                options: ['送货人员'],
                content: '',
                type: 'radio'
            },
            {
                id: 2,
                title: '您所评保管员 ：',
                options: [ '张海燕', '鹿甜甜', '尹帅', '李云', '梁剑', '夏广霞', '吕玉存', '曲焕英', '乔宁', '江莉', '李捷', '贾芳', '肖翠红', '赵娟', '邱莉', '刘宁', '葛安祥','王智宏','李娜娜','王瑞彤','赵娟','张立','武金香','邢亚楠','李开玉','栾兴华'],
                content: '',
                type: 'select'
            },
			{
                id: 3,
                title: '对仓库人员服务的整体满意度：',
                options: ['非常满意', '满意', '一般', '不满意______', '很不满意 ____'],
                content: '',
                type: 'radio'
            },
			{
                id: 4,
                title: '仓库收货及时率：',
                options: ['非常满意', '满意', '一般', '不满意______', '很不满意 ____'],
                content: '',
                type: 'radio'
            },
			{
                id: 5,
                title: '仓库吊装作业水平：',
                options: ['非常满意', '满意', '一般', '不满意______', '很不满意 ____'],
                content: '',
                type: 'radio'
            },
			{
                id: 6,
                title: '仓库人员沟通、服务态度：',
                options: ['非常满意', '满意', '一般', '不满意______', '很不满意 ____'],
                content: '',
                type: 'radio'
            },
			{
                id: 7,
                title: '仓库人员异常业务处理的专业性：',
                options: ['非常满意', '满意', '一般', '不满意______', '很不满意 ____'],
                content: '',
                type: 'radio'
            }, 
            {
                id: 8,
                title: '您对仓库服务还有哪些建议或意见：',
                options: '',
                content: '',
                type: 'text'
            }
			
        ],
        indexId:1// 页面索引
    }
});