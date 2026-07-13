document.addEventListener("DOMContentLoaded", fetchWatermark);

const Com_Parameter = {
    OptFailureInfo: "未检索到查看权限，即将跳转登录页面。",
    UrlParamsInfo: "未找到参数 p，显示错误信息",
    ServerPrefix: "http://edi.sdstg.com",
    ServerFailure: "未找到数据",
};

let personData; // 个人数据
let exampleData; // 示例数据
let pNumber; // 工资编号

const elements = {
    noDataMessage: document.getElementById('no-data-message'),
    searchBox: document.getElementById('search-box'),
    // 更多需要用的元素
};

// 通用 AJAX 请求函数
async function fetchDataFromAPI(req, data) {
    const response = await axios.post('/imc/customOpt', {
        req,
        data: JSON.stringify(data),
    });
    return response.data;
}

// 获取权限
async function fetchWatermark() {
    const urlParams = new URLSearchParams(window.location.search);
    const pValue = urlParams.get('p');

    // if (!pValue) {
    //     console.error(Com_Parameter.UrlParamsInfo);
    //     showErrorMessage();
    //     return redirectToErrorPage();
    // }

    try {
        const response = await fetchDataFromAPI('556', pValue);
        if (response.data.status === 0) {
            await fetchData();
        } else {
            console.error('Error fetching watermark text:', response.data.msg);
            showErrorMessage();
            redirectToErrorPage();
        }
    } catch (error) {
        console.error('Error fetching watermark:', error);
        showErrorMessage();
        redirectToErrorPage();
    }
}

// 获取数据
async function fetchData() {

    try {
        const response = await fetchDataFromAPI('561', {});
        if (response.data) {
            exampleData = response.data.data;
            showExampleResults();
        } else {
            clearPersonData();
            showMessage(elements.noDataMessage, '无数据');
        }
    } catch (error) {
        console.error('服务器错误', error);
        clearPersonData();
        showMessage(elements.noDataMessage, '无法获取数据');
    }
}

// 创建列表项
function createListItem(item) {
    const li = document.createElement('li');
    li.className = 'list-group-item-all';
    li.textContent = `工资编号：${item["工资编号"]}， 姓名：${item["姓名"]}， 状态：${item["员工状态"]}`;

    li.onclick = function () {
        document.getElementById('search-box').value = `${item["工资编号"]} - ${item["姓名"]} - ${item["员工状态"]}`;
        pNumber = item["工资编号"];
        document.getElementById('result-container').style.display = 'none';
    };

    return li;
}

// 显示示例结果
function showExampleResults() {
    const resultContainer = document.getElementById('result-container');
    const resultList = document.getElementById('result-list-all');

    resultList.innerHTML = '';
    resultContainer.style.display = 'block';

    exampleData.forEach(item => {
        const li = createListItem(item);
        resultList.appendChild(li);
    });
}

// 过滤结果
function filterResults() {

    const input = document.getElementById('search-box');
    const inputData = input.value.toLowerCase();
    const resultContainer = document.getElementById('result-container');
    const resultList = document.getElementById('result-list-all');
    clearNoDataMessage();
    resultList.innerHTML = '';
    resultContainer.style.display = 'block';
    pNumber = '';

    if (inputData) {
        const filteredData = exampleData.filter(item => {
            return item["工资编号"].toString().toLowerCase().includes(inputData) ||
                item["姓名"].toLowerCase().includes(inputData);
        });

        if (filteredData.length > 0) {
            filteredData.forEach(item => {
                const li = createListItem(item);
                resultList.appendChild(li);
            });
            resultContainer.style.display = 'block';
        } else {
            showNoDataMessage();
            resultContainer.style.display = 'none';
        }
    } else {
        resultContainer.style.display = 'none';
    }
}

// 获取工资编号
async function filterPersonNumber() {
    const inputData = pNumber;
    document.getElementById("profile-photo").src = 'logo/logo_white.png';
    if (inputData) {
        showLoading();
        clearNoDataMessage();
        try {
            const response = await fetchDataFromAPI('552', [{"personFid": inputData}]);
            if (response.data.msg) {
                clearNoDataMessage();
                personData = response.data.data[0];
                filterTable(personData);
            } else {
                errorMessage();
                console.error(Com_Parameter.ServerFailure + response.data.msg);
            }
        } catch (error) {
            console.error(Com_Parameter.ServerFailure + inputData);
            errorMessage();
        }
    } else {
        errorMessage();
    }
}

//表格内容
function filterTable(personFid) {
    let fNumber = personData["工资编号"];
    showLoading(); // 显示加载提示

    // 获取列表数据、头像和基本信息的顺序执行
    Promise.all([
        fetchPersonData(fNumber),
        fillPersonListData(fNumber),
        fetchPhotoData(fNumber)

    ])
        .then(() => {
            clearNoDataMessage(); // 隐藏无数据提示框
        })
        .catch((error) => {
            fetchPersonData(personFid).catch(handleError);
        })
        .finally(hideLoading); // 无论是否成功都隐藏加载提示
}

