/*
 * @Author       : TobeRey@Isrey.Com
 * @Date         : 2019-12-17
 * @FilePath     : \survey\components.js
 * @Description  : 子组件
 */

// 单选按钮组件


Vue.component('q-radio', {
    template: `
    <div class="radio">
        <template v-for="(item, index) in options">
            <label>
                <input type="radio" 
                :value="item" 
                v-model="picked"
                >
                {{item}}
				
            </label>
        </template>
    </div>
    `,
    props: { // 从父级通过v-bind方式传过来的数据。
        options: { // 选项数据
            type: Array,
            default: []
        },
        qIndex: { // 当前题目索引
            type: Number,
            default: 0
        }
    },
    data: function () { // 自定义数据
        return {
            picked:bus.$data.answers[this.qIndex - 1] 
			
			// 已经选项 用v-model绑定
        }
		
    },
	 /* methods:{
	  leftChange(bus.$data.answers[this.qIndex - 1],index) {
	  		//当前的背景颜色赋给当前点击的索引
             if(bus.$data.answers[this.qIndex - 1])
			 {this.checked = true;}
		 else{
			 this.checked = false;
		 }
		 }}, */
    watch: { // 监听数据变化
        picked: function (val) { // 监听已选择的数据变化 val[String] 已选项
            if (val) {// 若已选项不为空
                bus.$emit('on-enable-next', true) // 启用"下一步"按钮
                
				 // 保存已选项数据
				if(!bus.$data.answers[this.qIndex])
				{
					  // 清空已经保存的数据
						bus.$data.answers[this.qIndex - 1] = val; 
				}
				//alert(this.qIndex);
				//bus.$data.answers[this.indexId - 1]
				//bus.$data.answers[this.qIndex - 1]
            }
        }
    },
    mounted: function () { // 元素已挂载时执行
        var _this = this; // 保持this指向
		   bus.$on('on-reset', function (index) { // 监听重置按钮事件{{ item }}
			
           
				if (_this.qIndex === index) { // 若保存的数据索引等于于页面题目索引
               //alert(bus.$data.answers[index]);
				_this.picked = '';
				}
			
			
        }),
        bus.$on('on-reset2', function (index) { // 监听重置按钮事件{{ item }}
			
            if(bus.$data.answers[index] && _this.qIndex === index )
			{
				      //alert(index);
					// 若保存的数据索引等于于页面题目索引
				    
					_this.picked = bus.$data.answers[index]    // 清空已经保存的数据
					
			}
			else 
			{
				if (_this.qIndex === index) { // 若保存的数据索引等于于页面题目索引
               //alert(bus.$data.answers[index]);
				_this.picked = '';
				}
			
			}
        }),
		bus.$on('on-reset1', function (index) { // 监听重置按钮事件{{ item }}
			
            if(bus.$data.answers[index-2] && _this.qIndex === index )
			{
				     // alert(index);
					// 若保存的数据索引等于于页面题目索引
				    
					_this.picked = bus.$data.answers[index-2]    // 清空已经保存的数据
					
			}
			else 
			{
				if (_this.qIndex === index&&index ==1) { // 若保存的数据索引等于于页面题目索引
               //alert(bus.$data.answers[0]);
				_this.picked = bus.$data.answers[0];
				}
			
			}
        }
		);
    },
});

