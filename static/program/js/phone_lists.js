let userName = '';
let previousSearchValue = ''; // 记录上一次的输入框值
let data;
let token = '';

// 数据获取
function fetchData() {
    return axios.post('/imc/customOpt', {
        req: '475',
        data: {}
    })
        .then(function (response) {
            data = response.data.data.data;
            populateDepartmentDropdown(data);
            generateTable(data);
        })
        .catch(function (error) {
            console.error('Error fetching data:', error);
            document.getElementById('table-container').innerText = '获取数据失败，请稍后重试。';
        });
}

window.onscroll = function () {
    toggleBackToTopButton();
};

function populateDepartmentDropdown(data) {
    const buttonsContainer = document.getElementById('department-buttons');
    buttonsContainer.innerHTML = ''; // 清空按钮容器

    // 生成 "全部" 按钮
    let allButton = document.createElement('button');
    allButton.className = 'dept-btn';
    allButton.innerHTML = '<i class="bi bi-collection me-1"></i>全部';
    allButton.onclick = () => filterAllDepartments();
    buttonsContainer.appendChild(allButton);

    // 生成所有部门按钮
    data.forEach(department => {
        if (department.is_visible) {
            let button = document.createElement('button');
            button.className = 'dept-btn';
            button.innerHTML = `<i class="bi bi-building me-1"></i>${department.name}`;
            button.onclick = () => showRelatedDepartments(department.name);
            buttonsContainer.appendChild(button);
        }
    });
}

function showRelatedDepartments(departmentName) {
    const detailsContainer = document.getElementById('table-container');
    detailsContainer.innerHTML = '';

    const department = data.find(d => d.name === departmentName);
    if (department) {
        const table = createDepartmentTable(department);
        detailsContainer.appendChild(table);

        const overlay = document.createElement('div');
        overlay.classList.add('table-overlay');
        table.appendChild(overlay);
        setBackgroundWatermarkOnElement(overlay, userName);

        department.relatedDepartments.forEach(relatedDeptName => {
            const relatedDepartment = data.find(d => d.name === relatedDeptName);
            if (relatedDepartment) {
                const relatedTable = createDepartmentTable(relatedDepartment);
                detailsContainer.appendChild(relatedTable);

                const relatedOverlay = document.createElement('div');
                relatedOverlay.classList.add('table-overlay');
                relatedTable.appendChild(relatedOverlay);
                setBackgroundWatermarkOnElement(relatedOverlay, userName);
            }
        });
    }
}

function filterAllDepartments() {
    document.getElementById('search-box').value = '';
    generateTable(data);
}

async function fetchWatermark() {
    try {
        const response = await axios.post('/imc/customOpt', {
            req: '476',
            data: JSON.stringify(token)
        });
        const watermarkText = response.data.msg;
        if (watermarkText) {
            userName = watermarkText;
            await fetchData(); // Await fetchData to ensure data is loaded before hiding overlay
        } else {
            console.error('Error fetching watermark text:', response.data.data.msg);
            showErrorMessage();
            redirectToErrorPage();
        }
    } catch (error) {
        console.error('Error in fetchWatermark:', error);
        showErrorMessage();
        redirectToErrorPage();
    } finally {
        // Hide the loading overlay here, after all data is fetched and processed
        util.loading.hide();
    }
}

function showErrorMessage() {
    document.querySelector('.background-container').style.display = 'none';
    document.querySelector('.search-card').style.display = 'none';
    document.getElementById('table-container').style.display = 'none';
    document.getElementById('department-wrapper').style.display = 'none';
    const mainContent = document.getElementById('main-content');
    if (mainContent) { // 检查 mainContent 是否存在
        mainContent.style.display = 'none';
    }
    const feedbackContainer = document.getElementById('feedbackContainer');
    if (feedbackContainer) { // 只有当 feedbackContainer 存在时才设置样式
        feedbackContainer.style.display = 'none';
    }
}

