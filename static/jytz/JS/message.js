// DOM元素
const listPage = document.getElementById('list-page');
const detailPage = document.getElementById('detail-page');
const messageList = document.getElementById('message-list');
const detailContent = document.getElementById('detail-content');
const backButton = document.getElementById('back-button');

// 初始化消息列表
function renderMessageList() {
    messageList.innerHTML = '';
    messages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${message.read ? '' : 'unread'}`;
        messageItem.dataset.id = message.id;

        messageItem.innerHTML = `
                    <div class="message-header">
                        <span class="message-title">${message.title}</span>
                        <span class="message-time">${message.addtime}</span>
                    </div>
                    <p class="message-preview">${message.content}</p>
                    ${message.read ? '' : '<div class="message-status unread"></div>'}
                `;
        // <p class="message-preview">${message.content.substring(0, 50)}...</p>
        // messageItem.addEventListener('click', () => showMessageDetail(message.id));
        messageList.appendChild(messageItem);
    });
}

// 显示消息详情
function showMessageDetail(id) {
    const message = messages.find(msg => msg.id === id);
    if (!message) return;

    // 标记为已读
    message.read = true;

    // 更新详情内容
    detailContent.innerHTML = `
                <div class="detail-header">
                    <span class="detail-title">${message.title}</span>
                    <span class="detail-time">${message.time}</span>
                </div>
                <div class="detail-content">${message.content}</div>
            `;

    // 切换页面
    listPage.classList.remove('active');
    detailPage.classList.add('active');

    // 重新渲染列表以更新已读状态
    renderMessageList();
}

// 返回消息列表
function backToList() {
    detailPage.classList.remove('active');
    listPage.classList.add('active');
}

// 事件监听
backButton.addEventListener('click', backToList);

// 调用接口获取消息列表
async function getMsgList() {
    const formData = new FormData();
    formData.append('req', 765);
    formData.append('data', openid);
    // formData.append('data', '[{"openid": "olkro4vTS6_U7Mhz5YRb0xhQPars"}]');//TODO

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
        if (result.data?.data?.length !== 0) {
            messages = result.data.data;
            renderMessageList()
        }
    } catch (error) {
        console.error('请求失败:', error);
    }
}

let messages = [];
// 初始化
getMsgList();
const openid = getUrlParam('openid');
function getUrlParam(key) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
}