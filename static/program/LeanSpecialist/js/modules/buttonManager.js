/**
 * 按钮管理器模块
 * 负责处理应用中所有按钮的状态管理、策略配置和交互逻辑
 * 采用策略模式根据用户角色和状态动态配置按钮
 */
import {STATUS, ROLES, completedText} from './constants.js';
import {domCache} from './domCache.js';
import {TimelineManager} from './timeline/timelineManager.js';
import {getAppState, setAppState, batchUpdateState} from "./appState.js";
import {ApiService} from './apiService.js';

// ==================== 策略处理器 ====================
/**
 * 按钮策略处理器
 * 根据用户角色和状态动态生成按钮配置
 */
class ButtonStrategyHandler {
    // 角色处理器的映射
    static roleHandlers = {
        [ROLES.LEAN_STUDENT]: '_handleStudent',
        [ROLES.LEAN_BACKBONE]: '_handleBackbone',
        [ROLES.LEAN_COACH]: '_handleCoach',
        [ROLES.SENIOR_COACH]: '_handleSeniorCoach'
    };

    // 角色升级映射
    static roleUpgradeMap = {
        [ROLES.LEAN_STUDENT]: {
            nextRole: ROLES.LEAN_BACKBONE,
            text: "申请精益骨干报名",
            icon: "bi-arrow-up-circle",
            action: async (userName) => {
                const isOpen = await ButtonManager.checkSignUpStatus(ROLES.LEAN_BACKBONE);
                if (!isOpen) return false;
                domCache.signupButton.disabled = true;
                await ButtonManager.tabTab();
                domCache.signupButton.disabled = false;
                return true;
            }
        },
        [ROLES.LEAN_BACKBONE]: {
            nextRole: ROLES.LEAN_COACH,
            text: "申请精益教练报名",
            icon: "bi-person-plus",
            action: async (userName) => {
                const isOpen = await ButtonManager.checkSignUpStatus(ROLES.LEAN_COACH);
                if (!isOpen) return false;
                await ApiService.applyForSignUp(userName, ROLES.LEAN_COACH);
                await ButtonManager.tabTabCoach();
                return true;
            }
        },
        [ROLES.LEAN_COACH]: {
            nextRole: ROLES.SENIOR_COACH,
            text: "申请资深教练报名",
            icon: "bi-person-plus",
            action: async (userName) => {
                const isOpen = await ButtonManager.checkSignUpStatus(ROLES.SENIOR_COACH);
                if (!isOpen) return false;
                await ApiService.applyForSignUp(userName, ROLES.SENIOR_COACH);
                await ButtonManager.tabSeniorCoach();
                return true;
            }
        }
    };

    // 角色文本映射
    static roleTextMap = {
        [ROLES.LEAN_BACKBONE]: "精益骨干",
        [ROLES.LEAN_COACH]: "精益教练",
        [ROLES.SENIOR_COACH]: "资深教练"
    };

    // 阶段名称映射
    static stageNameMap = {
        [ROLES.LEAN_STUDENT]: {
            registration: "认证报名",
            exam: "认证考试"
        },
        [ROLES.LEAN_BACKBONE]: {
            lean: "认证学习",
            exam: "认证考试",
            experience: "项目经验审核",
            intro: "个人总结与自评",
            results: "认证结果"
        },
        [ROLES.LEAN_COACH]: {
            lean: "认证学习",
            experience: "项目经验审核",
            intro: "个人总结与自评",
            results: "认证结果",
            training: "课程实训任务审核"
        },
        [ROLES.SENIOR_COACH]: {
            experience: "项目经验审核",
            intro: "个人总结与自评",
            results: "认证结果",
            training: "课程实训任务审核"
        }
    };

    /**
     * 创建按钮配置
     * @param {string} role - 用户角色
     * @param {Array} roleData - 角色相关数据
     * @returns {Object} 按钮配置对象
     */
    static createConfig(role, roleData) {
        const state = getAppState();
        const {userStatus, nowRole, userName, currentRole} = state;

        if (!roleData) {
            this._disableAllTabsExceptStudent();
            return {text: "未查询到记录", icon: "bi-hourglass", disabled: true};
        }

        const handler = this.roleHandlers[role];
        if (handler && this[handler]) {
            return this[handler](roleData, state);
        }

        return this._getDefaultConfig();
    }