// 多选按钮组件
Vue.component('q-select', {
    template:`
	<div class="select">
	<template> 
	<select v-model="selected">
        <option class="items" v-for="(item, index) in options" :key="index" :value="item"  >
          {{ item }}   
        </option>
		</select>
	</template>
    </div>
    `,
	
    props: { // 从父级通过v-bind方式传过来的数据。 
        options: { // 选项数据
            type: Array,
            default: []
        },
        qIndex: { // 当前题目索引
            type: Number,
            default: 0
        }
    },
    data: function () {
        return {
            selected: bus.$data.answers[this.qIndex - 1] // 已经选项 用v-model绑定 {{ item }}   
        }
    },
    watch: { // 监听数据变化
        selected: function (val) { // 监听已选择的数据变化 val[Array] 已选项
            if (val) { // 若已选项大于2项小于3项
                bus.$emit('on-enable-next', true) // 启用"下一步"按钮
                bus.$data.answers[this.qIndex - 1] = val; // 保存已选项数据
            } else {
                bus.$emit('on-enable-next', false) // 禁用"下一步"按钮
            }
        }
    },
    mounted: function () { // 元素已挂载时执行
        var _this = this; // 保持this指向
         bus.$on('on-reset', function (index) { // 监听重置按钮事件
            if (_this.qIndex === index) { // 若保存的数据索引于页面题目索引
                _this.selected = []  // 清空已经保存的数据
            }
        }) 
		bus.$on('on-reset2', function (index) { // 监听重置按钮事件{{ item }}
			//alert(index);
            if(bus.$data.answers[index] && _this.qIndex === index )
			{
				     //alert(index);
					// 若保存的数据索引等于于页面题目索引
				    
					_this.selected = [bus.$data.answers[index]]    // 清空已经保存的数据
					
			}
			else 
			{
				if (_this.qIndex === index) { // 若保存的数据索引等于于页面题目索引
               //alert(bus.$data.answers[index]);
				_this.selected = [];
				}
			
			}
        });
		bus.$on('on-reset1', function (index) { // 监听重置按钮事件{{ item }}
			
            if(bus.$data.answers[index-2] && _this.qIndex === index&&index!=2 )
			{
				     // 
					// 若保存的数据索引等于于页面题目索引
				    
					_this.selected = [bus.$data.answers[index-2]]    // 清空已经保存的数据
					
			}
			else 
			{
				//alert(bus.$data.answers[0]);
				if (_this.qIndex === index&&index ==2) { // 若保存的数据索引等于于页面题目索引
               //
				_this.selected = bus.$data.answers[0];
				//console.log(_this.picked);
				}
			
			}
        }
		);
    },
});