// 填充个人基本数据
function fetchPersonData(personFid) {
    return axios.post('/imc/customOpt', {
        req: '549',
        data: JSON.stringify([{"personFid": personFid}])
    })
        .then(function (response) {
            // 更新基本信息显示
            if (response.data) {
                personData = response.data.data.data[0];
                setTextContent("salary-number", personData["工资编号"]);
                setTextContent("name", personData["姓名"]);
                setTextContent("native-place", personData["籍贯"]);
                setTextContent("university", personData["毕业院校"]);
                setTextContent("major", personData["所学专业"]);
                setTextContent("political-status", personData["政治面貌"]);
                setTextContent("position", personData["岗位"]);
                setTextContent("employee-type", personData["员工状态"]);
                setTextContent("graduation-time", personData["毕业时间"]);
                setTextContent("work-experience", personData["工作年限"]);
                setTextContent("unit", personData["培养单位"]);
                setTextContent("marital-status", personData["婚恋状况"]);
                setTextContent("department", personData["车间或科室"]);
                setTextContent("self-evaluation", personData["个人2年期满自我评价"]);
                setTextContent("mentor", personData["专业导师"]);
                setTextContent("instructor-1", personData["指导老师1"]);
                setTextContent("instructor-2", personData["指导老师2"]);
                setTextContent("career-plan", personData["个人3至5年职业规划"]);
                setTextContent("mbti", personData["MBTI性格测试类型"]);
                setTextContent("intelligence-test", personData["智力测试情况"]);
                setTextContent("career-interest", personData["霍兰德职业兴趣类型"]);
                setTextContent("interview-evaluation", personData["面试情况评价"]);
                setTextContent("current-title", personData["现聘职称"]);
                setTextContent("qualification", personData["职称资格"]);
                setTextContent("current-job", personData["从事职种"]);
                setTextContent("hire-time", personData["聘任时间"]);
                setTextContent("qualification-time", personData["资格取得时间"]);
                setTextContent("career-plan", personData["个人3至5年职业规划"]);
                document.getElementById("training-evaluation").innerHTML = personData["科室技能培训"] || "无";
                document.getElementById("training-induction").innerHTML = personData["入厂培训"] || "无";
            }
        })
        .catch(function (error) {
            fetchPersonData(personFid).catch(handleError);
        });
}

function handleError(error) {
    console.error(error);
    showNoDataMessage(); // 显示“无数据”信息
}

// 列表数据获取
function fillPersonListData(personFid) {
    return axios.post('/imc/customOpt', {
        req: '550',
        data: JSON.stringify([{"personFid": personFid}])
    })
        .then(function (response) {
            if (response.data) {
                personData = response.data.data.data;
                populateTable("awards-table", personData.awards);
                populateTable("penalties-table", personData.penalties);
                populateTable("performance-table", personData.performance);
                populateTable_evaluation("evaluation-table", personData.evaluation);
            }
        })
        .catch(function (error) {
            fetchPersonData(personFid).catch(handleError);
        });
}

function populateTable_evaluation(tableId, items) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = ''; // 清空之前的内容

    items.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${item.类型}</td><td>${item.应知}</td><td>${item.应会}</td><td>${item.师傅评价}</td><td>${item.业绩}</td>`;
        tableBody.appendChild(row);
    });
}

function populateTable(tableId, items) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = ''; // 清空之前的内容

    items.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${item.项目 || item.年份}</td><td>${item.金额 || item.排序}</td><td>${item.日期 || item.定性}</td>`;
        tableBody.appendChild(row);
    });
}


function clearPopulateTable(tableId) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = ''; // 清空之前的内容

}

// 头像数据获取
function fetchPhotoData(personFid) {
    return axios.post('/imc/customOpt', {
        req: '551',
        data: JSON.stringify([{"personFid": personFid}])
    })
        .then(function (response) {
            const data = response.data.data;

            updateProfilePhoto(data.base64_string);
        })
        .catch(function (error) {
            fetchPersonData(personFid).catch(handleError);
        });
}

function updateProfilePhoto(base64Image) {
    if (base64Image) {
        const fullBase64Image = `data:image/jpeg;base64,${base64Image}`;
        document.getElementById('profile-photo').src = fullBase64Image;
    } else {
        console.error('未获取到有效的Base64图片数据');
    }
}

// 显示错误信息
function showErrorMessage() {
    document.querySelector('.background-container').style.display = 'none';
    document.querySelector('.container-fluid').style.display = 'none';
    document.getElementById('search-container').style.display = 'none';
}

function setTextContent(id, value) {
    document.getElementById(id).textContent = value || "未填写";
}

// 显示没有数据的消息
function showNoDataMessage() {
    showMessage('no-data-message', Com_Parameter.ServerFailure);
}

// 清空没有数据的消息
function clearNoDataMessage() {
    const noDataMessage = document.getElementById("no-data-message");
    noDataMessage.style.display = "none";
}

// 清空个人数据
function clearPersonData() {
    const fields = [
        "salary-number", "name", "native-place", "university", "major",
        "political-status", "position", "graduation-time", "work-experience",
        "unit", "marital-status", "department", "self-evaluation", "mentor",
        "instructor-1", "instructor-2", "evaluation", "mbti",
        "intelligence-test", "career-interest", "interview-evaluation",
        "current-title", "qualification", "current-job", "hire-time",
        "qualification-time", "career-plan","employee-type"
    ];

    fields.forEach(id => {
        document.getElementById(id).textContent = '';
    });
    document.getElementById("training-evaluation").innerHTML = '';
    document.getElementById("training-induction").innerHTML = '';
    document.getElementById("awards-table").innerHTML = '';
    document.getElementById("penalties-table").innerHTML = '';
    document.getElementById("performance-table").innerHTML = '';
    document.getElementById("evaluation-table").innerHTML = '';
}

function errorMessage() {
    clearPersonData(); // 清空页面内容
    hideLoading(); // 隐藏加载提示
    showNoDataMessage(); // 显示“无数据”信息
}

// 显示加载提示
function showLoading() {
    document.getElementById("loading").style.display = "block";
}

// 隐藏加载提示
function hideLoading() {
    document.getElementById("loading").style.display = "none";
}

// 显示或隐藏消息
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
}