function createDepartmentTable(department) {
    var table = document.createElement('table');
    table.classList.add('department-table', 'shadow-sm');

    var thead = document.createElement('thead');
    var tbody = document.createElement('tbody');

    // 创建表头
    var thRow = document.createElement('tr');
    var th1 = document.createElement('th');
    th1.innerHTML = `<i class="bi bi-building me-2"></i>${department.name}`;
    th1.colSpan = 5;
    th1.classList.add('centered-header');
    thRow.appendChild(th1);
    thead.appendChild(thRow);

    var th2Row = document.createElement('tr');
    var th2 = document.createElement('th');
    th2.innerHTML = '<i class="bi bi-person-badge me-1"></i>岗位';
    th2.classList.add('position-column');
    var th3 = document.createElement('th');
    th3.innerHTML = '<i class="bi bi-person-vcard me-1"></i>姓名';
    th3.classList.add('name-column');
    var th4 = document.createElement('th');
    th4.innerHTML = '<i class="bi bi-fonts me-1"></i>简拼';
    th4.classList.add('pinyin-column');
    th4.style.display = 'none';
    var th5 = document.createElement('th');
    th5.innerHTML = '<i class="bi bi-telephone me-1"></i>座机';
    th5.classList.add('landline-column');
    var th6 = document.createElement('th');
    th6.innerHTML = '<i class="bi bi-phone me-1"></i>手机';
    th6.classList.add('mobile-column');

    th2Row.appendChild(th2);
    th2Row.appendChild(th3);
    th2Row.appendChild(th4);
    th2Row.appendChild(th5);
    th2Row.appendChild(th6);
    thead.appendChild(th2Row);

    department.numbers.forEach(function (number) {
        var tr = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.innerHTML = number.position ? `<i class="bi bi-person-badge me-1"></i>${number.position}` : '';
        td1.classList.add('position-column');
        var td2 = document.createElement('td');
        td2.innerHTML = number.name ? `<i class="bi bi-person me-1"></i>${number.name}` : '';
        td2.classList.add('name-column');

        var td3 = document.createElement('td');
        td3.innerText = number.initials;
        td3.classList.add('pinyin-column');
        td3.style.display = 'none';

        // 座机列
        var td4 = document.createElement('td');
        if (number.landline && number.landline !== '无') {
            if (window.innerWidth < 768) {
                td4.innerHTML = `<a href="tel:${number.landline}" class="text-decoration-none"><i class="bi bi-telephone me-1"></i>${number.landline}</a>`;
            } else {
                td4.innerHTML = `<i class="bi bi-telephone me-1"></i>${number.landline}`;
            }
        } else {
            td4.innerHTML = ''; // 空值显示为空
        }
        td4.classList.add('landline-column');

        // 手机列
        var td5 = document.createElement('td');
        if (number.mobile && number.mobile !== '无') {
            if (window.innerWidth < 768) {
                td5.innerHTML = `<a href="tel:${number.mobile}" class="text-decoration-none"><i class="bi bi-phone me-1"></i>${number.mobile}</a>`;
            } else {
                td5.innerHTML = `<i class="bi bi-phone me-1"></i>${number.mobile}`;
            }
        } else {
            td5.innerHTML = ''; // 空值显示为空
        }
        td5.classList.add('mobile-column');

        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

function generateTable(data) {
    var tableContainer = document.getElementById('table-container');
    tableContainer.innerHTML = '';

    data.forEach(function (department) {
        const table = createDepartmentTable(department);
        tableContainer.appendChild(table);

        var overlay = document.createElement('div');
        overlay.classList.add('table-overlay');
        table.appendChild(overlay);
        setBackgroundWatermarkOnElement(overlay, userName);
    });
}

function setBackgroundWatermarkOnElement(element, text) {
    var svgImage = `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="230" height="130"%3E%3Ctext x="0" y="100" font-family="PingFang SC,microsoft yahei,sans-serif;" font-size="18" fill="rgba(0,0,0,0.1)" transform="rotate(-25)"%3E${text}%3C/text%3E%3C/svg%3E')`;
    element.style.backgroundImage = svgImage;
}

function filterTable() {
    var input = document.getElementById('search-box');
    var filter = input.value.toLowerCase().replace(/\s+/g, '');

    if (filter === previousSearchValue) {
        return;
    }

    previousSearchValue = filter;
    saveQueryData(filter);

    var tables = document.getElementsByClassName('department-table');
    var hasMatches = false;

    Array.from(tables).forEach(function (table) {
        var th = table.querySelector('thead th');
        var departmentName = th.textContent.toLowerCase();
        var rows = table.getElementsByTagName('tr');
        var tableHasMatches = false;

        Array.from(rows).slice(2).forEach(row => {
            row.style.display = '';
            // 只清除高亮标记，保留电话链接等 HTML
            Array.from(row.cells).forEach(cell => {
                cell.innerHTML = cell.innerHTML.replace(/<span class="highlight">(.*?)<\/span>/gi, '$1');
            });
        });

        if (departmentName.includes(filter)) {
            tableHasMatches = true;
            hasMatches = true;
        }

        Array.from(rows).slice(2).forEach(row => {
            const cells = Array.from(row.cells).map(cell => cell.textContent.toLowerCase());
            const pinyinCell = row.cells[2];
            const nameCell = row.cells[1];

            const isPinyinSearch = /^[a-zA-Z]+$/.test(filter);
            let matchFound = cells.some(text => text.includes(filter));

            if (isPinyinSearch && pinyinCell) {
                const pinyinMatch = pinyinCell.textContent.toLowerCase().includes(filter);
                if (pinyinMatch) {
                    matchFound = true;
                }
            }

            if (matchFound) {
                tableHasMatches = true;
                hasMatches = true;

                if (isPinyinSearch) {
                    highlightCell(nameCell);
                }

                Array.from(row.cells).forEach(cell => {
                    highlightText(cell, filter);
                });
            } else {
                row.style.display = 'none';
            }
        });

        table.style.display = tableHasMatches ? '' : 'none';
    });

    const noDataMessage = document.getElementById('no-data-message');
    noDataMessage.style.display = hasMatches ? 'none' : 'flex';
}

function highlightCell(cell) {
    cell.innerHTML = `<span class="highlight">${cell.innerText}</span>`;
}

function highlightText(cell, filter) {
    var text = cell.innerText;
    // 转义正则特殊字符
    var escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp(`(${escapedFilter})`, 'gi');

    if (regex.test(text)) {
        var newText = text.replace(regex, '<span class="highlight">$1</span>');
        cell.innerHTML = newText;
    }
}

async function saveQueryData(filter) {
    const formData = new FormData();
    formData.append('sourceAddress', getCurrentUrl());
    formData.append('fromName', 'saveQueryData');
    formData.append('userName', userName);
    formData.append('queryData', filter);

    try {
        const response = await fetchDataFromAPI('647', Object.fromEntries(formData));
    } catch (error) {
        console.error('反馈提交失败:', error);
    }
}

let resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        if (data) generateTable(data);
    }, 300);
});

document.addEventListener('DOMContentLoaded', async function () {
    // 绑定搜索事件
    document.getElementById('submitBtn').addEventListener('click', filterTable);
    document.getElementById('search-box').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') filterTable();
    });

    util.loading.show();
    token = getNameFromUrl('token');
    if (token) {

        // 有 token：走水印认证流程
        await fetchWatermark();

    } else {
        util.loading.hide();
        showErrorMessage();
        redirectToErrorPage();
    }
});