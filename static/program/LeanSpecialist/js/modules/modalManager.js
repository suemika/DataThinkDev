/**
 * 模态框管理模块
 * 负责初始化和管理各种模态框组件
 * 包括项目经验模态框、选项模态框等，并提供无障碍访问支持
 */
import {ApiService} from './apiService.js';
import {domCache} from './domCache.js';
import {getAppState} from './appState.js';

export const ModalManager = {
    /**
     * 初始化项目经验模态框
     * 设置模态框关闭事件和提交按钮点击事件
     */
    initProjectExperienceModal() {
        const closeBtn = domCache.projectExperienceModal?.querySelector('.btn-close[data-bs-dismiss="modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // 在关闭前移除焦点
                setTimeout(() => {
                    const focusedElement = domCache.projectExperienceModal.querySelector(':focus');
                    if (focusedElement) {
                        focusedElement.blur();
                    }
                }, 50);
            });
        }
        // 先设置无障碍修复
        this._setupModalAccessibility();

        domCache.submitExperienceButton.onclick = async () => {
            const state = getAppState(); // 获取应用状态
            const projectExperience = document.getElementById('project-experience').value.trim();

            if (projectExperience) {
                if (confirm("是否确认提交？")) {
                    await ApiService.applyForExam(state.userName, state.currentRole, projectExperience);
                    const modal = bootstrap.Modal.getInstance(domCache.projectExperienceModal);
                    modal.hide();
                }
            } else {
                alert("项目经验不能为空！");
            }
        };
    },

    /**
     * 初始化选项模态框
     * 设置模态框关闭事件和无障碍访问支持
     */
    initOptionsModal() {
        const optionsModal = document.getElementById('optionsModal');
        if (optionsModal) {
            const closeBtn = optionsModal.querySelector('.btn-close[data-bs-dismiss="modal"]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    setTimeout(() => {
                        const focusedElement = optionsModal.querySelector(':focus');
                        if (focusedElement) {
                            focusedElement.blur();
                        }
                    }, 50);
                });
            }
        }

        // 选项模态框初始化
        this._setupModalAccessibility(); // 也为选项模态框设置无障碍
    },

    /**
     * 设置模态框无障碍访问支持
     * 修复所有模态框的无障碍访问问题，包括焦点管理和键盘导航
     * @private
     */
    _setupModalAccessibility() {
        // 修复所有模态框的无障碍访问警告
        document.querySelectorAll('.modal').forEach(modal => {
            // 确保每个模态框只添加一次监听器
            if (modal.hasAttribute('data-accessibility-fixed')) {
                return;
            }

            // 标记为已修复
            modal.setAttribute('data-accessibility-fixed', 'true');

            // 隐藏时移除焦点
            modal.addEventListener('hidden.bs.modal', () => {
                const focusedElement = modal.querySelector(':focus');
                if (focusedElement) {
                    focusedElement.blur();
                }

                // 可选：将焦点返回到触发按钮
                this._returnFocusToTrigger(modal);
            });

            // 显示时设置正确的无障碍属性
            modal.addEventListener('show.bs.modal', () => {
                modal.removeAttribute('aria-hidden');
                if (modal.hasAttribute('inert')) {
                    modal.removeAttribute('inert');
                }
            });

            // ESC键处理 - 隐藏前移除焦点
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const focusedElement = modal.querySelector(':focus');
                    if (focusedElement) {
                        focusedElement.blur();
                    }
                }
            });
        });
    },

    /**
     * 将焦点返回到触发按钮
     * 当模态框关闭时，将焦点返回到最初触发模态框的按钮
     * @param {HTMLElement} modal - 模态框DOM元素
     * @private
     */
    _returnFocusToTrigger(modal) {
        const modalId = modal.id;
        if (!modalId) return;

        // 查找触发此模态框的按钮
        const triggerSelectors = [
            `[data-bs-target="#${modalId}"]`,
            `[href="#${modalId}"]`,
            `[onclick*="${modalId}"]`
        ];

        let triggerButton = null;
        for (const selector of triggerSelectors) {
            triggerButton = document.querySelector(selector);
            if (triggerButton) break;
        }

        // 将焦点返回到触发按钮
        if (triggerButton) {
            setTimeout(() => {
                if (document.contains(triggerButton)) {
                    triggerButton.focus();
                }
            }, 100);
        }
    },

    /**
     * 设置项目经验模态框的无障碍访问支持
     * 专门针对项目经验模态框的焦点管理进行优化
     */
    setupProjectExperienceModalAccessibility() {
        const modal = domCache.projectExperienceModal;
        if (!modal) return;

        modal.addEventListener('hidden.bs.modal', () => {
            // 移除项目经验文本域的焦点
            const textarea = document.getElementById('project-experience');
            if (textarea && document.activeElement === textarea) {
                textarea.blur();
            }

            // 移除提交按钮的焦点
            if (domCache.submitExperienceButton && document.activeElement === domCache.submitExperienceButton) {
                domCache.submitExperienceButton.blur();
            }
        });
    }
};