// modules/appState.js
/**
 * 应用状态管理器类
 * 负责集中管理应用的所有状态，提供状态更新、获取和订阅功能
 * 实现了观察者模式，支持状态变化的实时通知
 */
class AppStateManager {
    /**
     * 构造函数
     * 初始化应用状态和监听器映射
     */
    constructor() {
        // 初始化应用状态
        this._state = {
            userName: null,           // 用户名
            currentRole: null,        // 当前角色
            nowRole: null,            // 现在的角色
            tabRole: null,            // 标签页角色
            userStatus: null,         // 用户状态
            specialRole: false,       // 是否为特殊角色
            userIntroData: null,      // 用户介绍数据
            redirectURL: null,        // 重定向URL
            redirectSummaryURL: null, // 工作总结重定向URL
            redirectSelfAssessmentURL: null, // 自我评估重定向URL
            isCoachTabEnabled: false, // 是否启用教练标签页
            trainingCourses: null,    // 培训课程数据
            numberAndName: null,      // 编号和名称
            currentStage: null,       // 当前阶段
            currentId: null,          // 当前ID
            examId: null,             // 考试ID
            examStage: null,          // 考试阶段
            examResult: null,         // 考试结果
            currentName: null,        // 当前名称
            userFID: null             // 用户FID
        };
        // 初始化监听器映射，使用Map存储不同状态键的监听器集合
        this._listeners = new Map();
    }

    /**
     * 更新应用状态
     * @param {Object} updates - 要更新的状态对象
     */
    setState(updates) {
        // 保存旧状态用于比较
        const oldState = { ...this._state };
        // 合并新状态
        Object.assign(this._state, updates);

        // 通知所有相关的监听器状态已变化
        Object.keys(updates).forEach(key => {
            const listeners = this._listeners.get(key);
            if (listeners) {
                listeners.forEach(callback => callback(updates[key], oldState[key]));
            }
        });
    }

    /**
     * 获取当前应用状态
     * @returns {Object} - 当前应用状态的副本
     */
    getState() {
        // 返回状态的深拷贝，防止外部直接修改内部状态
        return { ...this._state };
    }

    /**
     * 订阅状态变化
     * @param {string} key - 要订阅的状态键
     * @param {Function} callback - 状态变化时的回调函数
     * @returns {Function} - 取消订阅的函数
     */
    subscribe(key, callback) {
        // 如果该键还没有监听器集合，创建一个新的Set
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        // 添加回调函数到监听器集合
        this._listeners.get(key).add(callback);

        // 返回取消订阅的函数
        return () => {
            const listeners = this._listeners.get(key);
            listeners?.delete(callback);
        };
    }

    /**
     * 批量更新状态
     * 减少重复渲染，提高性能
     * @param {Object} updates - 要更新的状态对象
     */
    batchUpdate(updates) {
        this.setState(updates);
    }
}

// 创建AppStateManager的单例实例
const appStateManager = new AppStateManager();

/**
 * 初始化应用状态
 * @param {Object} initialState - 初始状态对象
 */
export const initState = (initialState) => appStateManager.setState(initialState);

/**
 * 获取当前应用状态
 * @returns {Object} - 当前应用状态
 */
export const getAppState = () => appStateManager.getState();

/**
 * 更新应用状态
 * @param {Object} updates - 要更新的状态对象
 */
export const setAppState = (updates) => appStateManager.setState(updates);

/**
 * 批量更新应用状态
 * @param {Object} updates - 要更新的状态对象
 */
export const batchUpdateState = (updates) => appStateManager.batchUpdate(updates);

/**
 * 订阅应用状态变化
 * @param {string} key - 要订阅的状态键
 * @param {Function} callback - 状态变化时的回调函数
 * @returns {Function} - 取消订阅的函数
 */
export const subscribeState = (key, callback) => appStateManager.subscribe(key, callback);