import {STATUS, ROLES, completedText} from './constants.js';
import {domCache} from './domCache.js';
import {TimelineManager} from './timeline/timelineManager.js';
import {getAppState, setAppState} from "./appState.js";
import {ApiService} from './apiService.js';

export const ButtonManager = {
    updateState(button, options) {
        // 确保图标元素存在
        let iconElement = button.querySelector('i');
        if (!iconElement) {
            iconElement = document.createElement('i');
            iconElement.className = `bi ${options.icon || 'bi-send-check'} me-2`;
            button.prepend(iconElement);
        }

        // 确保文字元素存在
        let textElement = button.querySelector('.btn-text');
        if (!textElement) {
            textElement = document.createElement('span');
            textElement.className = 'btn-text';
            button.appendChild(textElement);
        }

        // 更新图标（如果提供了新图标）
        if (options.icon) {
            iconElement.className = `bi ${options.icon} me-2`;
        }

        // 更新文字
        textElement.textContent = options.text || '';

        // 更新其他属性
        button.disabled = options.disabled || false;
        button.onclick = options.onClick || null;
        button.classList.toggle('disabled', options.disabled);
    },
    /**
     ◦ 检查报名状态是否开放

     ◦ @param {string} roleName 角色名称（ROLES.LEAN_COACH、ROLES.LEAN_BACKBONE等）

     ◦ @returns {Promise<boolean>} 返回true表示报名开放，false表示已截止

     */
    async checkSignUpStatus(roleName) {
        return this.checkStatus(roleName, 'signUp');
    },

    async checkExperienceStatus(roleName) {
        return this.checkStatus(roleName, 'experience');
    },

    /**
     ◦ 检查状态是否开放（报名/考试）

     ◦ @param {string} roleName 角色名称

     ◦ @param {string} checkType 检查类型 ('signUp' 或 'experience')

     ◦ @returns {Promise<boolean>} 返回true表示开放，false表示已截止

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
                return false;
            }
            return true;
        } catch (error) {
            console.error(`检查${roleName}状态失败:`, error);
            await Swal.fire({
                title: '系统提示',
                text: `暂时无法获取${checkType === 'signUp' ? '报名' : '考试申请'}状态，请稍后再试`,
                icon: 'warning'
            });
            return false;
        }
    },
    updateSignupButton(roleData, role) {
        const {userName} = getAppState();
        this.updateState(domCache.signupButton, {
            text: "立即报名",
            icon: "bi-send-check",
            disabled: false,
            onClick: async () => {

                const isOpen = await this.checkSignUpStatus(ROLES.LEAN_STUDENT);
                if (!isOpen) return;
                location.href = `lean_list.html?gzbh=${userName}`
            }
        });

        switch (role) {
            case ROLES.LEAN_STUDENT:
                this.handleLeanStudent(roleData, domCache.signupButton);
                break;
            case ROLES.LEAN_BACKBONE:
                this.handleLeanBackbone(roleData, domCache.signupButton);
                break;
            case ROLES.LEAN_COACH:
                this.handleLeanCoach(roleData, domCache.signupButton);
                break;
            case ROLES.SENIOR_COACH:
                this.handleSeniorCoach(roleData, domCache.signupButton);
                break;
            default:
                break;
        }
    },
    updateTabAccessibility(currentRole, userStatus) {
        const roleButtons = document.querySelectorAll('.nav-link');
        const {nowRole} = getAppState(); // 获取用户当前实际角色
        console.log('当前角色:', nowRole);
        roleButtons.forEach((button) => {
            const role = button.getAttribute('data-role');

            // 默认禁用所有非当前角色的标签页
            let isEnabled = role === currentRole;

            // 学员只能访问学员标签
            if (nowRole === ROLES.LEAN_STUDENT) {
                isEnabled = role === ROLES.LEAN_STUDENT;
            }
            // 骨干可以访问骨干和学员标签
            else if (nowRole === ROLES.LEAN_BACKBONE) {
                isEnabled = role === ROLES.LEAN_STUDENT || role === ROLES.LEAN_BACKBONE;
            }
            // 教练可以访问所有标签
            else if (nowRole === ROLES.LEAN_COACH) {
                isEnabled = role === ROLES.LEAN_STUDENT || role === ROLES.LEAN_BACKBONE || role === ROLES.LEAN_COACH;
            }

            // 教练可以访问所有标签
            else if (nowRole === ROLES.SENIOR_COACH) {
                isEnabled = role === ROLES.LEAN_STUDENT || role === ROLES.LEAN_BACKBONE || role === ROLES.LEAN_COACH || role === ROLES.SENIOR_COACH;
            }

            button.disabled = !isEnabled;
            button.classList.toggle('disabled', !isEnabled);
        });
    },
    async tabTab() {

        try {
            // 仅切换UI状态
            domCache.leanStudentTab.classList.remove('active');
            domCache.leanBackboneTab.classList.add('active');

            // 1. 更新状态，启用教练标签
            setAppState({
                currentRole: ROLES.LEAN_BACKBONE,
                tabRole: ROLES.LEAN_BACKBONE,
                nowRole: ROLES.LEAN_BACKBONE
            });

            // 加载数据
            const {userName} = getAppState();
            this.updateTabAccessibility(ROLES.LEAN_BACKBONE, true);
            await TimelineManager.generateTimeline(userName, ROLES.LEAN_BACKBONE);

        } catch (error) {
            console.error("页签切换失败:", error);
        }
    }
    ,
    async tabTabCoach() {
        const {userName} = getAppState();

        // 1. 更新状态，启用教练标签
        setAppState({
            isCoachTabEnabled: true,
            currentRole: ROLES.LEAN_COACH,
            tabRole: ROLES.LEAN_COACH
        });

        // 2. 更新UI
        domCache.leanBackboneTab.classList.remove('active');
        domCache.leanCoachTab.classList.add('active');

        // 3. 更新标签页的可访问性状态
        this.updateTabAccessibility(ROLES.LEAN_COACH, true);

        // 4. 加载时间线数据
        await TimelineManager.generateTimeline(userName, ROLES.LEAN_COACH);

        // 5. 可选：刷新页面以应用所有更改
        location.reload();
    },
    async tabSeniorCoach() {

        const {userName} = getAppState();

        // 1. 更新状态，启用教练标签
        setAppState({
            isCoachTabEnabled: true,
            currentRole: ROLES.SENIOR_COACH,
            tabRole: ROLES.SENIOR_COACH
        });

        // 2. 更新UI
        domCache.leanCoachTab.classList.remove('active');
        domCache.seniorCoachTab.classList.add('active');

        // 3. 更新标签页的可访问性状态
        this.updateTabAccessibility(ROLES.SENIOR_COACH, true);

        // 4. 加载时间线数据
        await TimelineManager.generateTimeline(userName, ROLES.SENIOR_COACH);

        // 5. 可选：刷新页面以应用所有更改
        location.reload();
    },

    updateSignupButtonAfterExamApplied(examStage) {

        const now = new Date();

        if (examStage.exam_result === STATUS.STARTED) {

            // 1. 解析时间字符串（如 "2025-07-09 10:00-10:35"）
            const [datePart, timeRange] = examStage.exam_time.split(" "); // ["2025-07-09", "10:00-10:35"]
            const [startTimeStr, endTimeStr] = timeRange.split("-"); // ["10:00", "10:35"]

            // 2. 构造考试开始和结束时间（Date对象）
            const examStartTime = new Date(`${datePart}T${startTimeStr}:00`);
            const examEndTime = new Date(`${datePart}T${endTimeStr}:00`);

            if (now < examStartTime) {
                this.updateState(domCache.signupButton, {
                    text: "考试未开始，请等待",
                    icon: "bi-hourglass",
                    disabled: true
                });
            } else if (now >= examStartTime && now <= examEndTime) {
                this.updateState(domCache.signupButton, {
                    text: "考试进行中，请准时参加",
                    icon: "bi-clock",
                    disabled: true
                });
            } else {
                this.updateState(domCache.signupButton, {
                    text: "考试已结束，请等待结果",
                    icon: "bi-hourglass",
                    disabled: true
                });
            }

        } else {
            this.updateState(domCache.signupButton, {
                text: "请等待考试时间",
                icon: "bi-hourglass", // 等待图标
                disabled: true
            });
        }
    },
    //处理精益学员数据
    handleLeanStudent(roleData) {
        let {userStatus, userData, currentRole, userName, nowRole} = getAppState();
        const registrationStage = roleData.find(item => item.stage_name === "认证报名");
        const examStage = roleData.find(item => item.stage_name === "认证考试");

        if (!userStatus && nowRole !== ROLES.LEAN_STUDENT) {
            userStatus = true;
        }

        if (userStatus && nowRole === ROLES.LEAN_STUDENT) {
            this.updateState(domCache.signupButton, {
                text: "申请精益骨干报名",
                icon: "bi-arrow-up-circle",
                disabled: false,
                onClick: async () => {

                    const isOpen = await this.checkSignUpStatus(ROLES.LEAN_BACKBONE);
                    if (!isOpen) return;

                    domCache.signupButton.disabled = true;
                    await this.tabTab();
                    domCache.signupButton.disabled = false;
                }
            });
            return;
        } else if (userStatus && userData) {
            this.updateState(domCache.signupButton, {
                text: completedText,
                icon: "bi-award", // 通过图标
                disabled: true
            });
            return;
        }

        if (registrationStage) {
            if (registrationStage.status === STATUS.IN_PROGRESS) {
                this.updateState(domCache.signupButton, {
                    text: "请等待审核",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
            } else if (registrationStage.status === STATUS.COMPLETED) {
                this.updateState(domCache.signupButton, {
                    text: "申请精益学员考试",
                    disabled: false,
                    icon: "bi-pencil-square", // 考试图标
                    onClick: async () => {
                        const isOpen = await this.checkExperienceStatus(ROLES.LEAN_STUDENT);
                        if (!isOpen) return;
                        if (confirm("已经学习完成，确认考试吗？")) {
                            await ApiService.applyForExam(userName, currentRole);
                            location.reload();
                        }
                    }
                });
            }
        }

        if (examStage) {
            if (examStage.status === STATUS.IN_PROGRESS) {
                this.updateSignupButtonAfterExamApplied(examStage);
            } else if (examStage.status === STATUS.COMPLETED && examStage.exam_result === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: completedText,
                    icon: "bi-award", // 通过图标
                    disabled: true
                });
            }
        }
    },
//处理精益骨干数据
    handleLeanBackbone(roleData) {

        const {userStatus, nowRole, userName, currentRole, specialRole} = getAppState();
        const examStage = roleData.find(item => item.stage_name === "认证考试");
        const leanStage = roleData.find(item => item.stage_name === "认证学习");
        const experience = roleData.find(item => item.stage_name === "项目经验审核");
        const intro = roleData.find(item => item.stage_name === "个人总结与自评");
        const results = roleData.find(item => item.stage_name === "认证结果");
        if (userStatus && nowRole === ROLES.LEAN_BACKBONE) {
            this.updateState(domCache.signupButton, {
                text: "申请精益教练报名",
                icon: "bi-person-plus", // 教练申请图标
                disabled: false,
                onClick: async () => {
                    try {

                        const isOpen = await this.checkSignUpStatus(ROLES.LEAN_COACH);
                        if (!isOpen) return;

                        await ApiService.applyForSignUp(userName, ROLES.LEAN_COACH);
                        await this.tabTabCoach();
                    } finally {
                        domCache.signupButton.disabled = false;
                    }
                }
            });
            return;
        }

        if (!userStatus && (nowRole === ROLES.LEAN_COACH || nowRole === ROLES.SENIOR_COACH)) {
            this.updateState(domCache.signupButton, {
                text: completedText,
                icon: "bi-award", // 通过图标
                disabled: true
            });
            return;
        }

        if (results) {
            if (results.status === STATUS.REJECTED) {
                this.updateState(domCache.signupButton, {
                    text: "申请精益骨干认证",
                    disabled: false,
                    icon: "bi-pencil", // 填写图标
                    onClick: async () => {
                        const isOpen = await this.checkSignUpStatus(ROLES.LEAN_BACKBONE);
                        if (!isOpen) return;
                        if (confirm("确认申请精益骨干认证吗？")) {
                            await ApiService.applyForIntroAgain(userName);
                            location.reload();
                        }
                    }
                });
                return;
            } else if (results.status === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: completedText,
                    icon: "bi-award", // 通过图标
                    disabled: true
                });
                return;
            }
        }
        if (intro) {
            if (intro.status === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: "请等待认证结果",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
                return;
            }
        }

        if (leanStage && leanStage.status === STATUS.PENDING) {
            this.updateState(domCache.signupButton, {
                text: "申请精益骨干报名",
                disabled: false,
                icon: "bi-send-check", // 报名图标
                onClick: async () => {
                    const isOpen = await this.checkSignUpStatus(ROLES.LEAN_BACKBONE);
                    if (!isOpen) return;

                    await ApiService.applyForSignUp(userName);
                    location.reload();
                }
            });
            return;
        }
        if (experience) {
            if (experience.status === STATUS.PENDING || experience.status === STATUS.REJECTED) {
                this.updateState(domCache.signupButton, {
                    text: "申请项目经验审核",
                    disabled: false,
                    icon: "bi-file-earmark-text", // 文件图标
                    onClick: async () => {
                        const isOpen = await this.checkExperienceStatus(ROLES.LEAN_BACKBONE);
                        if (!isOpen) return;

                        const modal = new bootstrap.Modal(domCache.projectExperienceModal);
                        modal.show();
                    }
                });
            } else if (experience.status === STATUS.IN_PROGRESS) {
                this.updateState(domCache.signupButton, {
                    text: "请等待审核",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
            } else if (experience.status === STATUS.COMPLETED || experience.status === STATUS.APPROVED) {
                if (examStage) {
                    if (examStage.status === STATUS.IN_PROGRESS) {
                        this.updateSignupButtonAfterExamApplied(examStage);
                    } else if (examStage.status === STATUS.COMPLETED) {
                        this.updateState(domCache.signupButton, {
                            text: "填写个人总结与自评",
                            icon: "bi-pencil", // 填写图标
                            disabled: false,
                            onClick: () => {
                                const optionsModal = new bootstrap.Modal(domCache.optionsModal);
                                optionsModal.show();
                            }
                        });
                    } else {
                        this.updateState(domCache.signupButton, {
                            text: "申请骨干考试",
                            icon: "bi-pencil-square", // 考试图标
                            disabled: false,
                            onClick: async () => {
                                const isOpen = await this.checkExperienceStatus(ROLES.LEAN_BACKBONE);
                                if (!isOpen) return;
                                if (confirm("确认申请骨干考试吗？")) {
                                    await ApiService.applyForBackboneExam(userName, currentRole);
                                    location.reload();
                                }
                            }
                        });
                    }
                }
            }
        }
    },
    //处理精益教练数据
    handleLeanCoach(roleData) {
        const {userStatus, nowRole, userName} = getAppState();
        const trainingCourses = roleData.find(item => item.stage_name === "课程实训任务审核");
        const leanStage = roleData.find(item => item.stage_name === "认证学习");
        const experience = roleData.find(item => item.stage_name === "项目经验审核");
        const intro = roleData.find(item => item.stage_name === "个人总结与自评");
        const results = roleData.find(item => item.stage_name === "认证结果");

        if (userStatus && nowRole === ROLES.LEAN_COACH) {
            this.updateState(domCache.signupButton, {
                text: "申请资深教练报名",
                icon: "bi-person-plus", // 教练申请图标
                disabled: false,
                onClick: async () => {
                    try {
                        await ApiService.applyForSignUp(userName, ROLES.SENIOR_COACH);
                        await this.tabSeniorCoach();
                    } finally {
                        domCache.signupButton.disabled = true;
                    }
                }
            });
            return;
        }

        if (!userStatus && nowRole === ROLES.SENIOR_COACH) {
            this.updateState(domCache.signupButton, {
                text: completedText,
                icon: "bi-award", // 通过图标
                disabled: true
            });
            return;
        }


        if (results) {
            if (results.status === STATUS.REJECTED) {
                this.updateState(domCache.signupButton, {
                    text: "申请精益教练认证",
                    disabled: false,
                    icon: "bi-pencil", // 填写图标
                    onClick: async () => {

                        const isOpen = await this.checkSignUpStatus(ROLES.LEAN_COACH);
                        if (!isOpen) return;
                        if (confirm("确认申请精益教练认证吗？")) {
                            await ApiService.applyForIntroAgain(userName);
                            location.reload();

                        }
                    }
                });
                return;
            } else if (results.status === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: completedText,
                    icon: "bi-award", // 通过图标
                    disabled: true
                });
                return;
            }
        }
        if (intro) {
            if (intro.status === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: "请等待认证结果",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
                return;
            }
        }
        if (trainingCourses) {
            if (trainingCourses.status === STATUS.APPROVED || trainingCourses.status === STATUS.COMPLETED) {
                this.updateState(domCache.signupButton, {
                    text: "填写个人总结与自评",
                    icon: "bi-pencil", // 填写图标
                    disabled: false,
                    onClick: () => {
                        const optionsModal = new bootstrap.Modal(domCache.optionsModal);
                        optionsModal.show();

                    }
                });
                return;
            }
            if (trainingCourses.status === STATUS.IN_PROGRESS) {
                this.updateState(domCache.signupButton, {
                    text: "实训任务进行中",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
                return;
            }
        }

        if (leanStage && leanStage.status === STATUS.PENDING) {
            this.updateState(domCache.signupButton, {
                text: "申请精益教练报名",
                disabled: false,
                icon: "bi-send-check", // 报名图标
                onClick: async () => {
                    const isOpen = await this.checkSignUpStatus(ROLES.LEAN_COACH);
                    if (!isOpen) return;

                    await ApiService.applyForSignUp(userName, ROLES.LEAN_COACH);
                    location.reload();
                }
            });
            return;
        }

        if (experience) {
            if (experience.status === STATUS.PENDING || experience.status === STATUS.REJECTED) {
                this.updateState(domCache.signupButton, {
                    text: "申请项目经验审核",
                    disabled: false,
                    icon: "bi-file-earmark-text", // 文件图标
                    onClick: () => {
                        const modal = new bootstrap.Modal(domCache.projectExperienceModal);

                        // 监听模态框显示事件
                        domCache.projectExperienceModal.addEventListener('show.bs.modal', function onShow() {
                            // 查找提示信息元素
                            const alertElement = this.querySelector('.alert span.small');

                            // 修改提示文本
                            if (alertElement) {
                                alertElement.innerHTML = `
                                                要求至少参与过1个公司级精益项目或2个部门级精益项目,
                                                项目中担任角色必须为项目举措负责人
                                            `;
                            }

                            // 防止重复添加事件监听器
                            this.removeEventListener('show.bs.modal', onShow);
                        });

                        modal.show();
                    }
                });
            } else if (experience.status === STATUS.IN_PROGRESS) {
                this.updateState(domCache.signupButton, {
                    text: "请等待审核",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
            }
        }
    },
    //处理资深教练数据
    handleSeniorCoach(roleData) {

        const {userStatus, nowRole, userName} = getAppState();
        const trainingCourses = roleData.find(item => item.stage_name === "课程实训任务审核");
        const leanStage = roleData.find(item => item.stage_name === "认证学习");
        const experience = roleData.find(item => item.stage_name === "项目经验审核");
        const intro = roleData.find(item => item.stage_name === "个人总结与自评");
        const results = roleData.find(item => item.stage_name === "认证结果");

        if (results) {
            if (results.status === STATUS.REJECTED) {
                this.updateState(domCache.signupButton, {
                    text: "申请资深教练认证",
                    disabled: false,
                    icon: "bi-pencil", // 填写图标
                    onClick: async () => {

                        const isOpen = await this.checkSignUpStatus(ROLES.SENIOR_COACH);
                        if (!isOpen) return;
                        if (confirm("确认申请资深教练认证吗？")) {
                            await ApiService.applyForIntroAgain(userName);
                            location.reload();

                        }
                    }
                });
                return;
            } else if (results.status === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: completedText,
                    icon: "bi-award", // 通过图标
                    disabled: true
                });
                return;
            }
        }

        if (intro) {
            if (intro.status === STATUS.APPROVED) {
                this.updateState(domCache.signupButton, {
                    text: "请等待认证结果",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
                return;
            }
        }

        if (trainingCourses) {/*
            if (trainingCourses.status === STATUS.APPROVED || trainingCourses.status === STATUS.COMPLETED) {
                this.updateState(domCache.signupButton, {
                    text: "填写个人总结与自评",
                    icon: "bi-pencil", // 填写图标
                    disabled: false,
                    onClick: () => {
                        const optionsModal = new bootstrap.Modal(domCache.optionsModal);
                        optionsModal.show();

                    }
                });
                return;
            }

            if (trainingCourses.status === STATUS.IN_PROGRESS) {
                this.updateState(domCache.signupButton, {
                    text: "实训任务进行中",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
                return;
            }*/

            this.updateState(domCache.signupButton, {
                text: "功能正在烘焙中... 🍪",
                icon: "bi-egg-fried", // 等待图标
                disabled: true
            });
        }

        if (leanStage && leanStage.status === STATUS.PENDING) {
            this.updateState(domCache.signupButton, {
                text: "申请资深教练报名",
                disabled: false,
                icon: "bi-send-check", // 报名图标
                onClick: async () => {
                    const isOpen = await this.checkSignUpStatus(ROLES.SENIOR_COACH);
                    if (!isOpen) return;

                    await ApiService.applyForSignUp(userName, ROLES.SENIOR_COACH);
                    location.reload();
                }
            });
            return;
        }

        if (experience) {
            if (experience.status === STATUS.PENDING || experience.status === STATUS.REJECTED) {
                this.updateState(domCache.signupButton, {
                    text: "申请项目经验审核",
                    disabled: false,
                    icon: "bi-file-earmark-text", // 文件图标
                    onClick: () => {
                        const modal = new bootstrap.Modal(domCache.projectExperienceModal);

                        // 监听模态框显示事件
                        domCache.projectExperienceModal.addEventListener('show.bs.modal', function onShow() {
                            // 查找提示信息元素
                            const alertElement = this.querySelector('.alert span.small');

                            // 修改提示文本
                            if (alertElement) {
                                alertElement.innerHTML = `
                                                要求至少参与过4个公司级精益项目,
                                                项目中担任角色必须为项目举措负责人
                                            `;
                            }

                            // 防止重复添加事件监听器
                            this.removeEventListener('show.bs.modal', onShow);
                        });

                        modal.show();
                    }
                });
            } else if (experience.status === STATUS.IN_PROGRESS) {
                this.updateState(domCache.signupButton, {
                    text: "请等待审核",
                    icon: "bi-hourglass", // 等待图标
                    disabled: true
                });
            }
        }
    }
};
