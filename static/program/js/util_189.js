document.addEventListener('DOMContentLoaded', function () {
    // 获取当前时间戳
    const timestamp = new Date().getTime();

    // 获取当前年份
    const currentYear = new Date().getFullYear();

// 更新年份部分的内容
    const yearElement = document.getElementById('footer-year');
    if (yearElement) {
        yearElement.textContent = `© ${currentYear}`;
    }

    // 设置图片的src属性
    const headerImg = document.getElementById('header-img');
    if (headerImg) {
        headerImg.src = `program/logo/font_logo.png?v=${timestamp}`;
    }

    const qrImg = document.getElementById('QR-img');
    if (qrImg) {
        qrImg.src = `./logo/feedback_qr.png?v=${timestamp}`;
    }

    const qrHref = document.getElementById('QR-href');
    if (qrHref) {
        qrHref.href = `./logo/feedback_qr.png?v=${timestamp}`;
    }

    // 构建背景图片URL，附加随机数参数
    const bgUrl = `program/logo/st.jpg?v=${timestamp}`;
    // 获取背景容器元素
    const backgroundContainer = document.querySelector('.background-container');
    // 设置背景图片样式
    if (backgroundContainer) {
        backgroundContainer.style.backgroundImage = `url(${bgUrl})`;
    }

    const footerHTML = `
    <footer>
        <div id="divPowerBy">
            <div class='body-footer'>
                <span id='spanPower'>
                    Copyright © 2024-<span id="footer-year">2024</span> <a href="http://edi.sdstg.com/" target="_self" rel="noopener">石横特钢集团有限公司</a> 数智中心 <span>提供技术支持</span>
                </span>
            </div>
        </div>
    </footer>`;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
});
