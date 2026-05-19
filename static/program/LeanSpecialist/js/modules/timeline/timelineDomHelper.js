/**
 * 时间线DOM辅助模块
 * 提供时间线相关的DOM操作和辅助函数
 * 包括时间线容器类更新和日期格式化功能
 */
import { domCache } from '../domCache.js';
import { STATUS } from '../constants.js';

/**
 * 更新时间线容器的CSS类
 * 根据认证考试的状态为时间线容器添加或移除相应的类
 * @param {Array} roleData - 角色相关的时间线数据
 */
export function updateTimelineContainerClass(roleData) {
    const examStage = roleData.find(item => item.stage_name === "认证考试");
    domCache.timelineContainer.classList.toggle(
        'completed-exam',
        examStage && examStage.status === STATUS.COMPLETED
    );
}

/**
 * 格式化日期时间
 * 将日期字符串格式化为用户友好的中文日期时间格式
 * @param {string} dateString - 日期字符串
 * @returns {string} - 格式化后的日期时间字符串
 */
export function formatDate(dateString) {
    if (!dateString) return "暂无";

    try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(/\//g, '-');
    } catch (e) {
        console.error("日期格式化错误:", e);
        return "暂无";
    }
}