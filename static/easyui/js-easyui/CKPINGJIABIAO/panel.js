/*
 * @Author       : TobeRey@Isrey.Com
 * @Date         : 2019-12-17
 * @FilePath     : \survey\panel.js
 * @Description  : 面板组件
 */

Vue.component('q-panel', {
    template: `
    <div class="panel">
        <div class="title">
            <span>{{ indexId }}. {{question.title}}</span>
        </div>
        <div class="content" v-if="question.type==='radio'">
            <q-radio 
            :q-index="indexId"
            :options="question.options">
            </q-radio>
        </div>
        <div class="content" v-else-if="question.type==='select'">
            <q-select 
            :q-index="indexId"
            :options="question.options">
            </q-select>
        </div>
        <div class="content" v-else-if="question.type==='text'">
            <q-text 
            :q-index="indexId"
            :content="question.content">
            </q-text>
        </div>
        <div class="content" v-else>
            <p class="type-error">
                题型暂未支持
            </p>
        </div>
        <div class="foot">
            <q-button 
            :q-length="questions.length" 
            :index-id="indexId"
            v-model="currentIndex">
            </q-button>
        </div>
    </div>
    `,
    props: {  // 从父级通过v-bind方式传过来的数据。
        questions: { // 题目数据
            type: Array,
            default: []
        },
        qIndex: { // 页面索引
            type: Number,
            default: 1
        },
        value: { // 用于组件v-model双向绑定
            type: [Number, String]
        }
    },
    data: function () {
        return {
            options:this.questions.options , // 题目选项
            indexId: this.qIndex,// 当前题目索引
            currentIndex:this.value  // 当前页面索引
			
        }
    },
    computed: {
        question: function () { // 单项题目
            var _this = this;
            var q = this.questions.filter(function (v, i, a) { // 从题目库中取得题目ID与当前页面索引相同的题
                
				return v.id === _this.indexId;
            });
			//alert(q[0]);
			//alert(q);
            return q[0];
        }
    },
    watch: {
        currentIndex: function (val) { // 监听当前组件索引值变化
            this.indexId = val;
			//alert(this.indexId);
            this.$emit('input', val); // 修改父级组件索引值
        }
    },
});