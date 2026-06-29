// 存储所有人员和已选项
let allPersons = [];
const selectedPersons = new Set();

// 新增：全局保存最终选中的【员工编码】
let selectedPersonCodes = [];

// 打开弹框
function openModal() {
    document.getElementById('personModal').style.display = 'block';
    // 第一次打开时加载数据
    if (allPersons.length === 0) {
        loadPersons();
    } else {
        renderOptions();
        updateTags();
    }
}

// 关闭弹框
function closeModal() {
    document.getElementById('personModal').style.display = 'none';
}

// 调用接口获取人员信息
async function loadPersons() {
    // 模拟异步请求
    // await new Promise(r => setTimeout(r, 300));
    // allPersons = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安", "南京", "重庆"];
    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '加载中...';

    // 创建 FormData 对象
    const formData = new FormData();
    formData.append('req', 'm968Req');
    formData.append('page', '1');
    formData.append('rows', '100');
    formData.append('order', 'desc');
    formData.append('filterRules', '[{}]'); // 注意：虽然是 JSON 字符串，但作为字段传
    formData.append('pid', ''); // 空值也要传

    try {
        const response = await fetch('https://ems.sdstg.com/imc/queryDataAll/m968Req', {
            method: 'POST',
            body: formData,  // 自动设置 Content-Type 为 multipart/form-data
        });

        // 检查 HTTP 状态
        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // console.log(data);

        // 验证返回数据结构
        if (!data || typeof data.total !== 'number' || !Array.isArray(data.rows)) {
            throw new Error('接口返回数据格式异常，缺少 total 或 rows');
        }

        // 提取所有“姓名”字段
        allPersons = data.rows.filter(person => person['姓名']); // 保留完整对象，过滤空姓名
        console.log(allPersons);
        
        // 加载完成后渲染选项
        renderOptions();
    } catch (error) {
        console.error('加载人员数据失败:', error);
        optionsEl.innerHTML = `<div style="color: red; font-size: 12px;">加载失败: ${error.message}</div>`;
    }
}

// 渲染选项（支持搜索过滤）
function renderOptions() {
    const container = document.getElementById('options');
    const filter = document.getElementById('searchInput').value.toLowerCase();

    // 过滤出匹配的姓名
    const filtered = allPersons.filter(person =>
        person['姓名'].toLowerCase().includes(filter)
    );

    container.innerHTML = '';
    filtered.forEach(person => {
        const name = person['姓名'];
        const div = document.createElement('div');
        div.className = 'option' + (selectedPersons.has(person.openid) ? ' selected' : '');
        div.textContent = name;
        div.onclick = () => togglePerson(name);
        container.appendChild(div);
    });
}

// 切换选中状态
function togglePerson(personName) {
    const person = allPersons.find(p => p['姓名'] === personName);
    if (!person) return;

    const code = person.openid;

    if (selectedPersons.has(code)) {
        selectedPersons.delete(code);
    } else {
        selectedPersons.add(code);
    }

    updateTags();
    renderOptions();
}

// 更新标签
function updateTags() {
    const tagsContainer = document.getElementById('tags');
    tagsContainer.innerHTML = '';
    selectedPersons.forEach(code => {
        const person = allPersons.find(p => p.openid === code);
        if (!person) return;

        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `${person['姓名']} <button onclick="removePerson('${code}')">×</button>`;
        tagsContainer.appendChild(tag);
    });
}

// 移除标签
function removePerson(code) {
    selectedPersons.delete(code);
    updateTags();
    renderOptions();
}

// 搜索过滤
function filterOptions() {
    renderOptions();
}

// 提交并关闭
function submitSelection() {
    if (selectedPersons.size === 0) {
        alert("请至少选择一个人员！");
        return;
    }

    // 获取姓名和编码
    const selectedData = allPersons.filter(p => selectedPersons.has(p.openid));
    const names = selectedData.map(p => p['姓名']);
    const codes = selectedData.map(p => p.openid);

    // 保存到全局变量，供“发送”使用
    selectedPersonCodes = codes;

    // 回填到输入框
    document.getElementById('persons').value = names.join(', ');

    // 关闭弹窗
    closeModal();
}

//插入通知
async function insertNotification() {
    const title = document.getElementById('title').value;
    const source = document.getElementById('source').value;
    const requirements = document.getElementById('requirements').value;
    const date = document.getElementById('date').value;
    const addtime = formatDateTime();

    if (requirements === '') {
        alert('请填写工作要求');
        return;
    }

    // 从 allPersons 中提取完整信息
    const selectedData = allPersons.filter(p => selectedPersonCodes.includes(p.openid));
    const arrs = selectedData.map(data => (
        {
            title: title,
            source: source,
            content: requirements,
            deadline: date,
            addtime: addtime,
            openid: data.openid
        }
    ));

    const formData = new FormData();
    formData.append('req', 762);
    formData.append('data', JSON.stringify(arrs));

    // for (let [key, value] of formData.entries()) {
    //     console.log(key, value);
    // }

    try {
        const response = await fetch('https://www.shtggroup.com/imc/customOpt', {
            method: 'POST',
            body: formData
        });

        // 检查 HTTP 状态
        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (result.msg == '插入成功') {
            sendNotification();
        } else {
            console.log('插入失败:' + result.msg);
        }
    } catch (error) {
        console.error('请求失败:', error);
    }
}

// 发送通知
async function sendNotification() {
    // 从 allPersons 中提取完整信息
    const selectedData = allPersons.filter(p => selectedPersonCodes.includes(p.openid));
    const arrs = selectedData.map(data => (
        {
            new_openid: data['公众号openid']
        }
    ));

    const formData = new FormData();
    formData.append('req', 764);
    formData.append('data', JSON.stringify(arrs));

    try {
        const response = await fetch('https://www.shtggroup.com/imc/customOpt', {
            method: 'POST',
            body: formData
        });

        // 检查 HTTP 状态
        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(result);
        if (result.msg.includes('发送成功')) {
            alert('发送成功');
        } else {
            console.log('发送失败:' + result.msg);
        }
    } catch (error) {
        console.error('请求失败:', error);
    }
}

function formatDateTime() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以+1
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}