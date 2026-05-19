let pValue; // 接收到的参数
let pNumber; // 工资编号

document.addEventListener("DOMContentLoaded", fetchData);

async function fetchData() {
    const urlParams = new URLSearchParams(window.location.search);
    pValue = urlParams.get('p');

    if (!pValue) {
        showErrorMessage();
        return redirectToErrorPage();
    }

    try {
        const response = await fetchDataFromAPI('556', pValue);
        if (response.data.status === 0) {
            const response = await fetchDataFromAPI('561', {});
            if (response.data) {
                exampleData = response.data.data;
                populateSelectOptions();
            } else {
                console.log("无数据");
            }
        } else {
            showErrorMessage();
            redirectToErrorPage();
            console.error('Error fetching watermark text:', response.data.msg);
        }
    } catch (error) {
        showErrorMessage();
        redirectToErrorPage();
        console.error('Error fetching watermark:', error);

    }
}

async function fetchDataFromAPI(req, data) {
    const response = await axios.post('/imc/customOpt', {req, data: JSON.stringify(data)});
    return response.data;
}

function populateSelectOptions() {
    const uniqueOptions = {
        '员工状态': new Set(),
        '所学专业': new Set(),
        '学历': new Set(),
        '毕业院校': new Set(),
        '政治面貌': new Set(),
        '婚恋状况': new Set(),
        '现聘职称': new Set(),
        'MBTI性格测试类型': new Set(),
    };

    // 提取所有唯一选项
    exampleData.forEach(item => {
        uniqueOptions['员工状态'].add(item['员工状态']);
        uniqueOptions['所学专业'].add(item['所学专业']);
        uniqueOptions['学历'].add(item['学历']);
        uniqueOptions['毕业院校'].add(item['毕业院校']);
        uniqueOptions['政治面貌'].add(item['政治面貌']);
        uniqueOptions['婚恋状况'].add(item['婚恋状况']);
        uniqueOptions['现聘职称'].add(item['现聘职称']);
        uniqueOptions['MBTI性格测试类型'].add(item['MBTI性格测试类型']);
    });

    // 填充选项到下拉框
    for (const key in uniqueOptions) {
        const selectElement = document.getElementById(key === '员工状态' ? 'employee-type-select' :
            key === '所学专业' ? 'major-select' :
                key === '学历' ? 'degree-select' :
                    key === '毕业院校' ? 'university-select' :
                        key === '政治面貌' ? 'political-status-select' :
                            key === '婚恋状况' ? 'marital-status-select' :
                                key === '现聘职称' ? 'current-title-select' :
                                    key === 'MBTI性格测试类型' ? 'MBTI-select' : null);

        if (selectElement) {
            uniqueOptions[key].forEach(option => {
                const opt = document.createElement('option');
                opt.textContent = option;
                opt.value = option;
                selectElement.appendChild(opt);
            });
        }
    }
}


async function redirectToResults() {
    const timestamp = new Date().getTime();
    if (pNumber) {
        const queryParams = `?v=${timestamp}&salaryId=${pNumber}&p=${pValue}`;
        const url = `professional-development-employee.html${queryParams}`;

        window.open(url, '_blank');
    } else {
        alert('请先选择人员！');
    }
}

async function updateResults() {
    const inputData = document.getElementById('search-box').value.toLowerCase().trim();
    const resultList = document.getElementById('result-list-all');
    const resultContainer = document.getElementById('result-container');
    const resultInfo = document.getElementById('result-info');
    const resultCount = document.getElementById('result-count');

    const filters = {
        "所学专业": document.getElementById('major-select').value,
        "学历": document.getElementById('degree-select').value,
        "毕业院校": document.getElementById('university-select').value,
        "员工状态": document.getElementById('employee-type-select').value,
        "政治面貌": document.getElementById('political-status-select').value,
        "婚恋状况": document.getElementById('marital-status-select').value,
        "现聘职称": document.getElementById('current-title-select').value,
        "MBTI性格测试类型": document.getElementById('MBTI-select').value
    };

    resultList.innerHTML = '';

    const filteredData = exampleData.filter(item => {
        const matchesInputData = !inputData || item["工资编号"].toString().toLowerCase().includes(inputData) || item["姓名"].toLowerCase().includes(inputData);

        const matchesFilters = Object.entries(filters).every(([key, value]) => {
            return !value || item[key] === value;
        });

        return matchesInputData && matchesFilters;
    });

    if (filteredData.length) {
        filteredData.forEach(item => {
            resultList.appendChild(createListItem(item));
        });

        resultCount.textContent = `共筛选出 ${filteredData.length} 人`;
        resultInfo.style.display = 'block';
        resultContainer.style.display = 'block';
    } else {
        resultInfo.style.display = 'none';
        resultContainer.style.display = 'none';
    }
}


function createListItem(item) {
    const li = document.createElement('li');
    li.className = 'list-group-item-all';
    li.textContent = `工资编号：${item["工资编号"]}， 姓名：${item["姓名"]}， 性别：${item["性别"]}， 单位：${item["单位"]}， 状态：${item["员工状态"]}`;

    li.onclick = function () {
        document.getElementById('search-box').value = `${item["工资编号"]} - ${item["姓名"]}`;
        pNumber = item["Fpersonid"];
        updateResults(); // 更新结果
    };

    return li;
}

// 显示错误信息
function showErrorMessage() {
    document.querySelector('.background-container').style.display = 'none';
    document.getElementById('search-container').style.display = 'none';
}