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
        headerImg.src = `../logo/font_logo.png?v=${timestamp}`;
    }

    const qrImg = document.getElementById('QR-img');
    if (qrImg) {
        qrImg.src = `../logo/feedback_qr.png?v=${timestamp}`;
    }

    const pdfHref = document.getElementById('pdf-link-button');
    if (pdfHref) {
        pdfHref.href = `http://ems.sdstg.com/program/phone_pdf.html?v=${timestamp}`;
    }

    // 构建背景图 URL，附加时间戳参数
    // const bgUrl = `./logo/year.png?v=${timestamp}`;
    // const backgroundContainer = document.querySelector('.background-container');
    // if (backgroundContainer) {
    //     backgroundContainer.style.backgroundImage = `url(${bgUrl})`;
    // }

    // const headerH2 = document.querySelector('.h2-container');
    // if (headerH2) {
    //     headerH2.style.display = 'none'; // 使用 display: none; 隐藏 h2 标签
    // }

    createFeedbackUI()
    addReturnTop();
});

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // 平滑滚动效果
    });
}

// 将函数挂载到全局对象 window 上
window.toggleBackToTopButton = toggleBackToTopButton;
window.scrollToTop = scrollToTop;


function toggleBackToTopButton() {
    const backToTopButton = document.getElementById('back-to-top');
    if (window.scrollY > 300) {
        backToTopButton.classList.add('show');
    } else {
        backToTopButton.classList.remove('show');
    }
}


function addReturnTop() {

    // 创建模态框
    const modalHTML = `
<div id="back-to-top" class="back-to-top">
    <button class="btn btn-primary rounded-circle shadow-lg" onclick="scrollToTop()">
        <i class="bi bi-arrow-up"></i>
    </button>
</div>
    `

    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.insertAdjacentHTML('beforeend', modalHTML);
    }
}


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
    feedbackText.textContent = '页面反馈';
    feedbackIconWrapper.appendChild(feedbackText);

    // 创建模态框
    const modalHTML = `
        <div class="modal fade" id="feedbackModal" tabindex="-1" aria-labelledby="feedbackModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title" id="feedbackModalLabel">页面反馈</h4>
                        <!-- 关闭按钮：点击可关闭反馈弹窗 -->
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                    <!-- 用户提示说明区域 -->
                        <div class="alert alert-info mb-3" role="alert">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>反馈提示：</strong>请告诉我们您在当前页面遇到的问题，或提出改进建议。您的反馈将帮助我们优化页面体验。--数智中心开发科
                        </div>
                        <!-- 反馈表单：用户在此提交当前页面的具体问题或改进建议 -->
                        <form id="feedbackForm">
                            <div class="mb-3">
                                <label for="userFeedback" class="form-label">反馈内容</label>
                                <!-- 反馈输入区域：用于描述当前页面的问题、bug或功能建议 -->
                                <textarea class="form-control rounded-4" id="userFeedback" name="userFeedback" rows="3" placeholder="请描述您在当前页面遇到的问题、bug或功能建议..." required></textarea>
                            </div>
                            <!-- 提交按钮：将当前页面的反馈信息提交至后端处理 -->
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

        const formData = new FormData(this); // 获取表单数据

        formData.append('sourceAddress', getCurrentUrl());

        formData.append('fromName', 'feedbackForm');

        formData.append('userName', userName);

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
    const response = await axios.post('/imc/customOpt', {req, data: JSON.stringify(data)});
    return response.data;
}

// 将函数添加至 window 对象
window.redirectToErrorPage = redirectToErrorPage;
window.showMsg = showMsg;

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


window.util = window.util || {};
window.util.loading = {
    show: function (message) {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;

        if (message) {
            overlay.querySelector('p').textContent = message;
        }
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁止滚动

    },

    hide: function () {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = ''; // 恢复滚动

        }
    }
};