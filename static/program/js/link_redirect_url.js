// 配置常量
const CONFIG = {
    API_ENDPOINT: '/imc/customOpt',
    REQ_CODE: '564'
};

// DOM元素ID常量
const ELEMENT_IDS = {
    LOADING_OVERLAY: 'loading-overlay',
    CONTENT: 'content'
};

/**
 * 隐藏遮罩并显示内容
 */
function hideLoadingAndShowContent() {
    const loadingOverlay = document.getElementById(ELEMENT_IDS.LOADING_OVERLAY);
    const content = document.getElementById(ELEMENT_IDS.CONTENT);
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    if (content) {
        content.style.display = 'block';
    }
}

/**
 * 跳转到错误页面
 */
function redirectToErrorPage() {
    window.location.href = '/program/error.html'; // 请根据实际错误页面路径调整
}

/**
 * 处理跳转逻辑
 * @param {string} typeName - 类型名称
 */
async function checkRedirect(typeName) {
    // 参数验证
    if (!typeName) {
        console.warn('typeName 为空，无法获取跳转地址');
        redirectToErrorPage();
        hideLoadingAndShowContent();
        return;
    }

    try {
        // 发送请求
        const response = await axios.post(CONFIG.API_ENDPOINT, {
            req: CONFIG.REQ_CODE,
            data: JSON.stringify(typeName)
        });

        // 安全地获取跳转URL
        const redirectUrl = response?.data?.data?.data?.url;

        // 如果有跳转链接，直接跳转
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            console.warn('未获取到跳转URL');
            redirectToErrorPage();
            hideLoadingAndShowContent();
        }
    } catch (error) {
        // 错误处理
        console.error('获取跳转地址失败:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        redirectToErrorPage();
        hideLoadingAndShowContent();
    }
}

/**
 * 初始化页面
 */
function initPage() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const typeName = urlParams.get('typeName');
    
    console.log('typeName:', typeName);
    
    // 开始请求数据
    checkRedirect(typeName);
}

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', initPage);