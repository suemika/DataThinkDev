document.addEventListener('DOMContentLoaded', function () {
    // 提取获取当前时间戳和当前年份的代码
    const timestamp = new Date().getTime();
    const currentYear = new Date().getFullYear();

    // 构建 HTML 内容
    const footerHTML = `
                                <footer>
                                    <div id="divPowerBy">
                                        <div class="body-footer">
                                            <span id="spanPower">
                                                Copyright © <span id="footer-year">${currentYear}</span> 
                                                <a href="http://edi.sdstg.com/" target="_self" rel="noopener" class="footer-link">石横特钢集团有限公司</a> 
                                                版权所有 数智中心 <span>提供技术支持</span>
                                            </span>
                                        </div>
                                    </div>
                                </footer>
                                `;

    const errorHTML = `
    <div id="error-message"  style="display: none;">
        登录已失效，即将跳转登录页面。<br>
        <span id="countdown-timer">20</span>秒后将自动跳转。
        <br><a class="btn btn-primary rounded-4" href="http://edi.sdstg.com/" target="_self" rel="noopener">点击跳转</a>
    </div>`;


    document.body.insertAdjacentHTML('beforeend', errorHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // 现在可以安全地获取元素并更新它们的属性
    const yearElement = document.getElementById('footer-year');
    if (yearElement) {
        yearElement.textContent = `${currentYear}`;
    }

    // 设置图片的src属性
    const headerImg = document.getElementById('header-img');
    if (headerImg) {
        headerImg.src = `scancodeDelegation/logo/font_logo.png?v=${timestamp}`;
    }

    const qrImg = document.getElementById('QR-img');
    if (qrImg) {
        qrImg.src = `scancodeDelegation/logo/feedback_qr.png?v=${timestamp}`;
    }

    const pdfHref = document.getElementById('pdf-link-button');
    if (pdfHref) {
        pdfHref.href = `http://ems.sdstg.com/program/phone_pdf.html?v=${timestamp}`;
    }


    const SQCPImg = document.getElementById('SQCP-img');
    if (SQCPImg) {
        SQCPImg.src = `scancodeDelegation/logo/qr_position.png?v=${timestamp}`;
    }

    const SQCPHref = document.getElementById('SQCP-href');
    if (SQCPHref) {
        SQCPHref.href = `scancodeDelegation/logo/qr_position.png?v=${timestamp}`;
    }
    createFeedbackUI();
    addReturnTop();
    addNoDataMessage();
    initializeErrorAlert();
});

function createFeedbackUI() {

    // 创建 feedbackContainer 元素
    const feedbackContainer = document.createElement('div');
    feedbackContainer.id = 'feedbackContainer'; // 设置 id

    // 获取 header 元素
    const header = document.querySelector('header');

    if (header) {
        // 将 feedbackContainer 插入到 header 后面
        header.insertAdjacentElement('afterend', feedbackContainer);

    }
    if (!feedbackContainer) {
        console.warn("未找到反馈容器，反馈 UI 不会被生成。");
        return; // 如果容器不存在，则退出函数
    }

    // 创建反馈图标区域
    const feedbackIconWrapper = document.createElement('div');
    feedbackIconWrapper.className = 'feedback-icon-wrapper';
    feedbackIconWrapper.title = '反馈';

    // 创建反馈图标SVG
    const feedbackIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    feedbackIcon.setAttribute('width', '16');
    feedbackIcon.setAttribute('height', '16');
    feedbackIcon.setAttribute('viewBox', '0 0 16 16');
    feedbackIcon.className = 'feedback-icon';

    // 创建路径
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M9.5 1.5a1 1 0 00-1 1v2a1 1 0 001 1V7l1.8-1.5h2.2a1 1 0 001-1v-2a1 1 0 00-1-1h-4zM5 4a2 2 0 100 4 2 2 0 000-4zm2.5 5h-5C1.67 9 1 9.67 1 10.5c0 1.12.46 2.01 1.21 2.61.74.6 1.74.89 2.79.89s2.05-.29 2.79-.89c.75-.6 1.21-1.5 1.21-2.61C9 9.67 8.33 9 7.5 9z');

    // 将路径添加到图标中，然后将图标添加到反馈图标区域
    feedbackIcon.appendChild(path);
    feedbackIconWrapper.appendChild(feedbackIcon);

    // 创建反馈文本
    const feedbackText = document.createElement('span');
    feedbackText.className = 'feedback-text';
    feedbackText.textContent = '反馈';
    feedbackIconWrapper.appendChild(feedbackText);

    // 创建模态框
    const modalHTML = `
        <div class="modal fade" id="feedbackModal" tabindex="-1" aria-labelledby="feedbackModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="feedbackModalLabel">页面反馈</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="feedbackForm">
                             <div class="mb-3">
                                <label for="userFeedback" class="form-label">反馈内容</label>
                                <textarea class="form-control rounded-4" id="userFeedback" name="userFeedback" rows="3" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary rounded-4">提交反馈</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 将模态框 HTML 插入到文档中
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 将反馈图标添加到反馈容器中
    feedbackContainer.appendChild(feedbackIconWrapper);

    // 点击图标打开模态框
    feedbackIconWrapper.addEventListener('click', function () {
        const modal = new bootstrap.Modal(document.getElementById('feedbackModal'));
        modal.show();
    });

    // 处理表单提交
    document.getElementById('feedbackForm').addEventListener('submit', async function (event) {
        event.preventDefault(); // 阻止默认提交

        // 获取当前网页地址

        const formData = new FormData(this); // 获取表单数据

        formData.append('sourceAddress', getCurrentUrl());

        formData.append('fromName', 'feedbackForm');

        // 检查 userName 是否存在; 如果不存在则添加空字符串
        if (typeof userName === 'undefined' || userName === null) {
            formData.append('userName', ''); // 添加空字符串
        } else {
            formData.append('userName', userName); // 添加用户名称
        }

        // 提交反馈数据
        try {
            const response = await fetchDataFromAPI('647', Object.fromEntries(formData));
            // 假设返回的数据中有一条成功信息
            alert("反馈已提交，谢谢！");
        } catch (error) {
            console.error('反馈提交失败:', error);
            alert("反馈提交失败，请稍后再试。");
        }

        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackModal'));
        modal.hide();

        // 清空表单
        this.reset();
    });
}

function getNameFromUrl(type) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(type);
}

function getCurrentUrl() {
    // 获取当前网页地址
    return window.location.href;
}

async function fetchDataFromAPI(req, data) {
    const response = await axios.post('https://ems.sdstg.com/imc/customOpt', {req, data: JSON.stringify(data)});
    return response.data;
}

// 将函数添加至 window 对象
window.redirectToErrorPage = redirectToErrorPage;
window.showMsg = showMsg;

// 将函数挂载到全局对象 window 上
window.toggleBackToTopButton = toggleBackToTopButton;


function redirectToErrorPage() {
    document.getElementById('error-message').style.display = 'block';
    let countdown = 20; // 倒计时10秒
    const countdownElement = document.getElementById('countdown-timer');

    const timerInterval = setInterval(function () {
        countdownElement.textContent = countdown; // 更新显示的倒计时
        countdown--;

        if (countdown < 0) {
            clearInterval(timerInterval);
            window.location.href = 'http://edi.sdstg.com/'; // 跳转
        }
    }, 1000);
}

// 确保警告框只添加一次
let errorAlertInitialized = false;
let noDataMessageInitialized = false;

function initializeErrorAlert() {
    if (!errorAlertInitialized) {
        // 创建 div 元素
        const errorAlertDiv = document.createElement('div');
        errorAlertDiv.id = "errorAlert";
        errorAlertDiv.className = "alert alert-danger d-none";
        errorAlertDiv.role = "alert";

        // 将警告框添加到 <main> 的顶部
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.insertBefore(errorAlertDiv, mainElement.firstChild);
        } else {
            return;
        }

        errorAlertInitialized = true; // 确保后续不会重复添加
    }
}


function addNoDataMessage() {
    if (!noDataMessageInitialized) {
        const noDataMessage = document.createElement('div');
        noDataMessage.id = "no-data-message";
        noDataMessage.className = "alert alert-info d-none"; // 用 d-none 隐藏
        noDataMessage.style.position = "sticky";
        noDataMessage.style.top = "20px";
        noDataMessage.style.zIndex = "1000";
        noDataMessage.innerText = "无匹配数据"; // 设置消息的文本

        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.appendChild(noDataMessage); // 将消息添加到 <main> 的底部
        }

        noDataMessageInitialized = true; // 确保后续不会重复添加
    }
}

function addReturnTop() {

    // 创建模态框
    const modalHTML = `
    <div id="backToTop">
    <a href="#top" title="Back to top">
     <svg xmlns="http://www.w3.org/2000/svg"  fill="#fff"
             viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
            <path
                d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM385 215c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-71-71L280 392c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-214.1-71 71c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9L239 103c9.4-9.4 24.6-9.4 33.9 0L385 215z"/>
        </svg></a>
    </div>
    `

    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.innerHTML += modalHTML;
    }
}

function toggleNoDataMessage(hasMatches) {
    const noDataMessage = document.getElementById('no-data-message');
    const departmentWrapper = document.getElementById('department-wrapper'); // 使用 getElementById 获取 department-wrapper 元素

    // 检查 noDataMessage 是否存在
    if (noDataMessage) {
        noDataMessage.classList.toggle('d-none', hasMatches); // 控制消息框显示
    } else {
        console.error('no-data-message 未正确创建或添加到 DOM 中');
    }

    // 根据是否有匹配项来控制 department-wrapper 的显示
    if (departmentWrapper) {
        departmentWrapper.style.display = hasMatches ? 'block' : 'none'; // 匹配则显示 department-wrapper，不匹配则隐藏
    } else {
        console.error('#department-wrapper 未能找到'); // 输出错误信息
    }
}

function toggleBackToTopButton() {
    const backToTopButton = document.getElementById('backToTop');
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        backToTopButton.style.display = 'block'; // 显示按钮
    } else {
        backToTopButton.style.display = 'none'; // 隐藏按钮
    }
}

function showMsg(message, isError = true) {
    const alertType = !isError ? 'alert-danger' : 'alert-success';
    const msgContainer = document.createElement('div');
    msgContainer.className = `alert ${alertType} alert-dismissible fade show`;
    msgContainer.innerHTML = `
        <i class="bi ${!isError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // 添加到页面顶部
    const header = document.querySelector('header');
 // 将消息容器添加到header的后面（使用insertAdjacentElement）
    header.insertAdjacentElement('afterend', msgContainer);

    // 5秒后自动消失
    setTimeout(() => {
        msgContainer.classList.remove('show');
        setTimeout(() => msgContainer.remove(), 150);
    }, 3000);
}
