let workshopName = '正在获取'
let currentLocation = {lon: null, lat: null};
let oid = getNameFromUrl("oid");
document.addEventListener('DOMContentLoaded', async function () {
    util.loading.show();
    debugger
    // 解析URL参数
    const urlParams = new URLSearchParams(window.location.search);
    oid = urlParams.get('oid');
    const mainContent = document.getElementById('mainContent');

    if (!oid) {
        mainContent.style.display = 'none';  // 隐藏内容，不显示表单
        redirectToErrorPage();
        util.loading.hide();
    }
    // 生成问题组
    const issueGroupsContainer = document.getElementById('issueGroupsContainer');
    issueGroupsContainer.innerHTML = generateAllIssueGroups();

    // 初始化Select2
    $('#brand').select2({
        placeholder: "请选择牌号",
        allowClear: true,
        width: '100%'
    });


    try {
        await getLocation();
        mainContent.style.display = 'block';  // 如果位置获取成功，显示内容
    } catch (error) {
        mainContent.style.display = 'none';  // 隐藏内容，不显示表单
        redirectToErrorPage();
        showMsg('获取位置失败: ' + error.message, false);
        util.loading.hide();
        return;
    }

    // 禁用按钮
    const submitBtn = document.getElementById('submitBtn');
    const endCheckBtn = document.getElementById('endCheckBtn');
    submitBtn.disabled = true;
    endCheckBtn.disabled = true;

    try {
        const response = await loadList();
        // 成功后启用按钮
        if (response !== null) {
            const data = response.data.data;
            const brandSelect = $('#brand');
            brandSelect.empty();
            brandSelect.append('<option value="">请选择牌号</option>');
            data.forEach(item => {
                brandSelect.append(`<option value="${item.id}">${item.name}</option>`);
            });
            brandSelect.trigger('change');
            submitBtn.disabled = false; // 启用提交按钮
            endCheckBtn.disabled = false; // 启用结束检查按钮
        } else {
            console.error('未找到数据');
            showMsg('未被定义的位置', true);
            submitBtn.disabled = true; // 确保在未找到数据的情况下继续禁用按钮
            endCheckBtn.disabled = true; // 禁用结束检查按钮
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        showMsg('加载数据失败: ' + error.message, false);
        submitBtn.disabled = true;
        endCheckBtn.disabled = true;
    } finally {
        util.loading.hide();

    }

    // 添加事件监听器
    submitBtn.addEventListener('click', () => submitSmartQuality(submitBtn));
    endCheckBtn.addEventListener('click', endCheck);
    document.getElementById('confirmEndCheck').addEventListener('click', confirmEndCheck);
});

function getMockLocation() {
    return {
        lat: 39.9042,  // 模拟纬度（北京）
        lon: 116.4074  // 模拟经度
    };
}

async function loadList() {
    const response = await fetchDataFromAPI('671', workshopName);
    if (response.data.status === 0) {
        return response; // 返回响应数据
    }
    return null;
}

// 结束检查功能
function endCheck() {
    $('#endCheckModal').modal('show');
}

// 确认结束检查
async function confirmEndCheck() {


    const endCheckBtn = document.getElementById('endCheckBtn');
    endCheckBtn.disabled = true;
    endCheckBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>结束中...';

    const formData = new FormData();
    const salaryNumber = oid;


    formData.append('lon', 116.535);
    formData.append('lat', 36.227);
    // 从当前位置中提取经纬度
    if (currentLocation.lon && currentLocation.lat) {
        formData.append('lon', currentLocation.lon);
        formData.append('lat', currentLocation.lat);
    }

    formData.append('salaryNumber', salaryNumber);
    formData.append('oid', oid);
    try {

        const response = await fetchDataFromAPI('778', Object.fromEntries(formData));
        if (response.data.status === 0) {
            // 重置表单
            document.getElementById('qualityForm').reset();
            $('#brand').val('').trigger('change');

            // 显示成功消息
            showMsg('检查已结束！', true);

            // 重置按钮状态
            endCheckBtn.disabled = false;
            endCheckBtn.innerHTML = '<i class="bi bi-stop-circle me-2"></i>结束检查';

            // 关闭模态框
            $('#endCheckModal').modal('hide');

            // 滚动到顶部
            window.scrollTo(0, 0);
        } else {
            // 关闭模态框
            $('#endCheckModal').modal('hide');
            showMsg('结束检查失败: ' + response.data.msg, false);
            endCheckBtn.disabled = false;
            endCheckBtn.innerHTML = '<i class="bi bi-stop-circle me-2"></i>结束检查';
        }
    } catch (error) {
        console.error('结束检查失败:', error);
        showMsg('结束检查失败: ' + error.message, false);
        endCheckBtn.disabled = false;
        endCheckBtn.innerHTML = '<i class="bi bi-stop-circle me-2"></i>结束检查';
    }
}


async function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            showMsg("抱歉，您的浏览器不支持地理定位");
            return reject(new Error("浏览器不支持地理定位"));
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const lon = position.coords.longitude;
                    const lat = position.coords.latitude;
                    const point = wgs84togcj02(lon, lat);

                    // 显示位置信息
                    document.getElementById('locationText').innerHTML = `
                            <span>当前位置: 经度: ${point.lon.toFixed(3)}, 纬度: ${point.lat.toFixed(3)}</span>
                        `;

                    // 获取车间名称
                    const response = await fetchDataFromAPI('639', {
                        lat: point.lat.toFixed(3),
                        lon: point.lon.toFixed(3), oid: oid
                    });
                    console.log(point.lat.toFixed(3), point.lon.toFixed(3),oid);
                    workshopName = response.data.workshopName;
                    if (workshopName !== '未设置的新位置') {
                        document.getElementById('workshopName').innerHTML = `
                            车间名称: ${workshopName}
                        `;

                    } else {

                        showMsg('未找到匹配的车间，请检查经纬度是否正确。');
                        document.querySelector('.main-card').style.display = 'none';
                        document.getElementById('endCheckBtn').style.display = 'none';
                    }
                    resolve();
                } catch (error) {
                    showMsg('获取车间名称失败: ' + error.message);
                    reject(error);
                }
            },
            (error) => {
                showMsg(`获取位置失败,请打开定位。`);
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// 显示和隐藏描述和文件上传框
function toggleSection(radio, sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = (radio.value === '是') ? 'block' : 'none';

        // 添加动画
        if (radio.value === '是') {
            section.style.animation = 'fadeIn 0.3s ease-in-out';
        }
    }
}