    /**
     * 禁用除学员外的所有标签页
     * @returns {void}
     */
    static _disableAllTabsExceptStudent() {
        const tabs = [
            domCache.leanStudentTab,
            domCache.leanBackboneTab,
            domCache.leanCoachTab,
            domCache.seniorCoachTab
        ];

        tabs.forEach(tab => {
            if (tab) {
                tab.classList.remove('active');
                tab.disabled = true;
                tab.setAttribute('disabled', 'true');
                tab.setAttribute('aria-disabled', 'true');
                tab.classList.add('disabled');
                tab.onclick = null;
            }
        });

        if (domCache.leanStudentTab) {
            domCache.leanStudentTab.disabled = false;
            domCache.leanStudentTab.removeAttribute('disabled');
            domCache.leanStudentTab.setAttribute('aria-disabled', 'false');
            domCache.leanStudentTab.classList.remove('disabled');
            domCache.leanStudentTab.classList.add('active');
        }
    }

    /**
     * 获取默认按钮配置
     * @returns {Object} 默认按钮配置
     */
    static _getDefaultConfig() {
        const {userName} = getAppState();
        return {
            text: "立即报名",
            icon: "bi-send-check",
            disabled: false,
            onClick: async () => {
                const isOpen = await ButtonManager.checkSignUpStatus(ROLES.LEAN_STUDENT);
                if (!isOpen) return;
                location.href = `lean_list.html?gzbh=${userName}`;
            }
        };
    }

    /**
     * 在角色数据中查找指定阶段
     * @param {Array} roleData - 角色相关数据
     * @param {string} stageName - 阶段名称
     * @returns {Object|null} 找到的阶段数据或null
     */
    static _findStage(roleData, stageName) {
        return roleData?.find(item => item.stage_name === stageName);
    }

    /**
     * 处理通用的已认证用户升级逻辑
     * @param {Object} state - 应用状态
     * @param {string} currentRole - 当前角色
     * @returns {Object|null} 按钮配置或null
     */
    static _handleCertifiedUpgrade(state, currentRole) {
        const {userStatus, nowRole, userName} = state;
        const upgradeInfo = this.roleUpgradeMap[currentRole];

        if (userStatus === true && nowRole === currentRole && upgradeInfo) {
            return {
                text: upgradeInfo.text,
                icon: upgradeInfo.icon,
                disabled: false,
                onClick: async () => await upgradeInfo.action(userName)
            };
        }

        return null;
    }

    /**
     * 处理已完成更高级别认证的情况
     * @param {string} currentRole - 当前角色
     * @param {string} nowRole - 用户当前最高角色
     * @returns {Object|null} 按钮配置或null
     */
    static _handleHigherLevelCertified(currentRole, nowRole) {
        const roleHierarchy = [ROLES.LEAN_STUDENT, ROLES.LEAN_BACKBONE, ROLES.LEAN_COACH, ROLES.SENIOR_COACH];
        const currentIndex = roleHierarchy.indexOf(currentRole);
        const nowIndex = roleHierarchy.indexOf(nowRole);

        if (nowIndex > currentIndex) {
            return {text: completedText, icon: "bi-award", disabled: true};
        }
        return null;
    }

    /**
     * 处理结果阶段
     * @param {Object} results - 结果阶段数据
     * @param {string} role - 角色
     * @param {string} userName - 用户名
     * @returns {Object|null} 按钮配置或null
     */
    static _handleResultsStage(results, role, userName) {
        if (!results) return null;

        if (results.status === STATUS.REJECTED) {
            const roleText = this.roleTextMap[role];
            if (!roleText) return null;

            return {
                text: `申请${roleText}认证`,
                icon: "bi-pencil",
                disabled: false,
                onClick: async () => {
                    if (confirm(`确认申请${roleText}认证吗？`)) {
                        await ApiService.applyForIntroAgain(userName, role);
                        location.reload();
                    }
                }
            };
        }

        if (results.status === STATUS.APPROVED) {
            return {text: completedText, icon: "bi-award", disabled: true, btnClass: "btn-info"};
        }

        return null;
    }

