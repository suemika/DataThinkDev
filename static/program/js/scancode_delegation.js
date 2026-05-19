document.addEventListener('DOMContentLoaded', function () {
    var alertContainer = document.getElementById('alertContainer');

// 函数：显示提示框
    function showAlert(message, isSuccess) {
        // 先删除已存在的提示框
        var existingAlert = alertContainer.querySelector('.alert');
        if (existingAlert) {
            alertContainer.removeChild(existingAlert);
        }

        // 创建新的提示框
        var alertDiv = document.createElement('div');
        alertDiv.classList.add('alert', 'mt-3', 'alert-custom', isSuccess ? 'success' : 'error', 'fade-in');
        alertDiv.innerHTML = message;
        alertContainer.appendChild(alertDiv);

        // 设置定时器，在3秒后隐藏提示框
        setTimeout(function () {
            alertDiv.classList.remove('fade-in');
            setTimeout(function () {
                var existingAlert = alertContainer.querySelector('.alert');
                if (existingAlert && alertContainer.contains(existingAlert)) {
                    alertContainer.removeChild(existingAlert);
                }
            }, 300);
        }, 3000); // 3秒后隐藏
    }

// 通用函数用于填充下拉框选项
    function fillSelectOptions(selectElement, dataList) {
        selectElement.innerHTML = '';
        var defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择' + selectElement.name;
        selectElement.appendChild(defaultOption);

        dataList.forEach(function (item) {
            var option = document.createElement('option');
            option.value = item[0];
            option.textContent = item[1];
            selectElement.appendChild(option);
        });
    }

// 获取下拉框数据并填充
    function populateSelect(selectElement, url) {
        $.ajax({
            type: 'POST',
            url: url,
            data: {
                req: 1
            },
            cache: false,
            dataType: 'json',
            success: function (data) {
                fillSelectOptions(selectElement, data);
            },
            error: function () {
                // 处理错误情况
            }
        });
    }

// 初始化下拉框数据
    populateSelect(document.getElementById('sampleName'), '/imc/getSampleNameData');
    populateSelect(document.getElementById('samplingLocation'), '/imc/getSamplingLocationData');
    populateSelect(document.getElementById('processingCenter'), '/imc/getProcessingCenterData');

// 加工中心改变事件处理
    document.getElementById('processingCenter').addEventListener('change', function () {
        var materialNameSelect = document.getElementById('materialName');
        materialNameSelect.disabled = this.value === '';

        // 如果选择了加工中心，查询物料名称数据
        if (this.value !== '') {
            populateSelect(materialNameSelect, '/imc/getMaterialNameSelectData');
        } else {
            // 清空物料名称下拉框
            materialNameSelect.innerHTML = '<option value="">请选择物料名称</option>';
            materialNameSelect.disabled = true;
        }
    });

// 物料名称改变事件处理
    document.getElementById('materialName').addEventListener('change', function () {
        var schemeNameSelect = document.getElementById('schemeName');
        schemeNameSelect.disabled = this.value === '';

        // 如果选择了物料名称，查询方案名称数据
        if (this.value !== '') {
            // 使用所选的物料名称值来查询方案名称
            populateSelect(schemeNameSelect, '/imc/getSchemeNameSelectData?mateCode=' + this.value);
        } else {
            // 清空方案名称下拉框
            schemeNameSelect.innerHTML = '<option value="">请选择方案名称</option>';
            schemeNameSelect.disabled = true;
        }
    });

// 提交按钮点击事件处理
    document.getElementById('submitBtn').addEventListener('click', function () {
        var formData = {};
        var formValid = true;
        var inputFields = document.querySelectorAll('input, select');

        inputFields.forEach(function (field) {
            formData[field.id] = field.value;

            if (field.required && field.value.trim() === '') {
                formValid = false;
                field.classList.add('is-invalid');
            } else {
                field.classList.remove('is-invalid');
            }
        });

        if (!formValid) {
            // 错误提示框
            showAlert('请填写所有字段！', false);
            return;
        }

        formData['remarks'] = document.getElementById('remarks').value;
        formData['SchemeNameText'] = document.getElementById('schemeName').options[document.getElementById('schemeName').selectedIndex].text;

        fetch('/imc/insertScanCodeDelegationData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // 在这里可以处理后台返回的数据，例如显示成功消息
                showAlert(data.msg, true);
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert(data.msg, false);
            });
    });

});