// 处理表单提交
async function submitSmartQuality(button) {
    if (!validateForm()) return;

    const form = document.getElementById('qualityForm');
    const rows = form.querySelectorAll('.issue-group');
    const formData = new FormData();

    const selectedValue = document.getElementById('brand').value;
    const salaryNumber = oid;

    if (!selectedValue) {
        showMsg('请选择牌号', false);
        $('#brand').select2('open');
        return;
    }


    $('#submissionModal').modal('show');

    formData.append('lon', 116.535);
    formData.append('lat', 36.227);
    // 从当前位置中提取经纬度
    if (currentLocation.lon && currentLocation.lat) {
        formData.append('lon', currentLocation.lon);
        formData.append('lat', currentLocation.lat);
    }

    formData.append('salaryNumber', salaryNumber);
    formData.append('oid', oid);

    // 首先调用API 666传递经纬度和工资编号
    try {

        const response = await fetchDataFromAPI('777', Object.fromEntries(formData));
        if (response.data.status === 0) {
            const data = response.data.msg;
            formData.append('pid', data);
        } else {
            showMsg('提交失败: ' + response.data.msg, false);
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-send-check me-2"></i>提交检查';
            $('#submissionModal').modal('hide');
            return;
        }
    } catch (error) {
        console.error('API 666调用失败:', error);
        showMsg('提交失败: ' + error.message, false);
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-send-check me-2"></i>提交检查';
        $('#submissionModal').modal('hide');
        return;
    }

    formData.append('brand', selectedValue);

    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>提交中...';

    try {
        // 收集有问题的行数据和文件
        for (let row of rows) {
            const h5Element = row.querySelector('h5');
            const h5Value = h5Element ? h5Element.innerText.trim() : '';

            const formGroups = row.querySelectorAll('.form-group');
            for (let formGroup of formGroups) {
                const labelElement = formGroup.querySelector('label');
                if (!labelElement) continue;

                const issueName = labelElement.innerText.replace('：', '').trim();
                if (issueName.includes("品类")) continue;

                const hasIssueRadio = formGroup.querySelector('input[type="radio"]:checked');
                const description = formGroup.querySelector('textarea') ? formGroup.querySelector('textarea').value : '';

                formData.append('h5Value', h5Value);
                formData.append('issueName', issueName);
                formData.append('description', description);

                if (!hasIssueRadio) continue;

                formData.append('hasIssue', hasIssueRadio.value);

                if (hasIssueRadio.value === '是' && !description) {
                    showMsg('请填写问题描述: ' + issueName, false);
                    button.disabled = false;
                    button.innerHTML = '<i class="bi bi-send-check me-2"></i>提交';
                    $('#submissionModal').modal('hide');
                    return;
                }

                const response = await fetchDataFromAPI('643', Object.fromEntries(formData));
                if (response.data.status === 0) {
                    const data = response.data.msg;
                    const fileInput = formGroup.querySelector('input[type="file"]');
                    const files = fileInput ? fileInput.files : [];

                    if (files.length > 0) {
                        await uploadFiles(data, files);
                    } else {
                        console.log(`${h5Value} --> ${issueName} --> ${data}：没有选择文件，跳过上传。`);
                        await updateFileYesOrNo(data);
                    }
                } else {
                    showMsg('提交失败: ' + response.data.msg, false);
                    return;
                }
            }
        }

        // 提交成功后重置表单
        form.reset();
        $('#brand').val('').trigger('change');
        window.scrollTo(0, 0);
        showMsg('提交成功！', true);
    } catch (error) {
        console.error('提交失败:', error);
        showMsg('提交失败: ' + error.message, false);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-send-check me-2"></i>提交检查';
        $('#submissionModal').modal('hide');
    }
}

