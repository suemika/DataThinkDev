document.addEventListener('DOMContentLoaded', function () {
    // 提取获取当前时间戳和当前年份的代码
    const timestamp = new Date().getTime();
    const currentYear = new Date().getFullYear();

    // 构建 HTML 内容
    const footerHTML = `
    <footer>
        <div id="divPowerBy">
            <div class='body-footer'>
                <span id='spanPower'>
                    Copyright © 2024-<span id="footer-year">${currentYear}</span> <a href="http://edi.sdstg.com/" target="_self" rel="noopener">石横特钢集团有限公司</a> 数智中心 <span>提供技术支持</span>
                </span>
            </div>
        </div>
    </footer>`;

    const errorHTML = `
    <div id="error-message"  style="display: none;">
        登录已失效，即将跳转登录页面。<br>
        <span id="countdown-timer">10</span>秒后将自动跳转。
        <br><a class="btn btn-primary" href="http://edi.sdstg.com/" target="_self" rel="noopener">点击跳转</a>
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

    const qrHref = document.getElementById('QR-href');
    if (qrHref) {
        qrHref.href = `../logo/feedback_qr.png?v=${timestamp}`;
    }

    const pdfHref = document.getElementById('pdf-link-button');
    if (pdfHref) {
        pdfHref.href = `http://ems.sdstg.com/program/phone_pdf.html?v=${timestamp}`;
    }

    // 构建背景图 URL，附加时间戳参数
    const bgUrl = `../logo/st.jpg?v=${timestamp}`;
    const backgroundContainer = document.querySelector('.background-container');
    if (backgroundContainer) {
        backgroundContainer.style.backgroundImage = `url(${bgUrl})`;
    }

});

function getNameFromUrl(type) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(type);
}


async function fetchDataFromAPI(req, data) {
    const response = await axios.post('/imc/customOpt', {req, data: JSON.stringify(data)});
    return response.data;
}


// 将函数添加至 window 对象
window.redirectToErrorPage = redirectToErrorPage;
window.showError = showError;
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

function showError(message, isSuccess = false) {
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

}
