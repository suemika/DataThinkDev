/**
 * 应用程序主入口模块
 * 负责初始化和协调所有应用组件
 * 管理应用生命周期、用户数据加载、UI渲染和事件处理
 */
import {ROLES, STATUS} from './modules/constants.js';
import {domCache} from './modules/domCache.js';
import {initState, getAppState, setAppState, batchUpdateState} from './modules/appState.js';
import {Alert} from './modules/alert.js';
import {ApiService, saveDataToAPI} from './modules/apiService.js';
import {TimelineManager} from './modules/timeline/timelineManager.js';
import {ButtonManager} from './modules/buttonManager.js';
import {ModalManager} from './modules/modalManager.js';
import {DeadlineReminder} from "./modules/deadlineReminder.js";

/**
 * 应用程序主类
 * 协调所有应用组件的初始化和运行
 */
class Application {
    constructor() {
        this.userFID = this.getNameFromUrl("userName");
        this.initialized = false;
        this.maxProjectExperienceChars = 50; // 最大字数限制
        this.minProjectExperienceChars = 10; // 最小字数要求
    }

    /**
     * 从URL查询参数中获取指定类型的值
     * @param {string} type - 要获取的查询参数类型
     * @returns {string|null} - 查询参数的值，如果不存在则返回null
     */
    getNameFromUrl(type) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(type);
    }

    async init() {
        if (this.initialized) return;

        try {
            util.loading.show();
            console.log('应用启动时间:', new Date().toLocaleString());

            await this._initializeApplication();
            this.initialized = true;

        } catch (error) {
            console.error('应用初始化失败:', error);
            await this._handleInitError(error);
        } finally {
            // 确保loading被隐藏
            this._ensureLoadingHidden();
        }
    }

    _ensureLoadingHidden() {
        try {
            if (util && util.loading && typeof util.loading.hide === 'function') {
                util.loading.hide();
            } else {
                // 备用方案：直接操作DOM
                const loadingElements = document.querySelectorAll('.loading, .spinner, [class*="loading"]');
                loadingElements.forEach(el => {
                    el.style.display = 'none';
                });
            }
        } catch (error) {
            console.warn('隐藏loading时出错:', error);
        }
    }

    async _initializeApplication() {
        const steps = [
            {name: '初始化核心模块', func: () => this._initializeCoreModules()},
            {name: '加载用户数据', func: () => this._loadUserData()},
            {name: '初始化URL状态', func: () => this._initializeURLStates()},
            {name: '初始化UI组件', func: () => this._initializeUIComponents()},
            {name: '设置事件监听', func: () => this._setupEventListeners()},
            {name: '初始化复制功能', func: () => this._setupCopyUrlHandler()},
            {name: '检查提醒', func: () => this._checkReminders()}
        ];

        for (const step of steps) {
            try {
                await step.func();
            } catch (stepError) {
                console.error(`${step.name} 失败:`, stepError);
                throw new Error(`${step.name} 失败: ${stepError.message}`);
            }
        }

    }

    // 设置复制URL功能
    _setupCopyUrlHandler() {
        // 使用事件委托处理动态生成的复制按钮
        document.addEventListener('click', (event) => {
            if (event.target.closest('.copy-page-url')) {
                this._handleCopyUrlClick(event);
            }
        });
    }

