/**
 * 时间线控制器模块
 * 负责处理时间线页面的用户交互和业务逻辑
 */
import {TimelineManager} from './timelineManager.js';
import {ApiService} from '../apiService.js';
import {ButtonManager} from '../buttonManager.js';
import {getAppState, setAppState} from '../appState.js';
import {ROLES, STATUS} from '../constants.js';

/**
 * 时间线控制器
 */
export const TimelineController = {
    /**
     * 初始化时间线控制器
     */
    async init() {
        // 设置页面加载完成事件监听
        document.addEventListener("DOMContentLoaded", async () => {
            await this._initializePage();
        });
    },

    /**
     * 初始化页面
     */
    async _initializePage() {
        // 设置头部图片
        const headerImg = document.getElementById('header-img');
        headerImg.src = '../logo/font_logo2.png';

        // 获取用户名
        const userName = this.getNameFromUrl("userName");
        setAppState({userFID: userName});

        // 加载用户数据并初始化时间线
        await this._loadUserData(userName);

        // 设置标签页点击事件
        this._setupTabEvents(userName);
    },

    /**
     * 从URL查询参数中获取指定类型的值
     * @param {string} type - 要获取的查询参数类型
     * @returns {string|null} - 查询参数的值，如果不存在则返回null
     */
    getNameFromUrl(type) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(type);
    },

    /**
     * 加载用户数据
     * @param {string} userName - 用户名
     */
    async _loadUserData(userName) {
        const {currentRole: loadedRole, userStatus: loadedStatus} = await ApiService.loadList(userName);
        setAppState({currentRole: loadedRole, userStatus: loadedStatus});
        await TimelineManager.generateTimeline(userName, loadedRole);
    },

    /**
     * 设置标签页点击事件
     * @param {string} userName - 用户名
     */
    _setupTabEvents(userName) {
        document.querySelectorAll('.nav-link').forEach(button => {
            button.addEventListener('click', async () => {
                const role = button.getAttribute('data-role');
                setAppState({currentRole: role, tabRole: role});
                await TimelineManager.generateTimeline(userName, role);
            });
        });
    },

    /**
     * 更新标签页可访问性
     * @param {string} currentRole - 当前角色
     * @param {string} userStatus - 用户状态
     */
    updateTabAccessibility(currentRole, userStatus) {
        const roleButtons = document.querySelectorAll('.nav-link');
        roleButtons.forEach((button) => {
            const role = button.getAttribute('data-role');
            const isActiveRole = role === currentRole;

            // 确保“精益学员”标签一直可点击
            if (role === ROLES.LEAN_STUDENT) {
                button.disabled = false;
                button.classList.remove('disabled-button');
            } else {
                button.disabled = !isActiveRole;
                if (button.disabled) {
                    button.classList.add('disabled-button');
                } else {
                    button.classList.remove('disabled-button');
                }
            }

            // 如果“精益学员”认证考试完成，“精益骨干”标签可点击
            if (role === ROLES.LEAN_BACKBONE && userStatus) {
                button.disabled = false;
                button.classList.remove('disabled-button');
            }
            if (role === ROLES.LEAN_COACH && userStatus && currentRole === ROLES.LEAN_BACKBONE) {
                button.disabled = false;
                button.classList.remove('disabled-button');
            }
            if (role === ROLES.SENIOR_COACH && userStatus && currentRole === ROLES.SENIOR_COACH) {
                button.disabled = false;
                button.classList.remove('disabled-button');
            }
        });
    }
};

// 初始化时间线控制器
TimelineController.init();