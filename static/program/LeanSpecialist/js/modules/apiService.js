/**
 * API服务核心模块
 * 负责处理所有API请求，提供统一的请求、错误处理、重试机制
 */
import {domCache} from './domCache.js';
import {ROLES} from './constants.js';
import {ButtonManager} from './buttonManager.js';
import {getAppState, setAppState} from './appState.js';
import {Alert} from './alert.js';

/**
 * API服务核心类
 * 提供统一的API请求处理机制
 */
class ApiServiceCore {
    errorMes;

    /**
     * 构造函数
     */
    constructor() {
        this.config = {
            baseURL: '/imc/customOpt', timeout: 10000, maxRetries: 2, retryDelay: 1000
        };

        this._ensureAlertAvailable();
    }

    /**
     * 确保Alert组件可用
     */
    _ensureAlertAvailable() {
        if (typeof Alert === 'undefined') {
            console.warn('Alert未定义，使用备用方案');
            window.tempAlert = {
                success: (title, text) => Swal.fire(title, text, 'success'),
                error: (title, text) => Swal.fire(title, text, 'error'),
                warning: (title, text) => Swal.fire(title, text, 'warning'),
                info: (title, text) => Swal.fire(title, text, 'info')
            };
        }
    }

    /**
     * 统一的API请求方法
     */
    async _request(endpoint, data, options = {}) {
        const config = {...this.config, ...options};
        const userContext = this._getUserContextByEndpoint(endpoint); // 根据端点获取用户上下文

        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                const response = await axios.post(config.baseURL, {
                    req: endpoint, data: JSON.stringify(data)
                }, {
                    timeout: config.timeout
                });

                return this._handleResponse(response, endpoint);

            } catch (error) {
                await this._logError(endpoint, error, data, attempt);

                if (attempt === config.maxRetries) {
                    throw this._createFriendlyError(error, endpoint);
                }

                await this._delay(config.retryDelay * Math.pow(2, attempt - 1));
            }
        }

        // 如果所有重试都失败
        return {data: {status: 1, msg: '请求失败'}};
    }

    /**
     * 根据API端点获取用户友好的操作描述
     */
    _getUserContextByEndpoint(endpoint) {
        const contextMap = {
            '662': '加载用户列表',
            '663': '查询用户数据',
            '667': '申请考试',
            '690': '加载用户角色',
            '692': '申请报名',
            '702': '申请骨干考试',
            '704': '加载用户总结',
            '711': '再次申请',
            '732': '加载实训课程',
            '748': '检查状态',
            '755': '保存数据',
            '787': '保存记录'
        };

        return contextMap[endpoint] || '操作';
    }

    /**
     * 处理API响应
     */
    async _handleResponse(response, endpoint) {
        if (response.data.status === 0) {
            return response.data;
        } else {
            await this._logError(endpoint, response.data.msg, response.data, 0);
            throw new Error(response.data.msg || `API ${endpoint} 返回错误状态`);
        }
    }

    /**
     * 创建友好的错误消息
     */
    async _createFriendlyError(error, endpoint) {
        const errorMessage = error.message || '';

        // 针对特定错误进行友好提示
        if (errorMessage.includes('Request aborted') || errorMessage.includes('Network Error') || errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED')) {
            return new Error('网络连接失败，请检查DNS配置和网络连接');
        }

        // 其他错误保持原样
        return await this._handleOperationError(error, endpoint, this._getUserContextByEndpoint(endpoint));
    }

    /**
     * 记录错误日志
     */
    async _logError(endpoint, error, data, attempt) {
        const finalUserName = getUserName();
        const errorMessage = typeof error === 'string'
            ? error
            : (error?.message || String(error));
        const errorInfo = {
            workId: finalUserName,
            sourceAddress: `${window.location.href} -> ${window.location.pathname} apiService.js -> ${endpoint}`,
            error: errorMessage,
            reqData: data
        };

        try {
            await saveDataToAPI(errorInfo)
        } catch (logError) {
            console.warn('错误日志记录失败:', logError);
        }
    }

    /**
     * 延迟函数
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 统一的结果处理
     */
    async _handleOperationResult(result, successConfig) {
        if (result.data.status === 0) {
            if (successConfig.message) {
                const alert = Alert || window.tempAlert;
                await alert.success(successConfig.title || '操作成功', successConfig.message);
            }
            return true;
        } else {
            throw new Error(result.data.msg || successConfig.errorContext);
        }
    }


    /**
     * 统一的错误处理
     * @param {Error} error - 错误对象
     * @param {string} endpoint - API端点
     * @param {string} userContext - 用户上下文
     * @returns {Promise<boolean>} - 操作是否成功
     */
    async _handleOperationError(error, endpoint, userContext) {
        console.error(`操作失败 [${endpoint}]:`, error);

        const alert = Alert || window.tempAlert;

        // 从错误对象中提取消息
        let errorMessage = error.message;

        // 如果错误消息为空，使用用户上下文
        if (!errorMessage || errorMessage === '') {
            errorMessage = `${userContext}失败，请稍后再试`;
        }

        // 如果错误消息是英文的"Network Error"等，转换为中文提示
        if (errorMessage.includes('Network Error') || errorMessage.includes('Request aborted') || errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED') || errorMessage.includes('ENETUNREACH') || errorMessage.includes('EHOSTUNREACH')) {
            errorMessage = '网络连接失败，请检查DNS配置和网络连接';
        }

        // 显示错误提示
        await alert.error('操作失败', errorMessage);

        return false;
    }

    // === 具体的API方法（保持原有方法）===

    async queryUserData(userName, currentRole) {
        try {
            const response = await this._request('663', {
                workId: userName, role: currentRole,
            });
            return {
                currentData: response.data.certifications || null, userStatus: response.data.user_status
            };
        } catch (error) {
            await this._handleOperationError(error, '663', this._getUserContextByEndpoint('663'));
            return {currentData: null, userStatus: null};
        }
    }

    async loadList(userFID) {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
        const isTablet = /tablet|ipad/i.test(ua);
        // 1. 创建 device 对象
        const deviceObj = {
            type: isMobile ? '手机' : (isTablet ? '平板' : '电脑'),
            os: /windows/.test(ua) ? 'Windows' :
                /mac/.test(ua) ? 'macOS' :
                    /linux/.test(ua) ? 'Linux' :
                        /android/.test(ua) ? 'Android' :
                            /iphone|ipad/.test(ua) ? 'iOS' : 'Unknown',
            browser: /chrome/.test(ua) ? 'Chrome' :
                /firefox/.test(ua) ? 'Firefox' :
                    /safari/.test(ua) && !/chrome/.test(ua) ? 'Safari' :
                        /edg/.test(ua) ? 'Edge' : 'Other',
            screen: `${window.screen.width}x${window.screen.height}`,
            isTouch: 'ontouchstart' in window
        };
        const deviceString = JSON.stringify(deviceObj);
        const feedbackData = {
            userName: userFID,
            source: "signUp",
            device: deviceString
        };

        try {
            const response = await this._request('662', feedbackData);
            this._updateUIState(response);
            return this._extractUserData(response);

        } catch (error) {
            console.error('加载用户列表失败:', error);
            return this._getDefaultUserData();
        }
    }


    async saveRecordToBackend(copyRecord) {
        try {
            const response = await this._request('787', copyRecord);

            if (response.data.status === 0) {
                return true;
            } else {
                console.error('保存记录失败:', response.data.msg || '未知错误');
                return false;
            }
        } catch (error) {
            console.error('保存记录失败:', error);
            return false;
        }
    }

    _updateUIState(response) {
        if (domCache.userNameElement && response.data.user_name) {
            const numberAndName = response.data.user_name;
            setAppState({numberAndName});
            domCache.userNameElement.textContent = numberAndName;
        }

        if (response.data.status === 0) {
            ButtonManager.updateTabAccessibility(response.data.user, response.data.user_status);
        }
    }

    _extractUserData(response) {
        if (response.data.status === 0) {
            return {
                currentRole: response.data.user,
                userStatus: response.data.user_status,
                specialRole: response.data.special,
                currentStage: response.data.currentStage,
                currentId: response.data.currentId,
                examId: response.data.examId,
                examStage: response.data.examStage,
                examResult: response.data.examResult,
                currentName: response.data.currentName,
                userName: response.data.userNumber,
                resultNotice: response.data.resultNotice
            };
        }

        return this._getDefaultUserData();
    }

    _getDefaultUserData() {
        return {
            currentRole: null,
            userStatus: null,
            specialRole: null,
            currentStage: null,
            currentId: null,
            examId: null,
            examStage: null,
            examResult: null,
            currentName: null,
            userName: null,
            resultNotice: null
        };
    }

    async applyForExam(userName, currentRole, projectExperience) {
        const {currentRole: appCurrentRole} = getAppState();
        const stage_name = appCurrentRole === ROLES.LEAN_STUDENT ? "认证考试" : "项目经验审核";

        const feedbackData = {
            workId: userName, role: appCurrentRole, stage_name: stage_name, project_experience: projectExperience
        };

        try {
            const result = await this._request('667', feedbackData);

            const successConfig = {
                message: appCurrentRole === ROLES.LEAN_STUDENT ? '申请考试成功' : '申请成功，请等待审核'
            };

            return await this._handleOperationResult(result, successConfig);

        } catch (error) {
            return await this._handleOperationError(error, '667', '申请考试');
        }
    }

    async applyForBackboneExam(userName, currentRole, projectExperience) {
        const feedbackData = {
            workId: userName, role: currentRole, stage_name: "认证考试", project_experience: projectExperience
        };

        try {
            const result = await this._request('702', feedbackData);

            return await this._handleOperationResult(result, {
                message: '申请骨干考试成功，请等待考试时间'
            });

        } catch (error) {
            return await this._handleOperationError(error, '702', '申请骨干考试');
        }
    }

    async applyForSignUp(userName, role = ROLES.LEAN_BACKBONE) {
        const feedbackData = {
            workId: userName, role: role
        };

        try {
            const result = await this._request('692', feedbackData);

            return await this._handleOperationResult(result, {
                message: '申请成功！'
            });

        } catch (error) {
            return await this._handleOperationError(error, '692', '申请报名');
        }
    }

    async applyForIntroAgain(userName, role = ROLES.LEAN_BACKBONE) {
        const feedbackData = {
            workId: userName, role: role
        };

        try {
            const result = await this._request('711', feedbackData);

            await this._handleOperationResult(result, {
                message: '申请成功！'
            });

            window.app.init();
            return true;

        } catch (error) {
            await this._handleOperationError(error, '711', '再次申请');
            return false;
        }
    }

    async loadUserRole(userName) {
        try {
            const response = await this._request('690', userName);
            return response.data.status;
        } catch (error) {
            console.error('加载用户角色失败:', error);
            return null;
        }
    }

    async loadUserIntro() {
        const {userName, tabRole} = getAppState();

        if (tabRole === ROLES.LEAN_STUDENT) {
            return null;
        }

        const feedbackData = {
            workId: userName, role: tabRole
        };

        try {
            const response = await this._request('704', feedbackData);
            return response.data.status === 0 ? response.data.data : null;
        } catch (error) {
            await this._handleOperationError(error, '704', this._getUserContextByEndpoint('704'));
            return null;
        }
    }

    async getTrainingCourses(userName, pid) {
        const feedbackData = {
            workId: userName, pid: pid
        };

        try {
            const response = await this._request('732', feedbackData);
            return response.data.status === 0 ? response.data.data : null;
        } catch (error) {
            console.error('加载实训课程失败:', error);
            return null;
        }
    }

    async checkStatus(roleName, checkType) {
        try {
            const apiMethod = checkType === 'signUp' ? '693' : '748';
            const response = await this._request(apiMethod, roleName);

            return {
                status: response.data.status, deadline: response.data.deadline || null
            };
        } catch (error) {
            console.error('检查状态失败:', error);
            throw error;
        }
    }

    /**
     * 保持原有方法名兼容性
     */
    async fetchDataFromAPI(req, data) {
        return this._request(req, data);
    }
}

// 创建ApiServiceCore的单例实例
const apiServiceInstance = new ApiServiceCore();

// 导出单例实例
export const ApiService = apiServiceInstance;

// 兼容原有函数导出
export const fetchDataFromAPI = (req, data) => apiServiceInstance.fetchDataFromAPI(req, data);

/**
 * 辅助函数：保存数据到API
 */
export const saveDataToAPI = (data) => {
    return apiServiceInstance._request(755, data);
};