// 处理复制按钮点击
    async _handleCopyUrlClick(event) {
        const url = window.location.href;
        const btn = event.target.closest('.copy-page-url');

        if (!btn) return;

        // 保存原始状态
        const originalHTML = btn.innerHTML;
        const originalTitle = btn.getAttribute('title') || '复制当前页面网址';

        try {
            await navigator.clipboard.writeText(url);

            await this._saveCopyRecord(url);

            // 更新按钮为成功状态
            this._updateButtonToSuccessState(btn, originalHTML, originalTitle);

            // 3秒后恢复原始状态
            setTimeout(() => {
                this._restoreButtonToOriginalState(btn, originalHTML, originalTitle);
            }, 5000);

        } catch (err) {
            console.error('复制失败:', err);
            await this._handleCopyFallback(url, btn, originalHTML, originalTitle);
        }
    }

    /**
     * 更新按钮为成功状态
     * @private
     * @param {HTMLElement} btn - 按钮元素
     * @param {string} originalHTML - 原始HTML内容
     * @param {string} originalTitle - 原始标题文本
     */
    _updateButtonToSuccessState(btn, originalHTML, originalTitle) {
        btn.innerHTML = '<i class="bi bi-check2 me-1"></i>已复制';
        btn.classList.add('btn-success');
        btn.disabled = true;
        btn.setAttribute('title', '网址已复制到剪贴板！');
    }

    /**
     * 恢复按钮到原始状态
     * @private
     * @param {HTMLElement} btn - 按钮元素
     * @param {string} originalHTML - 原始HTML内容
     * @param {string} originalTitle - 原始标题文本
     */
    _restoreButtonToOriginalState(btn, originalHTML, originalTitle) {
        btn.innerHTML = originalHTML;
        btn.classList.remove('btn-success');
        btn.disabled = false;
        btn.setAttribute('title', originalTitle);
    }

    /**
     * 处理复制回退方案
     * 当Clipboard API不可用时，使用传统的textarea复制方法
     * @private
     * @param {string} url - 要复制的URL
     * @param {HTMLElement} btn - 按钮元素
     * @param {string} originalHTML - 原始HTML内容
     * @param {string} originalTitle - 原始标题文本
     * @returns {Promise<void>}
     */
    async _handleCopyFallback(url, btn, originalHTML, originalTitle) {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                // 临时显示成功状态
                this._updateButtonToSuccessState(btn, originalHTML, originalTitle);

                setTimeout(() => {
                    this._restoreButtonToOriginalState(btn, originalHTML, originalTitle);
                }, 5000);
            } else {
                const result = prompt('请手动复制以下网址:', url);
                if (result === null) {
                    // 用户取消
                    return;
                }
            }
        } catch (err) {
            const result = prompt('请手动复制以下网址:', url);
            if (result === null) {
                // 用户取消
                return;
            }
        } finally {
            document.body.removeChild(textArea);
        }
    }

    async _saveCopyRecord(url) {
        try {

            // 创建复制记录对象
            const copyRecord = {
                url: url,
                pageTitle: document.title,
                userFID: this.userFID
            };

            // 保存复制记录
            await ApiService.saveRecordToBackend(copyRecord)

        } catch (error) {
            console.error('保存复制记录失败:', error);
            // 这里可以选择静默失败，不干扰用户操作
        }
    }

    async _initializeURLStates() {
        const state = getAppState();
        const tabRoleE = this._getRoleEnum(state.currentRole);

        batchUpdateState({
            redirectSummaryURL: `work_summary.html?userName=${state.userFID}&role=${tabRoleE}`,
            redirectSelfAssessmentURL: `lean_intro.html?userName=${state.userFID}&role=${tabRoleE}`
        });
    }


    /**
     * 初始化核心模块
     * 设置DOM缓存、Logo图片和项目经验字数统计功能
     * @returns {Promise<void>}
     */
    async _initializeCoreModules() {
        domCache.init();
        domCache.headerImg.src = '../logo/font_logo2.png';

        // 初始化项目经验字数统计功能
        this._initProjectExperienceCounter();
    }

    // 初始化项目经验字数统计功能
    _initProjectExperienceCounter() {
        const projectExperience = document.getElementById('project-experience');
        const charCount = document.getElementById('char-count');
        const submitExperience = document.getElementById('submit-experience');

        if (!projectExperience || !charCount || !submitExperience) return;

        // 实时字数统计和验证
        projectExperience.addEventListener('input', () => {
            this._updateProjectExperienceCounter();
        });

        // 初始化状态
        this._updateProjectExperienceCounter();
    }

    // 更新项目经验字数统计
    _updateProjectExperienceCounter() {
        const projectExperience = document.getElementById('project-experience');
        const charCount = document.getElementById('char-count');
        const charProgress = document.getElementById('char-progress');
        const charStatus = document.getElementById('char-status');
        const charValidation = document.getElementById('char-validation');
        const submitExperience = document.getElementById('submit-experience');

        if (!projectExperience || !charCount) return;

        const currentLength = projectExperience.value.length;
        charCount.textContent = currentLength;

        // 更新进度条
        if (charProgress) {
            const progressPercent = Math.min((currentLength / this.maxProjectExperienceChars) * 100, 100);
            charProgress.style.width = progressPercent + '%';
        }

        // 更新状态显示和验证
        this._updateValidationState(currentLength, charStatus, charProgress, submitExperience, charValidation);
    }

    // 更新验证状态
    _updateValidationState(currentLength, charStatus, charProgress, submitExperience, charValidation) {
        if (currentLength === 0) {
            this._setValidationState('empty', charStatus, charProgress, submitExperience, charValidation, currentLength);
        } else if (currentLength > this.maxProjectExperienceChars) {
            this._setValidationState('tooLong', charStatus, charProgress, submitExperience, charValidation, currentLength);
        } else {
            this._setValidationState('valid', charStatus, charProgress, submitExperience, charValidation, currentLength);
        }
    }

    // 设置验证状态
    _setValidationState(state, charStatus, charProgress, submitExperience, charValidation, currentLength) {
        const states = {
            empty: {
                statusHtml: '<i class="bi bi-dash-circle"></i> 未输入',
                statusClass: 'text-muted',
                progressClass: '',
                submitDisabled: true,
                validationText: '',
                validationClass: ''
            },
            tooLong: {
                statusHtml: `<i class="bi bi-x-circle"></i> 超出${currentLength - this.maxProjectExperienceChars}字`,
                statusClass: 'text-danger',
                progressClass: 'bg-danger',
                submitDisabled: true,
                validationText: `字数超出限制，请删除${currentLength - this.maxProjectExperienceChars}个字`,
                validationClass: 'text-danger'
            },
            valid: {
                statusHtml: '<i class="bi bi-check-circle"></i> 正常',
                statusClass: 'text-success',
                progressClass: 'bg-success',
                submitDisabled: false,
                validationText: `还可以输入${this.maxProjectExperienceChars - currentLength}个字`,
                validationClass: 'text-success'
            }
        };

        const config = states[state];

        if (charStatus) {
            charStatus.innerHTML = config.statusHtml;
            charStatus.className = `small ${config.statusClass}`;
        }

        if (charProgress) {
            charProgress.className = `progress-bar ${config.progressClass}`;
        }

        if (submitExperience) {
            submitExperience.disabled = config.submitDisabled;
        }

        if (charValidation) {
            charValidation.textContent = config.validationText;
            charValidation.className = `small ${config.validationClass}`;
        }
    }

    /**
     * 加载用户数据
     * 从API获取用户信息并进行处理
     * @returns {Promise<void>}
     */
    async _loadUserData() {
        const userData = await ApiService.loadList(this.userFID);
        await this._processUserData(userData);
    }

    /**
     * 处理用户数据
     * 解析从API获取的用户数据，并更新应用状态
     * @param {Object} userData - 从API获取的用户数据对象
     * @returns {Promise<void>}
     */
    async _processUserData(userData) {
        const {
            currentRole: loadedRole,
            userStatus: loadedStatus,
            specialRole: loadedSpecialRole,
            currentStage: loadedStage,
            currentId: loadedCurrentId,
            examId: loadedExamId,
            examStage: loadedExamStage,
            examResult: loadedExamResult,
            currentName: loadedCurrentName,
            userName: loadedUserName,
            resultNotice: loadedResultNotice
        } = userData;

        batchUpdateState({
            currentRole: loadedRole || ROLES.LEAN_STUDENT,
            userStatus: loadedStatus,
            specialRole: loadedSpecialRole,
            currentStage: loadedStage,
            currentId: loadedCurrentId,
            examId: loadedExamId,
            examStage: loadedExamStage,
            examResult: loadedExamResult,
            currentName: loadedCurrentName,
            userName: loadedUserName,
            userFID: encodeURIComponent(this.userFID),
            resultNotice: loadedResultNotice,
            nowRole: loadedRole || ROLES.LEAN_STUDENT,
            tabRole: loadedRole || ROLES.LEAN_STUDENT
        });

        await this._initializeURLStates();

        const state = getAppState();
        if (!state.currentRole) {
            this._handleNoRoleState();
            return;
        }

        await this._loadRoleSpecificData(state, state.currentRole);
    }

    /**
     * 处理用户没有角色的状态
     * 更新注册按钮状态，并根据是否有用户信息（工号和姓名）来决定按钮是否可用
     * @returns {void}
     */
    _handleNoRoleState() {
        ButtonManager.updateSignupButton(null, null);
        const {numberAndName} = getAppState();
        domCache.signupButton.disabled = !numberAndName;
    }

    /**
     * 根据用户角色加载特定数据
     * 加载用户介绍数据和培训课程数据（如果需要）
     * @param {Object} state - 当前应用状态对象
     * @param {string} role - 用户角色
     * @returns {Promise<void>}
     */
    async _loadRoleSpecificData(state, role) {
        const [introData, trainingData] = await Promise.allSettled([
            ApiService.loadUserIntro(),
            this._loadTrainingCoursesIfNeeded(state, role)
        ]);

        batchUpdateState({
            userIntroData: introData.status === 'fulfilled' ? introData.value : null,
            trainingCourses: trainingData.status === 'fulfilled' ? trainingData.value : null
        });
    }

    /**
     * 根据用户角色加载培训课程（如果需要）
     * 仅为教练角色加载培训课程数据
     * @param {Object} state - 当前应用状态对象
     * @param {string} role - 用户角色
     * @returns {Promise<Object|null>} - 培训课程数据或null（如果不需要加载）
     */
    async _loadTrainingCoursesIfNeeded(state, role) {
        const trainingRoles = [ROLES.LEAN_COACH, ROLES.SENIOR_COACH];
        if (trainingRoles.includes(role)) {
            const roleCourseMap = {
                [ROLES.LEAN_COACH]: 16,
                [ROLES.SENIOR_COACH]: 19
            };
            const courseId = roleCourseMap[role];
            return await ApiService.getTrainingCourses(state.userName, courseId);
        }
        return null;
    }

    /**
     * 初始化UI组件
     * 根据当前应用状态初始化模态框、标签页状态和时间线
     * @returns {Promise<void>}
     */
    async _initializeUIComponents() {
        const state = getAppState();
        if (!state.currentName) {
            this._disableAllTabs();
            ButtonManager.updateState(domCache.signupButton, {
                text: "未查询到记录",
                icon: "bi-database-exclamation",
                disabled: true
            });
            return;
        }

        ModalManager.initProjectExperienceModal();
        ModalManager.initOptionsModal();
        ModalManager._setupModalAccessibility();


        this._updateTabState(state);

        await this._generateTimeline(state);

        ButtonManager.updateTabAccessibility(state.currentRole, state.userStatus);
    }

    /**
     * 更新标签页状态
     * 根据当前用户角色更新导航标签页的激活状态
     * @param {Object} state - 当前应用状态对象，包含currentRole属性
     * @returns {void}
     */
    _updateTabState(state) {
        const {currentRole} = state;

        domCache.leanStudentTab.classList.remove('active');
        domCache.leanBackboneTab.classList.remove('active');
        domCache.leanCoachTab.classList.remove('active');
        domCache.seniorCoachTab.classList.remove('active');

        switch (currentRole) {
            case ROLES.LEAN_BACKBONE:
                domCache.leanBackboneTab.classList.add('active');
                break;
            case ROLES.LEAN_COACH:
                domCache.leanCoachTab.classList.add('active');
                break;
            case ROLES.SENIOR_COACH:
                domCache.seniorCoachTab.classList.add('active');
                break;
            default:
                domCache.leanStudentTab.classList.add('active');
        }
    }

    /**
     * 禁用所有标签页
     * 禁用所有导航标签页，设置不可点击状态并移除激活样式
     * @returns {void}
     */
    _disableAllTabs() {
        const tabSelectors = [
            '#lean-student-tab',
            '#lean-backbone-tab',
            '#lean-coach-tab',
            '#senior-coach-tab'
        ];

        tabSelectors.forEach(selector => {
            const tab = document.querySelector(selector);
            if (tab) {
                tab.disabled = true;
                tab.setAttribute('disabled', 'true');
                tab.setAttribute('aria-disabled', 'true');
                tab.classList.add('disabled');
                tab.classList.remove('active');
            }
        });
    }

    /**
     * 生成时间线
     * 根据当前用户角色和名称生成个人发展时间线
     * @param {Object} state - 当前应用状态对象，包含currentRole、currentName、specialRole和userName属性
     * @returns {Promise<void>}
     */
    async _generateTimeline(state) {
        const {currentRole, currentName, specialRole, userName} = state;
        if (currentRole && (currentName || specialRole)) {
            await TimelineManager.generateTimeline(userName, currentRole);
        } else {
            ButtonManager.updateSignupButton(null, currentRole);
        }
    }

    /**
     * 设置所有事件监听器
     * 初始化导航、按钮、模态框和表单的事件监听器
     * @returns {Promise<void>}
     */
    async _setupEventListeners() {
        this._setupNavigationEvents();
        this._setupButtonEvents();
        this._setupModalEvents();
        this._setupFormEvents();
    }

    /**
     * 设置导航事件监听器
     * 为所有导航链接添加点击事件处理程序，实现标签页切换功能
     * @returns {void}
     */
    _setupNavigationEvents() {
        document.querySelectorAll('.nav-link').forEach(button => {
            button.addEventListener('click', (event) => this._handleTabClick(event, button));
        });
    }

    /**
     * 处理标签页点击事件
     * 实现标签页切换逻辑，包括角色切换、URL更新和UI重新渲染
     * @param {Event} event - 点击事件对象
     * @param {HTMLElement} button - 被点击的导航按钮元素
     * @returns {Promise<void>}
     */
    async _handleTabClick(event, button) {
        if (button.disabled) return;

        const role = button.getAttribute('data-role');
        const state = getAppState();

        util.loading.show();

        try {
            await this._switchRole(role, state);

            // 强制重新加载培训课程数据
            const trainingData = await this._loadTrainingCoursesIfNeeded(state, role);
            batchUpdateState({
                trainingCourses: trainingData
            });

            // 确保时间线和模态框内容都更新
            await TimelineManager.generateTimeline(state.userName, role);

            // 强制重新填充模态框
            TimelineManager.populateTrainingModal();
        } catch (error) {
            console.error('标签页切换失败:', error);
            await Alert.error('切换失败', '角色切换失败，请重试');
        } finally {
            util.loading.hide();
        }
    }


    /**
     * 切换用户角色
     * 更新应用状态中的当前角色和标签页角色，并生成相关的重定向URL
     * @param {string} role - 要切换到的新角色
     * @param {Object} currentState - 当前应用状态对象，包含userFID等属性
     * @returns {Promise<void>}
     */
    async _switchRole(role, currentState) {
        const tabRoleE = this._getRoleEnum(role);

        batchUpdateState({
            currentRole: role,
            tabRole: role,
            redirectSummaryURL: `work_summary.html?userName=${currentState.userFID}&role=${tabRoleE}`,
            redirectSelfAssessmentURL: `lean_intro.html?userName=${currentState.userFID}&role=${tabRoleE}`
        });
    }

    /**
     * 获取角色枚举值
     * 将角色字符串转换为对应的枚举值字符串，用于URL参数和API调用
     * @param {string} role - 角色字符串
     * @returns {string} - 对应的角色枚举值字符串
     */
    _getRoleEnum(role) {
        const roleMap = {
            [ROLES.LEAN_STUDENT]: 'LEAN_STUDENT',
            [ROLES.LEAN_BACKBONE]: 'LEAN_BACKBONE',
            [ROLES.LEAN_COACH]: 'LEAN_COACH',
            [ROLES.SENIOR_COACH]: 'SENIOR_COACH'
        };
        return roleMap[role] || 'LEAN_STUDENT';
    }

    /**
     * 设置按钮事件监听器
     * 初始化操作按钮和导航按钮的事件处理程序
     * @returns {void}
     */
    _setupButtonEvents() {
        this._setupActionButtonEvents();
        this._setupNavigationButtonEvents();
    }

    /**
     * 设置操作按钮事件监听器
     * 为提交项目经验按钮添加点击事件处理程序
     * @returns {void}
     */
    _setupActionButtonEvents() {
        if (domCache.submitExperienceButton) {
            domCache.submitExperienceButton.onclick = () => this._handleProjectExperienceSubmit();
        }
    }

    /**
     * 处理项目经验提交
     * 验证并提交用户输入的项目经验信息到API，处理成功/失败反馈
     * @returns {Promise<void>}
     */
    async _handleProjectExperienceSubmit() {
        const projectExperience = document.getElementById('project-experience').value.trim();
        const state = getAppState();
        const currentLength = projectExperience.length;


        if (currentLength > this.maxProjectExperienceChars) {
            await Alert.error('字数超出限制', `项目经验描述不能超过${this.maxProjectExperienceChars}字，请删除多余内容。`);
            return;
        }

        if (!projectExperience) {
            await Alert.warning('内容为空', '项目经验不能为空！');
            return;
        }

        if (!confirm("是否确认提交？")) return;

        try {
            await ApiService.applyForExam(state.userName, state.currentRole, projectExperience);
            const modal = bootstrap.Modal.getInstance(domCache.projectExperienceModal);
            modal.hide();

            await Alert.success('提交成功', '您的项目经验已提交审核');
            window.location.reload();
        } catch (error) {
            console.error('提交项目经验失败:', error);
            await Alert.error('提交失败', '项目经验提交失败，请重试');
        }
    }

    /**
     * 设置导航按钮事件监听器
     * 为总结按钮和自我评估按钮添加点击事件处理程序
     * @returns {void}
     */
    _setupNavigationButtonEvents() {
        if (domCache.summaryButton) {
            domCache.summaryButton.onclick = () => this._handleSummaryButtonClick();
        }

        if (domCache.selfAssessmentButton) {
            domCache.selfAssessmentButton.onclick = () => this._handleSelfAssessmentButtonClick();
        }
    }

    /**
     * 处理总结按钮点击事件
     * 加载最新用户介绍数据并跳转到总结页面
     * @returns {Promise<void>}
     */
    async _handleSummaryButtonClick() {
        const freshData = await ApiService.loadUserIntro();
        batchUpdateState({userIntroData: freshData});

        const {redirectSummaryURL} = getAppState();

        // 安全检查：确保URL不为空
        if (!redirectSummaryURL || redirectSummaryURL.includes('null') || redirectSummaryURL.includes('NULL')) {
            console.warn('redirectSummaryURL 异常，重新初始化:', redirectSummaryURL);
            await this._initializeURLStates();

            const updatedState = getAppState();
            if (!updatedState.redirectSummaryURL) {
                await Alert.error('页面错误', '无法确定跳转目标，请刷新页面重试');
                return;
            }

            window.location.href = updatedState.redirectSummaryURL;
        } else {
            window.location.href = redirectSummaryURL;
        }
    }


    /**
     * 处理自我评估按钮点击事件
     * 加载最新用户介绍数据并跳转到自我评估页面
     * @returns {Promise<void>}
     */
    async _handleSelfAssessmentButtonClick() {
        const freshData = await ApiService.loadUserIntro();
        batchUpdateState({userIntroData: freshData});

        const {redirectSelfAssessmentURL} = getAppState();

        // 安全检查：确保URL不为空
        if (!redirectSelfAssessmentURL || redirectSelfAssessmentURL.includes('null') || redirectSelfAssessmentURL.includes('NULL')) {
            console.warn('redirectSelfAssessmentURL 异常，重新初始化:', redirectSelfAssessmentURL);
            await this._initializeURLStates();

            const updatedState = getAppState();
            if (!updatedState.redirectSelfAssessmentURL) {
                await Alert.error('页面错误', '无法确定跳转目标，请刷新页面重试');
                return;
            }

            window.location.href = updatedState.redirectSelfAssessmentURL;
        } else {
            window.location.href = redirectSelfAssessmentURL;
        }
    }

    /**
     * 设置模态框相关事件
     * 初始化培训课程模态框事件和模态框无障碍访问支持
     * @returns {void}
     */
    _setupModalEvents() {
        this._setupTrainingModalEvents();
        this._setupModalAccessibility();
    }

    /**
     * 设置模态框的无障碍访问特性
     * 为所有模态框添加焦点管理、键盘导航支持和ARIA属性设置
     * @returns {void}
     */
    _setupModalAccessibility() {
        // 修复所有模态框的无障碍访问警告
        document.querySelectorAll('.modal').forEach(modal => {
            // 隐藏时移除焦点
            modal.addEventListener('hidden.bs.modal', () => {
                const focusedElement = modal.querySelector(':focus');
                if (focusedElement) {
                    focusedElement.blur();
                }
            });

            // 显示时设置正确的属性
            modal.addEventListener('show.bs.modal', () => {
                modal.removeAttribute('aria-hidden');
            });

            // ESC键处理
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const focusedElement = modal.querySelector(':focus');
                    if (focusedElement) {
                        focusedElement.blur();
                    }
                }
            });
        });
    }


    /**
     * 设置培训课程模态框事件
     * 为培训课程模态框的触发按钮添加点击事件监听器，并初始化模态框实例
     * @returns {void}
     */
    _setupTrainingModalEvents() {
        const modalTriggerBtn = document.querySelector('[data-bs-target="#trainingCoursesModal"]');
        if (modalTriggerBtn) {
            modalTriggerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                TimelineManager.populateTrainingModal();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-bs-target="#trainingCoursesModal"]') ||
                e.target.closest('.training-courses-btn')) {
                e.preventDefault();
                const state = getAppState();
                state.trainingModal?.show();
                TimelineManager.populateTrainingModal();
            }
        });

        const trainingModal = new bootstrap.Modal(document.getElementById('trainingCoursesModal'));
        setAppState({trainingModal});
    }

    /**
     * 设置表单相关的事件监听器
     * 预留方法，用于添加表单提交、验证等事件处理逻辑
     * @returns {void}
     */
    _setupFormEvents() {
        // 可以添加表单相关的事件监听
    }

    /**
     * 检查并显示提醒信息
     * 检查截止日期提醒和考试结果提醒，并按顺序显示
     * @returns {Promise<void>}
     */
    async _checkReminders() {
        await DeadlineReminder.checkAndShow();
        await this._checkExamResults();
    }

    /**
     * 检查考试结果并显示庆祝通知
     * 根据当前考试阶段、结果和状态，检查是否需要显示考试结果庆祝通知
     * @returns {Promise<void>}
     */
    async _checkExamResults() {
        const state = getAppState();
        const {examStage, examResult, currentName, currentStage, resultNotice} = state;

        const validNames = ['认证考试', '认证学习', '项目经验审核', '认证结果'];
        const stages = ['已通过', '未通过'];

        if (examStage === 0 && validNames.includes(currentName) &&
            examResult !== '未开始' && examResult !== '进行中') {
            await DeadlineReminder.checkExamPassedCelebration(examResult);
        }

        if (currentName === '认证结果' && stages.includes(currentStage) && resultNotice === 0) {
            await DeadlineReminder.checkExamPassedCelebration(currentStage);
        }
    }

    /**
     * 处理应用初始化错误
     * 当应用初始化过程中发生错误时，显示错误提示给用户
     * @param {Error} error - 初始化过程中发生的错误对象
     * @returns {Promise<void>}
     */
    async _handleInitError(error) {
        let errorMessage = error.message;

        this._ensureLoadingHidden();

        if (isNetworkError(errorMessage)) {
            errorMessage = '网络连接失败，请检查DNS配置和网络连接';
        } else {
            errorMessage = '页面加载失败，请重新登录';
        }

        await ApiService._logError('main', error, errorMessage, 0)

        await Alert.error('初始化失败', errorMessage);

    }
}

const isNetworkError = (errorMessage) => {
    const networkErrors = [
        'Network Error',
        'Request aborted',
        'timeout',
        'ECONNABORTED',
        'timeout of 10000ms exceeded',
        'ENETUNREACH',
        'EHOSTUNREACH'
    ];
    return networkErrors.some(error => errorMessage.includes(error));
};

// 创建应用实例
const app = new Application();

// 启动应用
document.addEventListener("DOMContentLoaded", function () {
    app.init().catch(console.error);
});

window.app = app;