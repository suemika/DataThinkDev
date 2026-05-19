/**
 * 时间线数据处理器模块
 * 负责对时间线数据进行加工处理，包括状态转换和样式映射
 * 确保时间线数据在渲染前符合应用逻辑和展示需求
 */
import { STATUS } from '../constants.js';
import { getAppState } from '../appState.js';

/**
 * 处理时间线数据
 * 根据应用状态对时间线数据进行转换和优化
 * @param {Array} timelineData - 原始时间线数据
 * @returns {Array} 处理后的时间线数据
 */
export function processTimelineData(timelineData) {
    const { specialRole, userStatus, nowRole, tabRole } = getAppState();

    // 如果不是特殊角色，直接返回原始数据
    if (!specialRole) return timelineData;

    // 如果有用户状态或当前角色与标签角色不一致，将所有项标记为已完成
    if (userStatus || nowRole !== tabRole) {
        return timelineData.map(item => ({
            ...item,
            status: STATUS.COMPLETED,    // 设置状态为已完成
            exam_result: STATUS.APPROVED, // 设置审核结果为已通过
        }));
    }

    // 其他情况返回原始数据
    return timelineData;
}

/**
 * 根据状态获取对应的样式类
 * 映射状态文本到CSS类名，用于时间线项目的视觉展示
 * @param {string} status - 状态文本
 * @returns {Object} 包含状态类和徽章类的样式对象
 */
export function getStatusStyles(status) {
    // 状态到样式类的映射表
    const statusMap = {
        "已完成": { statusClass: "completed", badgeClass: "bg-success" },
        "已通过": { statusClass: "completed", badgeClass: "bg-success" },
        "进行中": { statusClass: "in-progress", badgeClass: "bg-warning" },
        "审核中": { statusClass: "in-progress", badgeClass: "bg-warning" },
        "未开始": { statusClass: "pending", badgeClass: "bg-secondary" },
        "未通过": { statusClass: "pending", badgeClass: "bg-danger" },
        "审核不通过": { statusClass: "pending", badgeClass: "bg-danger" }
    };

    // 返回对应状态的样式，默认使用待处理状态样式
    return statusMap[status] || { statusClass: "pending", badgeClass: "bg-secondary" };
}