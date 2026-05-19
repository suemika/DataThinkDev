document.getElementById('upload-button').addEventListener('click', function () {

    // 清除之前的消息
    clearMessages();

    // 显示上传中消息
    displayUploadingMessage();
    // 获取文件输入
    var fileInput = document.getElementById('excel_file');

    // 检查是否有文件被选择
    if (!fileInput.files || fileInput.files.length === 0) {
        displayError("请选择一个文件");
        clearUploadingMessage(); // 清除上传中消息
        // 隐藏数据量多消息
        clearWaitingMessage();
        return;
    }

    // 获取文件对象
    var file = fileInput.files[0];

    // 创建一个FormData对象来包装文件
    var formData = new FormData();
    formData.append('excel_file', file);

    axios.post('/imc/customOpt', {
        req: '564',
        data: JSON.stringify(formData)
    })
        .then(function (response) {
            const watermarkText = response.data.msg;
            if (watermarkText) {
                displaySuccess(); // 显示成功消息
                // 3秒后清除成功消息
                setTimeout(clearMessages, 500);
            } else {
                displayError("上传文件时发生错误：" + error);
                // 隐藏上传中消息
                clearUploadingMessage();
            }
        })
        .catch(function (error) {
            displayError("上传文件时发生错误：" + error);
            // 隐藏上传中消息
            clearUploadingMessage();
        });

});

// 清除所有消息
function clearMessages() {
    clearSuccessMessage();
    clearUploadingMessage();
    clearErrorMessage();
}

// 清除上传中消息
function clearUploadingMessage() {
    var uploadingContainer = document.getElementById('uploading-container');
    uploadingContainer.style.display = 'none';
}

// 清除成功消息
function clearSuccessMessage() {
    var successContainer = document.getElementById('success-container');
    successContainer.style.display = 'none';
}

// 清除错误消息
function clearErrorMessage() {
    document.getElementById('error-container').innerHTML = "";
}

// 清除数据量较多消息
function clearWaitingMessage() {
    var waitingContainer = document.getElementById('waiting-container');
    waitingContainer.style.display = 'none';
}

// 显示上传中消息
function displayUploadingMessage() {
    var uploadingContainer = document.getElementById('uploading-container');
    uploadingContainer.style.display = 'block';
}

// 显示数据量较多消息
function displayWaitingMessage() {
    var waitingContainer = document.getElementById('waiting-container');
    waitingContainer.style.display = 'block';
}

// 显示成功消息
function displaySuccess() {
    var successContainer = document.getElementById('success-container');
    successContainer.style.display = 'block';
}

function displayError(errorMessage) {
    document.getElementById('error-container').innerHTML = '<div class="alert alert-danger" role="alert">' + errorMessage + '</div>';
}