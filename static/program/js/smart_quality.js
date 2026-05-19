function submitFeedback(button) {
    const form = document.getElementById('feedbackForm');
    if (!form.checkValidity()) {
        // 如果表单验证不通过，显示提示信息
        showAlert('请填写所有必填项！', false);
        return;
    }

    const phoneInput = document.getElementById('phone').value;
    const phonePattern = /^(\d{11}|\d{7})$/;
    if (!phonePattern.test(phoneInput)) {
        showAlert('请输入11位手机号码或7位数座机号码。', false);
        return;
    }

    const descriptionIssue = document.getElementById('description_issue').value.trim();
    if (descriptionIssue.length < 6) {
        showAlert('内容过短。', false);
        return;
    }

    button.disabled = true; // 禁用提交按钮，防止重复提交
    const formData = new FormData(form);
    const feedbackChoice = document.querySelector('input[name="feedback_choice"]:checked');
    formData.append('feedbackChoice', feedbackChoice ? feedbackChoice.value : '');

    // 发送反馈表单数据
    axios.post('/imc/customOpt', {
        req: '494',
        data: JSON.stringify(Object.fromEntries(formData))
    })
        .then(response => {
            const data = response.data.data.msg;
            // 调用文件上传函数
            uploadFiles(data);
            form.reset(); // 重置表单
            showAlert('提交成功！', true);
        })
        .catch(error => {
            console.error('请求失败:', error);
            showAlert('提交失败！', false);
        })
        .finally(() => {
            button.disabled = false; // 启用提交按钮
        });
}


function updateFileYesOrNo(data) {

    // 发送反馈表单数据
    axios.post('/imc/customOpt', {
        req: '496',
        data: JSON.stringify(data)
    })
        .then(response => {
            console.log('请求成功:', response);
        })
        .catch(error => {
            console.error('请求失败:', error);
        })
        .finally(() => {
        });
}

function uploadFiles(data) {
    const fileInput = document.getElementById('attachment');
    if (!fileInput.files.length) {
        return;
    } else {
        updateFileYesOrNo(data);
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

        // 发送文件上传请求
        return axios.post('/imc/uploadAttachments', formData);
    });

    // 等待所有文件上传完成
    Promise.all(promises)
        .then(responses => {
            responses.forEach(response => console.log('上传成功:', response.data));
        })
        .catch(error => {
            console.error('上传失败:', error);
        });
}

function showAlert(message, isSuccess) {
    const alertContainer = document.getElementById('alertContainer');
    // 动态创建提示信息
    alertContainer.innerHTML = `
            <div class="alert mt-3 alert-custom ${isSuccess ? 'success' : 'error'} fade-in">
                ${message}
            </div>
        `;

    // 定时移除提示信息
    setTimeout(() => {
        const alertDiv = alertContainer.querySelector('.alert');
        if (alertDiv) {
            alertDiv.classList.remove('fade-in');
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, 3000);
}


function showQrModal() {
    document.getElementById('qr-modal').style.display = 'flex';
}

function hideQrModal() {
    document.getElementById('qr-modal').style.display = 'none';
}

function showHoverBox() {
    document.getElementById('qr-hover-box').style.display = 'block';
}

function hideHoverBox() {
    document.getElementById('qr-hover-box').style.display = 'none';
}