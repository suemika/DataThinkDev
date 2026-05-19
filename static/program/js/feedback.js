// feedback.js
// 页面加载完成后执行的代码
document.addEventListener('DOMContentLoaded', function () {
    // 初始化所有功能
    initAll();
});

function initAll() {
    // 初始化二维码弹窗功能
    initQrModal();

    // 初始化文件上传
    initFileUpload();

    // 初始化表单提交
    initFormSubmit();
}

function initQrModal() {
    const qrModal = document.getElementById('qrModal');

    // 1. 处理二维码按钮点击
    const qrTrigger = document.querySelector('.qr-trigger');
    if (qrTrigger) {
        qrTrigger.addEventListener('click', function () {
            showQrModal();
        });
    } else {
        console.error('未找到二维码按钮');
    }

    // 2. 处理关闭按钮点击
    const qrCloseBtn = document.querySelector('.qr-modal-close');
    if (qrCloseBtn) {
        qrCloseBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // 防止事件冒泡
            console.log('关闭按钮被点击');
            hideQrModal();
        });
    }

    // 3. 点击弹窗外部关闭
    if (qrModal) {
        qrModal.addEventListener('click', function (e) {
            if (e.target === this) {
                hideQrModal();
            }
        });
    }

    // 4. 键盘ESC键关闭弹窗
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hideQrModal();
        }
    });
}

function initFileUpload() {
    const fileInput = document.getElementById('attachment');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

function handleFileSelect(e) {
    const fileList = document.getElementById('fileList');
    if (!fileList) {
        console.error('未找到文件列表容器');
        return;
    }

    fileList.innerHTML = '';

    const files = e.target.files;

    Array.from(files).forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="bi bi-file-earmark"></i>
            <span>${file.name}</span>
            <small class="text-muted ms-auto">${formatFileSize(file.size)}</small>
        `;
        fileList.appendChild(fileItem);
    });
}

function initFormSubmit() {
    const form = document.getElementById('feedbackForm');
    if (form) {

        // 只使用表单的 submit 事件，移除按钮的 click 事件
        form.addEventListener('submit', function (e) {
            e.preventDefault(); // 阻止默认提交

            // 检查是否正在提交中，防止重复提交
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn && submitBtn.disabled) {
                return;
            }

            submitFeedback(submitBtn);
        });
    } else {
        console.error('未找到反馈表单');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function submitFeedback(button) {

    const form = document.getElementById('feedbackForm');
    if (!form) {
        console.error('未找到反馈表单');
        return;
    }

    // 检查按钮是否已禁用（防止重复提交）
    if (button.disabled) {
        return;
    }

    button.disabled = true;

    // 表单验证
    if (!form.checkValidity()) {
        showAlert('请填写所有必填项！', false);
        button.disabled = false;
        form.reportValidity();
        return;
    }

    const phoneInput = document.getElementById('phone');
    if (!phoneInput) {
        showAlert('未找到电话号码输入框', false);
        button.disabled = false;
        return;
    }

    const descriptionIssue = document.getElementById('description_issue');
    if (!descriptionIssue) {
        showAlert('未找到问题描述输入框', false);
        button.disabled = false;
        return;
    }

    if (descriptionIssue.value.trim().length < 6) {
        showAlert('问题描述至少需要6个字符。', false);
        button.disabled = false;
        return;
    }

    const feedbackChoice = document.querySelector('input[name="feedback_choice"]:checked');
    if (!feedbackChoice) {
        showAlert('请选择反馈方式。', false);
        button.disabled = false;
        return;
    }

    // 准备表单数据
    const formData = new FormData(form);
    formData.append('feedbackChoice', feedbackChoice.value);

    // 显示提交状态
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> 提交中...';


    // 发送数据
    axios.post('/imc/customOpt', {
        req: '494',
        data: JSON.stringify(Object.fromEntries(formData))
    })
        .then(response => {
            console.log('提交成功，响应:', response.data);
            const data = response.data.data.msg;

            // 上传文件
            uploadFiles(data);

            // 重置表单
            form.reset();

            const fileList = document.getElementById('fileList');
            if (fileList) {
                fileList.innerHTML = '';
            }

            showAlert('提交成功！感谢您的反馈。', true);
        })
        .catch(error => {
            console.error('提交失败:', error);
            showAlert('提交失败，请稍后重试。', false);

            // 提交失败后重新启用按钮
            button.disabled = false;
            button.innerHTML = originalHtml;
        })
        .finally(() => {
            // 注意：成功时不要在这里重新启用按钮，因为可能还有文件上传
            // 失败时已经在 catch 中处理了
            if (!button.disabled) {
                button.innerHTML = originalHtml;
            }
        });
}

function uploadFiles(data) {

    const fileInput = document.getElementById('attachment');
    const submitBtn = document.getElementById('submitBtn');

    if (!fileInput || !fileInput.files.length) {
        // 没有文件时，直接启用按钮
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send"></i> 提交反馈';
        }
        return;
    }

    const files = Array.from(fileInput.files);

    const promises = files.map(file => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filterRules', JSON.stringify([
            {field: "table_id", op: "equal", value: "647"},
            {field: "row_id", op: "equal", value: data},
            {field: "uploadType", op: "equal", value: ""}
        ]));

        return axios.post('/imc/uploadAttachments', formData);
    });

    Promise.all(promises)
        .then(() => {
            return updateFileYesOrNo(data);
        })
        .catch(error => {
            console.error('文件上传失败:', error);
            showAlert('文件上传部分失败，但反馈已提交', true);
        })
        .finally(() => {
            // 所有文件操作完成后，启用提交按钮
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-send"></i> 提交反馈';
            }
        });
}

function updateFileYesOrNo(data) {
    return axios.post('/imc/customOpt', {
        req: '496',
        data: JSON.stringify(data)
    }).then(() => {
    }).catch(error => {
        console.error('更新文件状态失败:', error);
        throw error; // 重新抛出错误，让调用者知道
    });
}

function showAlert(message, isSuccess) {
    console.log(`显示提示: ${message}, 成功: ${isSuccess}`);

    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.error('未找到提示容器');
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-custom ${isSuccess ? 'alert-success' : 'alert-error'}`;
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${isSuccess ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2"></i>
            <span>${message}</span>
        </div>
    `;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => {
            if (alertDiv.parentNode === alertContainer) {
                alertDiv.remove();
            }
        }, 300);
    }, 3000);
}

function showQrModal() {
    const qrModal = document.getElementById('qrModal');
    if (qrModal) {
        qrModal.classList.add('show');
        qrModal.style.display = 'flex';
    } else {
        console.error('未找到二维码弹窗元素');
    }
}

function hideQrModal() {
    const qrModal = document.getElementById('qrModal');
    if (qrModal) {
        qrModal.classList.remove('show');
        qrModal.style.display = 'none';
    }
}

// 防止手机端点击时出现蓝色高亮
document.addEventListener('touchstart', function () {
}, {passive: true});

// 全局导出函数
window.showQrModal = showQrModal;
window.hideQrModal = hideQrModal;
window.submitFeedback = submitFeedback;
window.showAlert = showAlert;