    /**
     * 处理审批等待状态
     * @param {Object} stage - 阶段数据
     * @param {string} message - 等待消息
     * @returns {Object|null} 按钮配置或null
     */
    static _handleApprovalWaiting(stage, message = "请等待审核") {

        if (stage?.status === STATUS.APPROVED) {
            return {text: "请等待认证结果", icon: "bi-hourglass", disabled: true, btnClass: "btn-info"};
        }
        return null;
    }

    /**
     * 处理报名/学习阶段
     * @param {Object} stage - 阶段数据
     * @param {string} role - 角色
     * @param {string} userName - 用户名
     * @returns {Object|null} 按钮配置或null
     */
    static _handleSignUpStage(stage, role, userName) {
        if (stage?.status === STATUS.PENDING) {
            const roleText = this.roleTextMap[role];
            if (!roleText) return null;

            return {
                text: `申请${roleText}报名`,
                icon: "bi-send-check",
                disabled: false,
                onClick: async () => {
                    const isOpen = await ButtonManager.checkSignUpStatus(role);
                    if (!isOpen) return;
                    await ApiService.applyForSignUp(userName, role);
                    location.reload();
                }
            };
        }
        return null;
    }

    /**
     * 处理考试相关逻辑
     * @param {Object} examStage - 考试阶段数据
     * @param {Object} prerequisiteStage - 前置阶段数据
     * @param {Object} state - 应用状态
     * @param {string} role - 角色
     * @param {string} examTypeText - 考试类型文本
     * @returns {Object|null} 按钮配置或null
     */
    static _handleExamLogic(examStage, prerequisiteStage, state, role, examTypeText = "考试") {
        const {userName, currentRole} = state;

        if (examStage) {
            if (examStage.status === STATUS.IN_PROGRESS) {
                return this._createExamTimeConfig(examStage);
            }

            if (examStage.status === STATUS.COMPLETED && examStage.exam_result === STATUS.APPROVED) {
                return {text: completedText, icon: "bi-award", disabled: true};
            }
        }

        if (prerequisiteStage?.status === STATUS.COMPLETED || prerequisiteStage?.status === STATUS.APPROVED) {
            if (examStage?.status === STATUS.IN_PROGRESS) {
                return this._createExamTimeConfig(examStage);
            }

            if (examStage?.status === STATUS.COMPLETED) {
                return this._createIntroButton();
            } else {
                return this._createApplyExamButton(role, examTypeText, userName, currentRole);
            }
        }

        return null;
    }

    /**
     * 创建考试时间相关的按钮配置
     * @param {Object} examStage - 考试阶段数据
     * @returns {Object} 按钮配置对象
     */
    static _createExamTimeConfig(examStage) {
        const now = new Date();

        if (examStage.exam_result === STATUS.STARTED && examStage.exam_time) {
            try {
                const [datePart, timeRange] = examStage.exam_time.split(" ");
                const [year, month, day] = datePart.split("-");
                const standardizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

                const [startTimeStr, endTimeStr] = timeRange.split("-");
                const examStartTime = new Date(`${standardizedDate}T${startTimeStr}:00`);
                const examEndTime = new Date(`${standardizedDate}T${endTimeStr}:00`);

                if (isNaN(examStartTime.getTime()) || isNaN(examEndTime.getTime())) {
                    console.error('无效的考试时间格式');
                    return {text: "请等待考试时间", icon: "bi-hourglass", disabled: true};
                }

                if (now < examStartTime) {
                    const timeLeft = this._formatTimeLeft(examStartTime - now);
                    return {
                        text: `距离开始还有 ${timeLeft}`,
                        icon: "bi-hourglass-split",
                        disabled: true,
                        btnClass: "btn-info"
                    };
                } else if (now >= examStartTime && now <= examEndTime) {
                    const timeLeft = this._formatTimeLeft(examEndTime - now);
                    return {text: `剩余时间 ${timeLeft}`, icon: "bi-alarm", disabled: false, btnClass: "btn-danger"};
                } else {
                    return {
                        text: "感谢参与，成绩稍后公布",
                        icon: "bi-check2-circle",
                        disabled: true,
                        btnClass: "btn-secondary"
                    };
                }
            } catch (error) {
                console.error('解析考试时间失败:', error);
            }
        }

        return {text: "请等待考试时间", icon: "bi-hourglass", disabled: true};
    }