function uploadFiles(data, fileInputs) {
    const promises = [];

    // 选择所有文件输入
    const allFileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');

    allFileInputs.forEach(fileInput => {
        if (fileInput.files.length > 0) {
            const files = Array.from(fileInput.files); // 将文件列表转换为数组
            files.forEach(file => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('filterRules', JSON.stringify([
                    {field: "table_id", op: "equal", value: "863"},
                    {field: "row_id", op: "equal", value: data},
                    {field: "uploadType", op: "equal", value: ""}
                ]));

                // 发送文件上传请求
                const uploadPromise = axios.post('/imc/uploadAttachments', formData);
                promises.push(uploadPromise);
            });
        }
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


// 将验证逻辑封装成函数
function validateForm() {
    const form = document.getElementById('qualityForm');
    const rows = form.querySelectorAll('.issue-group');

    for (let row of rows) {
        const formGroups = row.querySelectorAll('.form-group');
        for (let formGroup of formGroups) {
            const hasIssueRadio = formGroup.querySelector('input[type="radio"]:checked');

            if (!hasIssueRadio) {
                showMsg('所有问题必须选择“是”或“否”');
                return false;
            }

            if (hasIssueRadio.value === '是') {
                const description = formGroup.querySelector('textarea').value;
                if (!description) {
                    showMsg('如果选择“是”，请填写问题描述');
                    return false;
                }

                const fileInput = formGroup.querySelector('input[type="file"]');
                if (fileInput && fileInput.files.length === 0) {
                    showMsg('如果选择“是”，请上传相关文件');
                    return false;
                }
            }
        }
    }
    return true;
}

async function updateFileYesOrNo(data) {
    const response = await fetchDataFromAPI('694', data);

    if (response.data.status === 0) {
        console.log('更新成功:', response.data.msg)
    }
}

// 生成问题组的函数
function createIssueGroup(title, issues) {
    let html = `
        <div class="issue-group">
            <h5><i class="bi bi-list-check me-2"></i>${title}</h5>
        `;

    issues.forEach(issue => {
        html += createIssueControl(issue.name, issue.label, issue.idPrefix);
    });

    html += `</div>`;
    return html;
}

// 生成单个问题控件的函数
// 生成单个问题控件的函数
function createIssueControl(name, label, idPrefix) {
    return `
            <div class="form-group">
                <label for="${idPrefix}_${name}" class="form-label"><i class="bi bi-question-circle me-2"></i>${label}：</label>
                <div class="d-flex align-items-center">
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="${name}" id="${idPrefix}_${name}_yes" value="是" required
                               onchange="toggleSection(this, '${name}Desc')">
                        <label class="form-check-label" for="${idPrefix}_${name}_yes">是</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="${name}" id="${idPrefix}_${name}_no" value="否" required
                               onchange="toggleSection(this, '${name}Desc')">
                        <label class="form-check-label" for="${idPrefix}_${name}_no">否</label>
                    </div>
                </div>
                <div id="${name}Desc" class="issue-section">
                    <textarea class="form-control" placeholder="请填写问题描述" rows="3"></textarea>
                    <label class="mt-2 d-block">
                        <i class="bi bi-paperclip me-2"></i>上传附件:
                        <input type="file" class="form-control-file mt-1" name="${name}File" multiple
                               accept="image/*,.pdf,.doc,.docx,.txt">
                    </label>
                </div>
            </div>
            `;
}


// 定义所有问题组的数据
const issueGroups = [
    {
        title: "外形尺寸",
        issues: [
            {name: "innerDiameter", label: "内径", idPrefix: "shape"},
            {name: "ribSpacing", label: "横肋间距", idPrefix: "shape"},
            {name: "ribHeight", label: "横肋高", idPrefix: "shape"},
            {name: "bendHead", label: "弯头", idPrefix: "shape"},
            {name: "flatHead", label: "扁头", idPrefix: "shape"},
            {name: "otherShape", label: "其他", idPrefix: "shape"}
        ]
    },
    {
        title: "表面质量",
        issues: [
            {name: "scab", label: "结疤", idPrefix: "surface"},
            {name: "crack", label: "裂纹", idPrefix: "surface"},
            {name: "winding", label: "缠绕", idPrefix: "surface"},
            {name: "otherSurface", label: "其它", idPrefix: "surface"}
        ]
    },
    {
        title: "包装标识",
        issues: [
            {name: "nameplate", label: "标牌", idPrefix: "packagingLabel"},
            {name: "endUneven", label: "端部不齐", idPrefix: "packagingLabel"},
            {name: "windingPackaging", label: "缠绕", idPrefix: "packagingLabel"},
            {name: "otherPackaging", label: "其它", idPrefix: "packagingLabel"}
        ]
    },
    {
        title: "力学性能",
        issues: [
            {name: "yield", label: "屈服", idPrefix: "mechanicalProperties"},
            {name: "tensile", label: "抗拉", idPrefix: "mechanicalProperties"},
            {name: "elongation", label: "延伸", idPrefix: "mechanicalProperties"},
            {name: "otherMechanicalProperties", label: "其它", idPrefix: "mechanicalProperties"}
        ]
    },
    {
        title: "其他问题",
        issues: [
            {name: "other", label: "是否有其他问题", idPrefix: "que"}
        ]
    }
];

// 生成所有问题组的HTML
function generateAllIssueGroups() {
    let html = '';
    issueGroups.forEach(group => {
        html += createIssueGroup(group.title, group.issues);
    });
    return html;
}