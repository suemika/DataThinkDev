/**
 * 时间线渲染器模块
 * 负责将处理后的时间线数据渲染到DOM中
 * 包含时间线主体渲染和培训课程模态框处理功能
 */
import { domCache } from '../domCache.js';
import { getAppState, setAppState } from '../appState.js';
import { processTimelineData } from './timelineDataProcessor.js';
import { createTimelineItem } from './timelineTemplates.js';
import { updateTimelineContainerClass } from './timelineDomHelper.js';

/**
 * 渲染时间线
 * @param {Array} roleData - 角色相关的时间线数据
 * @param {string} role - 当前用户角色
 */
export function renderTimeline(roleData, role) {
    // 更新时间线容器的CSS类以适应不同状态
    updateTimelineContainerClass(roleData);

    // 创建文档片段提高性能，避免频繁DOM操作
    const fragment = document.createDocumentFragment();
    roleData.forEach(item => {
        // 根据时间线数据项创建DOM元素
        const element = createTimelineItem(item, role);
        if (element) fragment.appendChild(element);
    });

    // 清空容器并添加新的时间线内容
    domCache.timelineContainer.innerHTML = '';
    domCache.timelineContainer.appendChild(fragment);

    // 处理培训课程模态框的显示逻辑
    handleTrainingModal(roleData);
}

/**
 * 处理培训课程模态框
 * @param {Array} roleData - 角色相关的时间线数据
 */
function handleTrainingModal(roleData) {
    const state = getAppState();
    
    // 检查是否存在课程实训任务审核阶段
    const hasTrainingStage = roleData.some(item =>
        item.stage_name === "课程实训任务审核"
    );

    if (hasTrainingStage && state.trainingCourses) {
        // 获取模态框相关DOM元素
        const container = document.getElementById('coursesTableContainer');
        const tbody = document.getElementById('coursesTableBody');
        const countElement = document.getElementById('coursesCount');

        if (container && tbody && countElement) {
            // 动态生成课程表格内容
            tbody.innerHTML = state.trainingCourses.map((course, index) => `
                <tr>
                <td class="text-center fw-bold text-muted">${index + 1}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-journal-text fs-5 text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">${course.name || '未命名课程'}</h6>
                        </div>
                    </div>
                </td>
                <td class="text-end">
                    <div class="text-muted small">${course.completedAt || '无记录'}</div>
                </td>
            </tr>
            `).join('');

            // 更新课程数量显示
            countElement.textContent = state.trainingCourses.length;
            // 显示课程表格容器
            container.classList.remove('d-none');
        }

        // 更新状态标记模态框已初始化
        setAppState({ trainingModalInitialized: true });
    }
}
