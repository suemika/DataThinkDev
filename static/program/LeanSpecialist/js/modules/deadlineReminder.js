/**
 * 截止日期提醒模块
 * 负责检查和显示各种认证流程的截止时间提醒
 * 包括报名截止、考试申请截止等，并根据剩余时间提供不同级别的提醒
 */
import {ROLES, STATUS} from './constants.js';
import {domCache} from './domCache.js';
import {getAppState} from './appState.js';
import {ApiService} from './apiService.js';

export const DeadlineReminder = {
    /**
     * 检查并显示截止时间提醒
     * 根据当前应用状态确定是否需要检查截止时间
     * @returns {Promise<void>}
     */
    async checkAndShow() {
        let {currentStage, currentId, currentRole, userStatus} = getAppState();
        // 确定检查类型
        let checkType;
        // 3: 学员认证考试通过
        // 7: 骨干认证结果通过
        // 12: 精益教练认证通过
        // 2、9: 考试通过
        if (!currentId || (currentId === 3 && currentStage === '已完成') || (currentId === 7 && currentStage === '已通过') || (currentId === 12 && currentStage === '已通过')) {
            checkType = 'signUp';
        } else if (currentId === 2 || currentId === 9 && currentStage === '已通过') {
            checkType = 'experience';
        } else {
            return;
        }

        try {
            // 更新角色状态
            if (userStatus) {
                const roleMap = {
                    [ROLES.LEAN_STUDENT]: ROLES.LEAN_BACKBONE,
                    [ROLES.LEAN_BACKBONE]: ROLES.LEAN_COACH,
                    [ROLES.LEAN_COACH]: ROLES.SENIOR_COACH
                };
                currentRole = roleMap[currentRole] || currentRole;
            }

            const {status, deadline} = await ApiService.checkStatus(currentRole, checkType);


            // 无论是否截止都显示提醒
            this.updateAlert(currentRole, checkType, status, deadline);

            // 如果已截止，显示特别的截止提醒
            if (status === 0) {
                this.showExpiredAlert(currentRole, checkType, deadline);
            }
        } catch (error) {
            console.error('检查截止时间失败:', error);
        }
    },

    /**
     * 更新截止时间提醒UI
     * 根据角色、检查类型、状态和截止日期更新提醒栏的显示
     * @param {string} role - 用户角色
     * @param {string} checkType - 检查类型（signUp/experience）
     * @param {number} status - 状态码（1:进行中, 0:已截止）
     * @param {string} deadline - 截止日期时间字符串
     */
    updateAlert(role, checkType, status, deadline) {
        const alertBar = document.getElementById('statusAlertBar');
        if (!alertBar) return;

        // 即使已截止也显示提醒栏，但样式不同
        if (deadline) {
            const deadlineDate = new Date(deadline);
            const timeLeft = deadlineDate - new Date();
            const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

            // 设置提醒内容
            document.getElementById('statusAlertTitle').textContent =
                `${role} ${checkType === 'signUp' ? '报名' : '考试申请'}${status === 1 ? '进行中' : '已截止'}`;
            document.getElementById('statusAlertContent').innerHTML = `
                <div>截止时间: ${deadlineDate.toLocaleString()}</div>
                ${status === 1 ? `<div class="fw-bold mt-1">剩余时间: ${daysLeft}天</div>` : ''}
            `;

            // 根据状态设置样式
            const alertClasses = {
                icon: status === 1 ? 'bi-info-circle-fill' : 'bi-exclamation-triangle-fill',
                bar: status === 1 ? 'alert-info' : 'alert-danger'
            };

            if (status === 1 && daysLeft <= 7) {
                alertClasses.icon = daysLeft <= 3 ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-circle-fill';
                alertClasses.bar = daysLeft <= 3 ? 'alert-danger' : 'alert-warning';
            }

            alertBar.className = `alert ${alertClasses.bar} alert-dismissible fade show mb-4`;
            document.getElementById('statusAlertIcon').className = `bi ${alertClasses.icon} me-3 fs-4`;
            alertBar.style.display = 'block';

            // 如果未截止且剩余时间少于3天，显示紧急提醒
            if (status === 1 && daysLeft <= 3 && daysLeft > 0) {
                this.showUrgentReminder(role, checkType, deadlineDate, daysLeft);
            }
        } else {
            alertBar.style.display = 'none';
        }
    },

    /**
     * 显示截止过期提醒
     * 当报名或考试申请已截止时显示的弹窗提醒
     * @param {string} role - 用户角色
     * @param {string} type - 类型（signUp/experience）
     * @param {string} deadline - 截止日期时间字符串
     */
    showExpiredAlert(role, type, deadline) {
        const deadlineDate = deadline ? new Date(deadline).toLocaleString() : '已截止';

        const originalBodyStyle = {
            overflow: document.body.style.overflow,
            paddingRight: document.body.style.paddingRight
        };

        Swal.fire({
            title: `${role} ${type === 'signUp' ? '报名' : '考试申请'}已截止`,
            html: `
        <div style="text-align: left; margin: 1rem 0; color: #555;">
            <div class="mb-2">
                <i class="bi bi-exclamation-triangle-fill" style="color: #dc3545; margin-right: 8px;"></i>
                <strong>截止时间: ${deadlineDate}</strong>
            </div>
            <div style="color: #dc3545; font-weight: 500; background-color: #f8f9fa; margin-right: 8px; padding: 0.5rem; border-radius: 0.25rem;">
                    <i class="bi bi-exclamation-circle"></i> ${type === 'signUp' ? '报名' : '考试申请'}通道已关闭,请等待下次开放
                </div>
        </div>
        `,
            icon: 'error',
            confirmButtonText: '我知道了',
            confirmButtonColor: '#6c757d',
            backdrop: `rgba(0, 0, 0, 0.4)`,
            allowOutsideClick: false,
            timer: 3000, // 5秒后自动关闭（单位：毫秒）
            timerProgressBar: true, // 显示进度条
            didOpen: () => {
                // 强制移除SweetAlert2添加的样式
                document.body.style.paddingRight = '0';
                document.documentElement.style.paddingRight = '0';
            },
            willClose: () => {
                // 精确恢复原始样式
                document.body.style.paddingRight = originalBodyStyle.paddingRight;
                document.documentElement.style.paddingRight = '';
            }
        });
    },

    /**
     * 显示紧急提醒弹窗
     * 当截止时间即将到来（剩余时间≤3天）时显示的警告弹窗
     * @param {string} role - 用户角色
     * @param {string} type - 类型（signUp/experience）
     * @param {Date} deadlineDate - 截止日期Date对象
     * @param {number} daysLeft - 剩余天数
     */
    showUrgentReminder(role, type, deadlineDate, daysLeft) {
        Swal.fire({
            title: `${role} ${type === 'signUp' ? '报名' : '考试申请'}即将截止`,
            html: `
            <div style="text-align: left; margin: 1rem 0; color: #555;">
                <div class="mb-2">
                    <i class="bi bi-exclamation-triangle-fill" style="color: #dc3545; margin-right: 8px;"></i>
                    <strong>剩余时间仅剩 ${daysLeft} 天!</strong>
                </div>
                <div class="mb-2">
                    <i class="bi bi-calendar-x" style="margin-right: 8px;"></i>
                    截止时间: ${deadlineDate.toLocaleString()}
                </div>
                <div class="small text-muted mt-2">
                    请及时完成${type === 'signUp' ? '报名' : '考试申请'}，逾期将无法提交
                </div>
            </div>
            `,
            icon: 'warning',
            confirmButtonText: '立即处理',
            confirmButtonColor: '#dc3545',
            showCancelButton: true,
            cancelButtonText: '稍后再说',
            backdrop: `rgba(0, 0, 0, 0.4)`,
            allowOutsideClick: false,
            timer: 3000, // 5秒后自动关闭（单位：毫秒）
            timerProgressBar: true, // 显示进度条
        }).then((result) => {
            if (result.isConfirmed) {
                this.highlightActionButton();
            }
        });
    },

    /**
     * 高亮操作按钮
     * 滚动到操作按钮并添加脉冲动画效果，引导用户点击
     */
    highlightActionButton() {
        const button = domCache.signupButton;
        if (!button) return;

        button.scrollIntoView({behavior: 'smooth', block: 'center'});
        button.classList.add('pulse-animation');
        setTimeout(() => {
            button.classList.remove('pulse-animation');
        }, 3000);
    },


/**
     * 检查考试通过状态并显示相应提示
     * 根据考试结果显示庆祝或失败提示
     * @param {number} examResult - 考试结果状态码
     * @returns {Promise<void>}
     */
    checkExamPassedCelebration(examResult) {
        return new Promise((resolve) => {
            // 立即检查现有元素

            const isPassed = examResult === STATUS.APPROVED;

            if (isPassed) {
                this.showCelebration();
                return resolve();
            } else {
                this.showFailureNotice();
                return resolve();
            }
            // 设置观察器检查动态加载的元素
            const observer = new MutationObserver((mutations, obs) => {
                const passed = document.querySelector('.trigger-confetti');
                if (passed) {
                    this.showCelebration();
                    obs.disconnect();
                    resolve();
                } else {
                    this.showFailureNotice();
                    obs.disconnect();
                    resolve();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 设置超时以防元素永远不出现
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 5000);
        });
    },

// 修改庆祝弹窗函数
    /**
     * 显示考试通过的庆祝弹窗
     * 包含动画效果和结果提交功能
     */
    showCelebration() {
        // 确保不会重复触发
        if (window.hasCelebratedExam) return;
        window.hasCelebratedExam = true;
        let currentName = getAppState().currentName;
        let currentRole = getAppState().currentRole;

        if (currentName === '认证学习' || currentName === '项目经验审核') {
            currentName = '认证考试';
        }

        // 精美成功弹窗配置
        Swal.fire({
            title: `<span style="color: #4CAF50; font-size: 1.5em;">🎉 恭喜通过<br>${currentRole}-${currentName}!</span>`,
            text: `您已成功通过${currentName}！`,
            icon: 'success',
            iconColor: '#4CAF50',
            confirmButtonText: '太棒了!',
            confirmButtonColor: '#4CAF50',
            backdrop: `
            radial-gradient(circle at center, 
            rgba(76, 175, 80, 0.2) 0%, 
            rgba(0,0,0,0.6) 100%)
        `,
            showClass: {
                popup: 'animate__animated animate__fadeInDown animate__faster',
                icon: 'animate__animated animate__heartBeat animate__delay-1s'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp animate__faster'
            },
            customClass: {
                popup: 'sweet-alert-custom',
                title: 'sweet-title-success'
            },
            width: '600px',
            padding: '2em',
            didOpen: () => {
                // 在弹窗打开后触发庆祝效果
                this.launchConfettiEffectInModal();
            }
        }).then(async (result) => {
            debugger
            const {examId, currentRole, userName} = getAppState();
            if (result.isConfirmed && (examId || currentName==='认证结果')) {
                const feedbackData = {
                    workId: userName,
                    role: currentRole,
                    examId: examId,
                    timestamp: new Date().toISOString(),
                    currentName: currentName
                };
                try {
                    await ApiService.fetchDataFromAPI('757', feedbackData);
                } catch (error) {
                    console.error('提交通过记录失败:', error);

                }
            }
        });
    },

/**
     * 在弹窗内部显示的庆祝效果
     * 使用confetti库在通过考试的弹窗中显示五彩纸屑效果
     */
    launchConfettiEffectInModal() {
        if (typeof confetti === 'function') {
            // 获取弹窗DOM元素
            const modal = document.querySelector('.swal2-popup');

            // 创建canvas元素作为容器
            const canvas = document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999';

            // 将canvas添加到弹窗中
            modal.appendChild(canvas);

            // 初始化confetti实例
            const myConfetti = confetti.create(canvas, {
                resize: true,
                useWorker: true
            });

            // 计算弹窗中心位置
            const modalRect = modal.getBoundingClientRect();
            const centerX = 0.5;
            const centerY = 1; // 从弹窗上部开始喷射

            // 喷射配置
            myConfetti({
                particleCount: 150,
                spread: 70,
                origin: {
                    x: centerX,
                    y: centerY
                },
                colors: ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#706fff', '#ff42d2'],
                ticks: 500 // 持续时间
            });

            // 2秒后移除canvas
            setTimeout(() => {
                modal.removeChild(canvas);
            }, 2000);
        }
    },

    /**
     * 显示考试未通过的提示弹窗
     * 包含鼓励信息和结果提交功能
     */
    showFailureNotice() {
        // 确保不会重复触发
        if (window.hasCelebratedExam) return;
        window.hasCelebratedExam = true;

        let currentName = getAppState().currentName;

        if (currentName === '认证学习' || currentName === '项目经验审核') {
            currentName = '认证考试';
        }

        // 精美的失败提示弹窗
        Swal.fire({
            title: `<span style="color: #F44336; font-size: 1.5em;">📝 ${currentName}未通过</span>`,
            html: `
        
                    <div style="font-weight: 500; background-color: #f8f9fa; margin-right: 8px; padding: 0.5rem; border-radius: 0.25rem;">
                    <i class="bi bi-exclamation-circle"></i> 很遗憾，您本次${currentName}未达到合格标准
                </div>
       
        `,
            icon: 'error',
            confirmButtonText: '我知道了',
            confirmButtonColor: '#2196F3',
            allowOutsideClick: false,
            allowEscapeKey: false,
            backdrop: `
            linear-gradient(to bottom, 
            rgba(244, 67, 54, 0.1) 0%, 
            rgba(0,0,0,0.7) 100%)
        `,
            width: '650px',
            padding: '2em',
            showClass: {
                popup: 'animate__animated animate__fadeIn'
            },
            customClass: {
                popup: 'sweet-alert-custom',
                title: 'sweet-title-error'
            }
        }).then(async (result) => {
            const {examId, currentRole, userName} = getAppState();
            if (examId || currentName==='认证结果') {
                const feedbackData = {
                    workId: userName,
                    role: currentRole,
                    examId: examId,
                    timestamp: new Date().toISOString(),
                    currentName: currentName
                };
                try {
                    await ApiService.fetchDataFromAPI('757', feedbackData);
                } catch (error) {
                    console.error('提交记录失败:', error);
                }
            }
        });
    },

};