    /**
     * 格式化剩余时间
     * @param {number} ms - 剩余时间（毫秒）
     * @returns {string} 格式化后的剩余时间字符串
     */
    static _formatTimeLeft(ms) {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days}天${hours}小时`;
        } else if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }

    /**
     * 创建个人总结按钮
     * @returns {Object} 按钮配置
     */
    static _createIntroButton() {
        return {
            text: "填写个人总结与自评",
            icon: "bi-pencil",
            disabled: false,
            onClick: () => {
                const optionsModal = new bootstrap.Modal(domCache.optionsModal);
                optionsModal.show();
            }
        };
    }

    /**
     * 创建申请考试按钮
     * @param {string} role - 角色
     * @param {string} examTypeText - 考试类型文本
     * @param {string} userName - 用户名
     * @param {string} currentRole - 当前角色
     * @returns {Object} 按钮配置
     */
    static _createApplyExamButton(role, examTypeText, userName, currentRole) {
        return {
            text: `申请${examTypeText}`,
            icon: "bi-pencil-square",
            disabled: false,
            onClick: async () => {
                const isOpen = await ButtonManager.checkExperienceStatus(role);
                if (!isOpen) return;
                if (confirm(`确认申请${examTypeText}吗？`)) {
                    if (role === ROLES.LEAN_STUDENT) {
                        await ApiService.applyForExam(userName, currentRole);
                    } else {
                        await ApiService.applyForBackboneExam(userName, currentRole);
                    }
                    location.reload();
                }
            }
        };
    }

    /**
     * 处理项目经验阶段的按钮策略
     * @param {Object} experience - 项目经验数据
     * @param {Object} examStage - 考试阶段数据
     * @param {Object} state - 应用状态
     * @param {string} role - 用户角色
     * @returns {Object} 按钮配置对象
     */
    static _handleExperienceStage(experience, examStage, state, role) {
        const {userName, currentRole} = state;

        if (experience.status === STATUS.PENDING || experience.status === STATUS.REJECTED) {
            return {
                text: "申请项目经验审核",
                icon: "bi-file-earmark-text",
                disabled: false,
                onClick: async () => {
                    const isOpen = await ButtonManager.checkExperienceStatus(role);
                    if (!isOpen) return;
                    const modal = new bootstrap.Modal(domCache.projectExperienceModal);
                    modal.show();
                }
            };
        }

        if (experience.status === STATUS.IN_PROGRESS) {
            return {text: "请等待审核", icon: "bi-hourglass", disabled: true};
        }

        if (experience.status === STATUS.COMPLETED || experience.status === STATUS.APPROVED) {
            if (examStage && examStage.status === STATUS.IN_PROGRESS) {
                return this._createExamTimeConfig(examStage);
            }

            if (examStage && examStage.status === STATUS.COMPLETED) {
                return this._createIntroButton();
            } else {
                const examTypeText = role === ROLES.LEAN_BACKBONE ? "骨干考试" : "考试";
                return this._createApplyExamButton(role, examTypeText, userName, currentRole);
            }
        }

        return this._getDefaultConfig();
    }

    /**
     * 处理项目经验申请按钮
     * @param {string} role - 角色
     * @param {string} requirementText - 要求文本
     * @returns {Object} 按钮配置
     */
    static _createProjectExperienceButton(role, requirementText) {
        return {
            text: "申请项目经验审核",
            icon: "bi-file-earmark-text",
            disabled: false,
            onClick: () => {
                const modal = new bootstrap.Modal(domCache.projectExperienceModal);
                const handler = () => {
                    const alertElement = domCache.projectExperienceModal.querySelector('.alert span.small');
                    if (alertElement) {
                        alertElement.innerHTML = requirementText;
                    }
                    domCache.projectExperienceModal.removeEventListener('show.bs.modal', handler);
                };
                domCache.projectExperienceModal.addEventListener('show.bs.modal', handler);
                modal.show();
            }
        };
    }

    /**
     * 处理培训课程阶段的按钮策略
     * @param {Object} trainingCourses - 培训课程数据
     * @param {string} role - 角色
     * @returns {Object|null} 按钮配置对象或null
     */
    static _handleTrainingCourses(trainingCourses, role) {
        if (!trainingCourses) return null;

        if (trainingCourses.status === STATUS.APPROVED || trainingCourses.status === STATUS.COMPLETED) {
            if (role === ROLES.LEAN_COACH) {
                return this._createIntroButton();
            } else {
                return {text: "功能正在烘焙中... 🍪", icon: "bi-egg-fried", disabled: true, btnClass: "btn-info"};
            }
        }

        if (trainingCourses.status === STATUS.IN_PROGRESS) {
            return {text: "实训任务进行中", icon: "bi-hourglass", disabled: true, btnClass: "btn-info"};
        }

        return {text: "功能正在烘焙中... 🍪", icon: "bi-egg-fried", disabled: true, btnClass: "btn-info"};
    }

    /**
     * 根据角色获取阶段数据
     * @param {Array} roleData - 角色数据
     * @param {string} role - 角色
     * @param {string} stageKey - 阶段键名
     * @returns {Object|null} 阶段数据
     */
    static _getStageData(roleData, role, stageKey) {
        const stageName = this.stageNameMap[role]?.[stageKey];
        return stageName ? this._findStage(roleData, stageName) : null;
    }

    // ==================== 学员策略 ====================
    /**
     * 处理学员角色的按钮策略
     */
    static _handleStudent(roleData, state) {
        const {userStatus, nowRole, userName, currentRole} = state;

        // 1. 已认证学员申请骨干
        const upgradeConfig = this._handleCertifiedUpgrade(state, ROLES.LEAN_STUDENT);
        if (upgradeConfig) return upgradeConfig;

        // 2. 已完成更高级别认证
        const higherLevelConfig = this._handleHigherLevelCertified(ROLES.LEAN_STUDENT, nowRole);
        if (higherLevelConfig) return higherLevelConfig;

        const registrationStage = this._getStageData(roleData, ROLES.LEAN_STUDENT, 'registration');
        const examStage = this._getStageData(roleData, ROLES.LEAN_STUDENT, 'exam');

        // 3. 处理考试逻辑
        const examConfig = this._handleExamLogic(examStage, registrationStage, state, ROLES.LEAN_STUDENT, "精益学员考试");
        if (examConfig) return examConfig;

        // 4. 注册阶段处理
        if (registrationStage?.status === STATUS.IN_PROGRESS) {
            return {text: "请等待审核", icon: "bi-hourglass", disabled: true, btnClass: "btn-info"};
        }

        return this._getDefaultConfig();
    }

    // ==================== 骨干策略 ====================
    /**
     * 处理骨干角色的按钮策略
     */
    static _handleBackbone(roleData, state) {
        const {userStatus, nowRole, userName, currentRole} = state;

        // 1. 已认证骨干申请教练
        const upgradeConfig = this._handleCertifiedUpgrade(state, ROLES.LEAN_BACKBONE);
        if (upgradeConfig) return upgradeConfig;

        // 2. 已完成更高级别认证
        const higherLevelConfig = this._handleHigherLevelCertified(ROLES.LEAN_BACKBONE, nowRole);
        if (higherLevelConfig) return higherLevelConfig;

        const leanStage = this._getStageData(roleData, ROLES.LEAN_BACKBONE, 'lean');
        const examStage = this._getStageData(roleData, ROLES.LEAN_BACKBONE, 'exam');
        const experience = this._getStageData(roleData, ROLES.LEAN_BACKBONE, 'experience');
        const intro = this._getStageData(roleData, ROLES.LEAN_BACKBONE, 'intro');
        const results = this._getStageData(roleData, ROLES.LEAN_BACKBONE, 'results');

        // 3. 结果阶段处理
        const resultsConfig = this._handleResultsStage(results, ROLES.LEAN_BACKBONE, userName);
        if (resultsConfig) return resultsConfig;

        // 4. 个人总结阶段
        const introConfig = this._handleApprovalWaiting(intro);
        if (introConfig) return introConfig;

        // 5. 学习阶段
        const signUpConfig = this._handleSignUpStage(leanStage, ROLES.LEAN_BACKBONE, userName);
        if (signUpConfig) return signUpConfig;

        // 6. 项目经验阶段
        if (experience) {
            return this._handleExperienceStage(experience, examStage, state, ROLES.LEAN_BACKBONE);
        }

        return this._getDefaultConfig();
    }

    // ==================== 教练策略 ====================
    /**
     * 处理教练角色的按钮策略
     */
    static _handleCoach(roleData, state) {
        const {userStatus, nowRole, userName} = state;

        // 1. 已认证教练申请资深教练
        const upgradeConfig = this._handleCertifiedUpgrade(state, ROLES.LEAN_COACH);
        if (upgradeConfig) return upgradeConfig;

        // 2. 已完成更高级别认证
        const higherLevelConfig = this._handleHigherLevelCertified(ROLES.LEAN_COACH, nowRole);
        if (higherLevelConfig) return higherLevelConfig;

        const leanStage = this._getStageData(roleData, ROLES.LEAN_COACH, 'lean');
        const experience = this._getStageData(roleData, ROLES.LEAN_COACH, 'experience');
        const intro = this._getStageData(roleData, ROLES.LEAN_COACH, 'intro');
        const results = this._getStageData(roleData, ROLES.LEAN_COACH, 'results');
        const trainingCourses = this._getStageData(roleData, ROLES.LEAN_COACH, 'training');

        // 3. 结果阶段处理
        const resultsConfig = this._handleResultsStage(results, ROLES.LEAN_COACH, userName);
        if (resultsConfig) return resultsConfig;

        // 4. 个人总结阶段
        const introConfig = this._handleApprovalWaiting(intro);
        if (introConfig) return introConfig;

        // 5. 学习阶段
        const signUpConfig = this._handleSignUpStage(leanStage, ROLES.LEAN_COACH, userName);
        if (signUpConfig) return signUpConfig;

        // 6. 项目经验处理
        if (experience) {
            if (experience.status === STATUS.PENDING || experience.status === STATUS.REJECTED) {
                return this._createProjectExperienceButton(
                    ROLES.LEAN_COACH,
                    '要求<span class="highlight-lean">至少参与过1个公司级精益项目或2个部门级精益项目</span>,项目中担任角色<span class="highlight-lean">必须为项目举措负责人</span>'
                );
            }
            if (experience.status === STATUS.IN_PROGRESS) {
                return {text: "请等待审核", icon: "bi-hourglass", disabled: true, btnClass: "btn-info"};
            }
        }

        // 7. 培训课程处理
        const trainingCoursesConfig = this._handleTrainingCourses(trainingCourses, ROLES.LEAN_COACH);
        if (trainingCoursesConfig) return trainingCoursesConfig;

        return this._getDefaultConfig();
    }

    // ==================== 资深教练策略 ====================
    /**
     * 处理资深教练角色的按钮策略
     */
    static _handleSeniorCoach(roleData, state) {
        const {userName} = getAppState();
        const experience = this._getStageData(roleData, ROLES.SENIOR_COACH, 'experience');
        const intro = this._getStageData(roleData, ROLES.SENIOR_COACH, 'intro');
        const results = this._getStageData(roleData, ROLES.SENIOR_COACH, 'results');
        const trainingCourses = this._getStageData(roleData, ROLES.SENIOR_COACH, 'training');

        // 1. 结果阶段处理
        const resultsConfig = this._handleResultsStage(results, ROLES.SENIOR_COACH, userName);
        if (resultsConfig) return resultsConfig;

        // 2. 个人总结阶段
        const introConfig = this._handleApprovalWaiting(intro);
        if (introConfig) return introConfig;

        // 3. 项目经验处理
        if (experience) {
            if (experience.status === STATUS.PENDING || experience.status === STATUS.REJECTED) {
                return this._createProjectExperienceButton(
                    ROLES.SENIOR_COACH,
                    '要求<span class="highlight-lean">至少参与过4个公司级精益项目</span>,项目中担任角色<span class="highlight-lean">必须为项目举措负责人</span>'
                );
            }
            if (experience.status === STATUS.IN_PROGRESS) {
                return {text: "请等待审核", icon: "bi-hourglass", disabled: true, btnClass: "btn-info"};
            }
        }

        // 4. 培训课程处理
        const trainingCoursesConfig = this._handleTrainingCourses(trainingCourses, ROLES.SENIOR_COACH);
        if (trainingCoursesConfig) return trainingCoursesConfig;

        return {text: "功能正在烘焙中... 🍪", icon: "bi-egg-fried", disabled: true, btnClass: "btn-info"};
    }
}

// ==================== 主 ButtonManager ====================
/**
 * 主按钮管理器
 * 提供按钮状态更新、状态检查、标签页访问控制等功能
 */
export const ButtonManager = {
    // 基础按钮状态更新方法

    /**
     * 更新按钮状态
     * @param {HTMLElement} button - 按钮元素
     * @param {Object} options - 按钮配置选项
     * @param {string} options.text - 按钮文本
     * @param {string} options.icon - 按钮图标类名
     * @param {boolean} options.disabled - 是否禁用
     * @param {function} options.onClick - 点击事件处理函数
     * @param {string} [options.btnClass] - 按钮颜色类
     * @returns {void}
     */
    updateState(button, options) {
        let iconElement = button.querySelector('i');
        if (!iconElement) {
            iconElement = document.createElement('i');
            button.prepend(iconElement);
        }

        let textElement = button.querySelector('.btn-text');
        if (!textElement) {
            textElement = document.createElement('span');
            textElement.className = 'btn-text';
            button.appendChild(textElement);
        }

        // 移除所有可能存在的按钮颜色类
        const btnColorClasses = [
            'btn-primary', 'btn-secondary', 'btn-success',
            'btn-danger', 'btn-warning', 'btn-info', 'btn-light', 'btn-dark'
        ];
        button.classList.remove(...btnColorClasses);

        // 添加新的按钮颜色类
        if (options.btnClass) {
            button.classList.add(options.btnClass);
        } else {
            // 默认使用主色
            button.classList.add('btn-primary');
        }

        iconElement.className = `bi ${options.icon || 'bi-send-check'} me-2`;
        textElement.textContent = options.text || '';
        button.disabled = options.disabled || false;
        button.onclick = options.onClick;
        button.classList.toggle('disabled', options.disabled);
    },

    // 状态检查方法
    /**
     * 检查报名状态
     * @param {string} roleName - 角色名称
     * @returns {boolean} 是否可以报名
     */
    async checkSignUpStatus(roleName) {
        return this.checkStatus(roleName, 'signUp');
    },

    /**
     * 检查项目经验状态
     * @param {string} roleName - 角色名称
     * @returns {boolean} 是否可以提交项目经验
     */
    async checkExperienceStatus(roleName) {
        return this.checkStatus(roleName, 'experience');
    },

    /**
     * 检查状态
     * @param {string} roleName - 角色名称
     * @param {string} [checkType='signUp'] - 检查类型（'signUp'或'experience'）
     * @returns {boolean} 是否可以进行操作
     */
    async checkStatus(roleName, checkType = 'signUp') {
        try {
            const {status, deadline} = await ApiService.checkStatus(roleName, checkType);
            if (status === 0) {
                const titleSuffix = checkType === 'signUp' ? '报名' : '考试申请';
                const closedMessage = checkType === 'signUp' ? '报名通道' : '考试申请通道';

                let deadlineMessage = '';
                if (deadline) {
                    const deadlineDate = new Date(deadline);
                    deadlineMessage = `
                    <div style="margin: 0.5rem 0; color: #495057; font-size: 0.9rem;">
                        <i class="bi bi-calendar-x me-2"></i>
                        截止时间: ${deadlineDate.toLocaleString()}
                    </div>
                `;
                }

                const originalBodyStyle = {
                    overflow: document.body.style.overflow,
                    paddingRight: document.body.style.paddingRight
                };

                await Swal.fire({
                    title: `${roleName} ${titleSuffix}已截止`,
                    html: `
                <div style="margin: 1rem 0; color: #555; font-size: 0.95rem;">
                    ${deadlineMessage}
                <br>
                    <div style="display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-clock" style="margin-right: 8px; color: #6c757d;"></i>
                        当前时间: ${new Date().toLocaleString()}
                    </div>
                </div>
                <div style="color: #dc3545; font-weight: 500; background-color: #f8f9fa; padding: 0.5rem; border-radius: 0.25rem;">
                    <i class="bi bi-exclamation-circle"></i> 当前${closedMessage}已关闭
                </div>
            `,
                    icon: 'error',
                    confirmButtonText: '我知道了',
                    didOpen: () => {
                        // 强制移除SweetAlert2添加的样式
                        document.body.style.paddingRight = '0';
                        document.body.style.overflow = 'hidden';
                        document.documentElement.style.paddingRight = '0';
                    },
                    willClose: () => {
                        // 精确恢复原始样式
                        document.body.style.overflow = originalBodyStyle.overflow;
                        document.body.style.paddingRight = originalBodyStyle.paddingRight;
                        document.documentElement.style.paddingRight = '';
                    }
                });
            }
            return status !== 0;
        } catch (error) {
            console.error(`检查${roleName}状态失败:`, error);
            await Swal.fire({
                title: '系统提示',
                text: `暂时无法获取${checkType === 'signUp' ? '报名' : '考试申请'}状态，请稍后再试`,
                icon: 'warning'
            });
            return true;
        }
    },

    // 主按钮更新方法
    /**
     * 更新报名按钮
     * @param {Array} roleData - 角色相关数据
     * @param {string} role - 用户角色
     * @returns {void}
     */
    updateSignupButton(roleData, role) {
        const config = ButtonStrategyHandler.createConfig(role, roleData);
        this.updateState(domCache.signupButton, config);
    },

    // 标签页可访问性控制
    /**
     * 更新标签页可访问性
     * @param {string} currentRole - 当前角色
     * @param {boolean} userStatus - 用户状态
     * @returns {void}
     */
    updateTabAccessibility(currentRole, userStatus) {
        const roleButtons = document.querySelectorAll('.nav-link');
        const {nowRole} = getAppState();

        roleButtons.forEach((button) => {
            const role = button.getAttribute('data-role');
            const isEnabled = this._shouldEnableTab(role, nowRole);
            button.disabled = !isEnabled;
            button.classList.toggle('disabled', !isEnabled);
        });
    },

    /**
     * 判断标签页是否应该启用
     * @param {string} role - 标签页角色
     * @param {string} nowRole - 当前用户角色
     * @returns {boolean} 是否应该启用
     */
    _shouldEnableTab(role, nowRole) {
        const accessRules = {
            [ROLES.LEAN_STUDENT]: [ROLES.LEAN_STUDENT],
            [ROLES.LEAN_BACKBONE]: [ROLES.LEAN_STUDENT, ROLES.LEAN_BACKBONE],
            [ROLES.LEAN_COACH]: [ROLES.LEAN_STUDENT, ROLES.LEAN_BACKBONE, ROLES.LEAN_COACH],
            [ROLES.SENIOR_COACH]: [ROLES.LEAN_STUDENT, ROLES.LEAN_BACKBONE, ROLES.LEAN_COACH, ROLES.SENIOR_COACH]
        };
        return accessRules[nowRole]?.includes(role) || false;
    },

    // 标签切换方法
    /**
     * 切换到骨干标签页
     * @returns {void}
     */
    async tabTab() {
        try {
            domCache.leanStudentTab.classList.remove('active');
            domCache.leanBackboneTab.classList.add('active');

            batchUpdateState({
                currentRole: ROLES.LEAN_BACKBONE,
                tabRole: ROLES.LEAN_BACKBONE,
                nowRole: ROLES.LEAN_BACKBONE
            });

            const {userName} = getAppState();
            this.updateTabAccessibility(ROLES.LEAN_BACKBONE, true);
            await TimelineManager.generateTimeline(userName, ROLES.LEAN_BACKBONE);
        } catch (error) {
            console.error("页签切换失败:", error);
        }
    },

    /**
     * 切换到教练标签页
     * @returns {void}
     */
    async tabTabCoach() {
        const {userName} = getAppState();
        batchUpdateState({
            currentRole: ROLES.LEAN_COACH,
            tabRole: ROLES.LEAN_COACH
        });

        domCache.leanBackboneTab.classList.remove('active');
        domCache.leanCoachTab.classList.add('active');
        this.updateTabAccessibility(ROLES.LEAN_COACH, true);
        await TimelineManager.generateTimeline(userName, ROLES.LEAN_COACH);
        location.reload();
    },

    /**
     * 切换到资深教练标签页
     * @returns {void}
     */
    async tabSeniorCoach() {
        const {userName} = getAppState();
        batchUpdateState({
            currentRole: ROLES.SENIOR_COACH,
            tabRole: ROLES.SENIOR_COACH
        });

        domCache.leanCoachTab.classList.remove('active');
        domCache.seniorCoachTab.classList.add('active');
        this.updateTabAccessibility(ROLES.SENIOR_COACH, true);
        await TimelineManager.generateTimeline(userName, ROLES.SENIOR_COACH);
        location.reload();
    }
};