// 文本框组件
Vue.component('q-text', {
    template: `
    <textarea v-model="introduce"></textarea>
    `,
    props: { // 从父级通过v-bind方式传过来的数据。
        content: { // 文字内容
            type: String,
            default: ''
        },
        qIndex: { // 当前题目索引
            type: Number,
            default: 0
        }
    },
    data: function () {
        return {
            introduce: bus.$data.answers[this.qIndex - 1] // 已填内容 用v-model绑定
        }
    },
    watch: {
        introduce: function (val) { // 监听已选择的数据变化 val[String] 已填内容
            if (val.length >= 3) { // 若已填内容大于10字
                bus.$emit('on-enable-next', true) // 启用"下一步"按钮
                bus.$data.answers[this.qIndex - 1] = val;// 保存已选项数据
				
            }
        }
    },
    mounted: function () { // 元素已挂载时执行
        var _this = this; // 保持this指向
         bus.$on('on-reset', function (index) { // 监听重置按钮事件
            if (_this.qIndex === index) { // 若保存的数据索引于页面题目索引
                _this.introduce = '' // 保存已填内容
            }
        }) 
		bus.$on('on-reset2', function (index) { // 监听重置按钮事件{{ item }}
			
            if(bus.$data.answers[index] && _this.qIndex === index )
			{
				     // alert(index);
					// 若保存的数据索引等于于页面题目索引
				    
					_this.introduce = bus.$data.answers[index]    // 清空已经保存的数据
					
			}
			else 
			{
				if (_this.qIndex === index) { // 若保存的数据索引等于于页面题目索引
				//alert('kong');
				_this.introduce = '';
				}
			
			}
        }),
		bus.$on('on-reset1', function (index) { // 监听重置按钮事件{{ item }}
			
            if(bus.$data.answers[index-2] && _this.qIndex === index )
			{
				     // alert(index);
					// 若保存的数据索引等于于页面题目索引
				    
					_this.introduce = bus.$data.answers[index-2]    // 清空已经保存的数据
					
			}
			else 
			{
				if (_this.qIndex === index&&index ==1) { // 若保存的数据索引等于于页面题目索引
               //alert(bus.$data.answers[0]);
				_this.introduce = bus.$data.answers[0];
				}
			
			}
        }
		);
    },
});
//默认上一步按钮启用
//
Vue.component('q-button', {
    template: `
    <div class="btn-group">
        
		<button 
        v-if="!first" 
        :disabled="prevenDisabled"
        @click="handlerPrev">上一步</button>
		<button 
        @click="handlerReset">重置</button>
        <button 
        v-if="!last" 
        :disabled="nextDisabled"
        @click="handlerNext">下一步</button>
        <button 
        v-if="last" 
        @click="handlerSubmit">提交</button>
        
    </div>
    `,
    props: { // 从父级通过v-bind方式传过来的数据。
        qLength: { // 题目数量
            type: Number,
            default: 0
        },
        indexId: {// 当前题目索引
            type: Number,
            default: 1
        },
        value: { // 用于组件v-model双向绑定
            type: [Number, String]
        }
    },
    data: function () {
        return {
            currentIndex: this.indexId, //默认当前题目索引
            nextDisabled: true, //默认"下一步"”"按钮为禁用
            prevenDisabled: false // 默认"上一步"按钮启用
        }
    },
    computed: {
        first: function () { // 用于按钮判断是否为第一题
            return this.indexId === 1
        },
        last: function () { // 用于按钮判断是否为最后第一题
            return this.qLength === this.indexId
        }
    },
    methods: {
        handlerPrev: function () { // "上一步"按钮单击事件
            this.currentIndex = this.currentIndex <= 1 ? 1 : this.currentIndex - 1; // 题目索引-1
				//alert(bus.$data.answers[this.indexId-2]);
				bus.$emit('on-reset1', this.indexId); 
				this.nextDisabled = false; 
			
            console.log(bus.$data.answers);
			
        },
        handlerNext: function () { // "下一步"按钮单击事件
		//Object.assign(this.$data, this.$options.data()
            this.currentIndex = this.currentIndex >= this.qLength ? this.qLength : this.currentIndex + 1; //题目索引+1
            //如果当前值不为空是启用状态
			//alert(this.qLength);
			
			if(bus.$data.answers[this.indexId]){
				bus.$emit('on-reset', this.indexId); 
				this.nextDisabled = false; 
            }
			else{
				this.nextDisabled = true; 
			}
			
			bus.$emit('on-reset2', this.indexId); 
			// 禁用"下一步"按钮
            console.log(bus.$data.answers);
        },
        handlerSubmit: function () { // "提交"按钮单击事件
            if (bus.$data.answers.length < this.qLength-1) { // 判断是否答题完毕
                alert('提交失败，题目未答完!');
            } 
			else
				{
		var a = bus.$data.answers;
		var s = a.toString();
	    
		
				  var jsonString =  '{ "req": "4241Req", "data":"'+bus.$data.answers+'"}'
				  //alert(jsonString)
				  axios.post('/ckPingjiainsert',window.Qs.stringify({ "req": "4241Req", "data":'{"data1":"'+s+'"}'})
			).then((response) => {
				 alert("感谢您的支持");
		  window.location.href="/index_ck2.html";
		  this.nextDisabled = true;
        }).catch((response) => {
          console.log("错误")
        }) ; 
            } 
        },
        handlerReset: function () { // "重置"按钮单击事件
            if (bus.$data.answers[this.indexId - 1]) { // 如果答案里已保存有此题数据
                bus.$data.answers.splice(this.indexId - 1, 1) // 删除已保存数据
            }
            bus.$emit('on-reset', this.indexId); // 清除页面元素标记
            console.log(bus.$data.answers);
        }
    },
    watch: {
        currentIndex: function (val) { // 监听当前组件索引值变化
            this.$emit('input', val); // 修改父级组件索引值
        }
    },
    mounted: function () { // 元素已挂载时执行
        var _this = this; // 保持this指向
        bus.$on('on-enable-next', function (flg) { //监听是否启用"下一步"按钮事件 flg[Boolean] 开启或关闭标志
            _this.nextDisabled = !flg
        })
    },
});


//Bus实例
var bus = new Vue({
    data: {
        answers: [] // 已答题
    }
});