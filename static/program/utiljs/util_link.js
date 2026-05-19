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
                                                Copyright © 2024-<span id="footer-year">${currentYear}</span> 
                                                <a href="http://edi.sdstg.com/" target="_self" rel="noopener" class="footer-link">石横特钢集团有限公司</a> 
                                                数智中心 <span>提供技术支持</span>
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


    const SQCPImg = document.getElementById('SQCP-img');
    if (SQCPImg) {
        SQCPImg.src = `../logo/qr_position.png?v=${timestamp}`;
    }

    const SQCPHref = document.getElementById('SQCP-href');
    if (SQCPHref) {
        SQCPHref.href = `../logo/qr_position.png?v=${timestamp}`;
    }
    createFeedbackUI()
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
    let countdown = 10; // 倒计时10秒
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

function showMsg(message, isSuccess = false) {
    const alertBox = document.getElementById('errorAlert');
    alertBox.textContent = message; // 设置提示内容

    // 根据 isSuccess 参数设置警报的颜色
    if (isSuccess) {
        alertBox.classList.remove('alert-danger'); // 移除错误的类
        alertBox.classList.add('alert-success'); // 添加成功的类
    } else {
        alertBox.classList.remove('alert-success'); // 移除成功的类
        alertBox.classList.add('alert-danger'); // 添加错误的类
    }

    alertBox.classList.remove('d-none'); // 显示提示框

    // 设置 2 秒后自动隐藏
    setTimeout(() => {
        alertBox.classList.add('d-none'); // 隐藏提示框
    }, 2000);

}
