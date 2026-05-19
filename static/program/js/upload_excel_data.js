document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('upload-button').onclick = uploadExcelFile;
});

function uploadExcelFile() {
    clearMessages();
    displayUploadingMessage();

    const fileInput = document.getElementById('excel_file');
    const moduleSelect = document.getElementById('module_select'); // 获取模块选择下拉框

    // 检查模块选择
    if (moduleSelect.value === '请选择模块') {
        displayError("请选择模块");
        clearUploadingMessage();
        return;
    }

    // 检查文件选择
    if (!fileInput.files || fileInput.files.length === 0) {
        displayError("请选择一个文件");
        clearUploadingMessage();
        return;
    }

    const file = fileInput.files[0];

    // 验证文件类型
    if (!/\.xlsx$/.test(file.name)) {
        displayError("请上传有效的 Excel 文件（.xlsx）");
        clearUploadingMessage();
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            const base64String = btoa(String.fromCharCode(...new Uint8Array(event.target.result))); // 转换为 Base64

            const formData = new FormData();
            formData.append('req', '595'); // 添加 req 参数
            // 创建包含 base 和 module 数据的对象
            const dataObject = {
                base: base64String,
                module: moduleSelect.value
            };

            // 将数据对象转为 JSON 字符串并添加到 FormData
            formData.append('data', JSON.stringify(dataObject));

            // 禁用按钮以避免重复点击
            const uploadButton = document.getElementById('upload-button');
            uploadButton.disabled = true;

            axios.post('/imc/customOpt', formData, {
            })
                .then(response => {
                    if (response.status !== 200) {
                        displayError(response.data.error);
                    } else {
                        displaySuccess();
                        // 3秒后清除成功消息
                        setTimeout(clearMessages, 3000);
                    }
                })
                .catch(error => {
                    displayError("上传文件时发生错误：" + error.message);
                })
                .finally(() => {
                    clearUploadingMessage();
                    uploadButton.disabled = false; // 上传结束后重新启用按钮
                });
        } catch (error) {
            displayError("转换为 Base64 时发生错误：" + error.message);
            clearUploadingMessage();
        }
    };

    reader.onerror = function () {
        displayError("读取文件时发生错误。");
        clearUploadingMessage();
    };

    // 使用 readAsArrayBuffer 方法
    reader.readAsArrayBuffer(file); // 以二进制 ArrayBuffer 的方式读取文件
}

function clearMessages() {
    clearSuccessMessage();
    clearUploadingMessage();
    clearErrorMessage();
}

function clearUploadingMessage() {
    document.getElementById('uploading-container').style.display = 'none';
}

function clearSuccessMessage() {
    document.getElementById('success-container').style.display = 'none';
}

function clearErrorMessage() {
    document.getElementById('error-container').innerHTML = "";
}

function displayUploadingMessage() {
    document.getElementById('uploading-container').style.display = 'block';
}

function displaySuccess() {
    document.getElementById('success-container').style.display = 'block';
    // 清空文件输入框和模块选择
    document.getElementById('excel_file').value = '';
    document.getElementById('module_select').selectedIndex = 0; // 默认选择第一个选项
}

function displayError(errorMessage) {
    document.getElementById('error-container').innerHTML = '<div class="alert alert-danger" role="alert">' + errorMessage + '</div>';
}
