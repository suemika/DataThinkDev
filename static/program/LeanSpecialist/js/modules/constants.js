/**
 * 应用常量定义模块
 * 包含应用中使用的所有常量，包括角色、状态、培训状态等
 */

/**
 * 角色常量定义
 * 应用中所有用户角色的标准化定义
 */
export const ROLES = {
    LEAN_STUDENT: "精益学员",   // 精益学员角色
    LEAN_BACKBONE: "精益骨干",  // 精益骨干角色
    LEAN_COACH: "精益教练",     // 精益教练角色
    SENIOR_COACH: "资深教练"    // 资深教练角色
};

/**
 * 状态常量定义
 * 应用中所有通用状态的标准化定义
 */
export const STATUS = {
    // 任务已完成
    COMPLETED: "已完成",
    // 任务进行中
    IN_PROGRESS: "进行中",
    // 任务未开始
    PENDING: "未开始",
    // 任务已开始
    STARTED: "已开始",
    // 审核未通过
    REJECTED: "未通过",
    // 审核已通过
    APPROVED: "已通过"
};

/**
 * 培训状态常量定义
 * 培训课程相关状态的标准化定义
 */
export const TRAINING_STATUS = {
    // 培训已完成
    COMPLETED: "已完成",
    // 培训进行中
    IN_PROGRESS: "进行中",
    // 培训未开始
    NOT_STARTED: "未开始"
};

/**
 * 其他常量定义
 */
export const completedText = STATUS.APPROVED;  // 已完成文本的统一定义（映射到已通过状态）