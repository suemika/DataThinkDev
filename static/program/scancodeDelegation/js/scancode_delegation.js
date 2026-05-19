document.addEventListener('DOMContentLoaded', async function () {

    // 填充下拉框选项（支持多种数据格式）
    async function fillSelectOptions(selectElement, dataList) {
        if (!selectElement) return;
        const response = await fetchDataFromAPI('671', "测试");
        if (response.data.status === 0) {
            return response; // 返回响应数据
        }
        selectElement.innerHTML = '';
        const defaultOption = new Option(`请选择${selectElement.name || selectElement.id || ''}`, '');
        selectElement.appendChild(defaultOption);

        if (!dataList || !Array.isArray(dataList)) {
            console.error('无效的数据:', dataList);
            return;
        }

        dataList.forEach(item => {
            let value, text;
            if (Array.isArray(item)) {
                [value, text] = item;
            } else if (typeof item === 'object') {
                value = item.value || item.id;
                text = item.text || item.name;
            } else {
                value = text = item;
            }
            selectElement.appendChild(new Option(text, value));
        });
    }

        // 加载用户列表
    async function loadEmsData(selectElement,url) {
         if (!selectElement) return;
        const response = await fetchDataFromAPI('695', url);
        let dataList;
        if (response.data.status === 0) {
            dataList = response.data.data; // 返回响应数据
        }
        selectElement.innerHTML = '';
        const defaultOption = new Option(`请选择${selectElement.name || selectElement.id || ''}`, '');
        selectElement.appendChild(defaultOption);

        if (!dataList || !Array.isArray(dataList)) {
            console.error('无效的数据:', dataList);
            return;
        }

        dataList.forEach(item => {
            let value, text;
            if (Array.isArray(item)) {
                [value, text] = item;
            } else if (typeof item === 'object') {
                value = item.value || item.id;
                text = item.text || item.name;
            } else {
                value = text = item;
            }
            selectElement.appendChild(new Option(text, value));
        });
    }

    // 获取下拉框数据（带错误处理）
    async function populateSelect(selectElement, url) {
        try {
            const response = await $.ajax({
                type: 'POST',
                url: url,
                data: { req: 1 },
                cache: false,
                dataType: 'json'
            });

            fillSelectOptions(selectElement, response);
            return response;
        } catch (error) {
            console.error(`加载${selectElement.id}数据失败:`, error);
            showMsg(`加载${selectElement.name || selectElement.id}数据失败，请稍后重试`, false);
            throw error;
        }
    }

    // 初始化表单（顺序加载数据）
    async function initializeForm() {
        try {
            showMsg('正在加载表单数据...', true);

            // 顺序加载下拉数据
            await loadEmsData(document.getElementById('sampleName'), '试样名称');
            await loadEmsData(document.getElementById('samplingLocation'), '取样地点');
            await loadEmsData(document.getElementById('processingCenter'), '加工中心');

            // 设置加工中心变更事件
            document.getElementById('processingCenter').addEventListener('change', async function() {
                const materialSelect = document.getElementById('materialName');
                materialSelect.disabled = !this.value;

                if (this.value) {
                    try {
                        await loadEmsData(materialSelect, '物料名称');
                    } catch (error) {
                        materialSelect.innerHTML = '<option value="">加载物料失败</option>';
                    }
                } else {
                    materialSelect.innerHTML = '<option value="">请选择物料名称</option>';
                }
            });

            // 设置物料名称变更事件
            document.getElementById('materialName').addEventListener('change', async function() {
                const schemeSelect = document.getElementById('schemeName');
                schemeSelect.disabled = !this.value;

                if (this.value) {
                    try {
                        await populateSelect(schemeSelect, `/imc/getSchemeNameSelectData?mateCode=${this.value}`);
                    } catch (error) {
                        schemeSelect.innerHTML = '<option value="">加载方案失败</option>';
                    }
                } else {
                    schemeSelect.innerHTML = '<option value="">请选择方案名称</option>';
                }
            });

            // 设置提交按钮事件
            document.getElementById('submitBtn').addEventListener('click', async function() {
                const form = document.getElementById('myForm');
                const requiredFields = form.querySelectorAll('[required]');
                let isValid = true;

                // 验证必填字段
                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        field.classList.add('is-invalid');
                        isValid = false;
                    } else {
                        field.classList.remove('is-invalid');
                    }
                });

                if (!isValid) {
                    showMsg('请填写所有必填字段！', false);
                    return;
                }

                // 收集表单数据
                const formData = {
                    sampleName: document.getElementById('sampleName').value,
                    samplingLocation: document.getElementById('samplingLocation').value,
                    actualSampleNumber: document.getElementById('actualSampleNumber').value,
                    carNumber: document.getElementById('carNumber').value,
                    processingCenter: document.getElementById('processingCenter').value,
                    destination: document.getElementById('destination').value,
                    materialName: document.getElementById('materialName').value,
                    schemeName: document.getElementById('schemeName').value,
                    remarks: document.getElementById('remarks').value,
                    salaryNumber: document.getElementById('salaryNumber').value,
                    SchemeNameText: document.getElementById('schemeName').selectedOptions[0].text
                };

                // 提交数据
                try {
                    const response = await fetch('/imc/insertScanCodeDelegationData', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });

                    const result = await response.json();
                    showMsg(result.msg || '提交成功', response.ok);

                    if (response.ok) {
                        form.reset(); // 成功时重置表单
                    }
                } catch (error) {
                    console.error('提交失败:', error);
                    showMsg('提交失败，请稍后重试', false);
                }
            });

            showMsg('表单加载完成', true);
        } catch (error) {
            console.error('初始化失败:', error);
            showMsg('表单初始化失败，请刷新页面重试', false);
        }
    }

    // 启动初始化
    initializeForm();
});