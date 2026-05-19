/**
 * DOM元素缓存模块
 * 负责集中管理和初始化所有DOM元素引用
 * 避免在代码中重复使用DOM查询方法，提高性能
 */
export const domCache = {
    /**
     * 初始化所有DOM元素引用
     * 一次性获取并缓存所有需要的DOM元素
     * @returns {Object} - 返回domCache对象本身，支持链式调用
     */
    init: function () {
        this.timelineContainer = document.getElementById('timeline-content');
        this.signupButton = document.getElementById('signup-button');
        this.userNameElement = document.getElementById('userName');
        this.headerImg = document.getElementById('header-img');
        this.leanStudentTab = document.getElementById('lean-student-tab');
        this.leanBackboneTab = document.getElementById('lean-backbone-tab');
        this.leanCoachTab = document.getElementById('lean-coach-tab');
        this.seniorCoachTab = document.getElementById('senior-coach-tab');
        this.projectExperienceModal = document.getElementById('projectExperienceModal');
        this.optionsModal = document.getElementById('optionsModal');
        this.submitExperienceButton = document.getElementById('submit-experience');
        this.summaryButton = document.getElementById('summaryButton');
        this.selfAssessmentButton = document.getElementById('selfAssessmentButton');
        return this;
    }
};