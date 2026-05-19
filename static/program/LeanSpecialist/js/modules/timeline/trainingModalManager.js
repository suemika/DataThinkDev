/**
 * 培训课程模态框管理器
 * 负责培训课程模态框的初始化和内容渲染
 * 提供模态框显示时的动态内容加载功能
 */
import { getAppState } from '../appState.js';

/**
 * 设置培训课程模态框
 * 初始化模态框的事件监听和内容渲染
 */
export function setupTrainingModal() {
    const { trainingCourses } = getAppState();
    const modalElement = document.getElementById('trainingCoursesModal');

    if (!modalElement) return;

    modalElement.addEventListener('show.bs.modal', () => {
        renderTrainingModalContent(trainingCourses);
    });
}

/**
 * 渲染培训课程模态框内容
 * 动态生成课程列表并更新模态框显示
 * @param {Array} courses - 培训课程数据数组
 */
function renderTrainingModalContent(courses = []) {
    const container = document.getElementById('coursesTableContainer');
    const loading = document.getElementById('loadingIndicator');
    const emptyState = document.getElementById('emptyState');
    const tbody = document.getElementById('coursesTableBody');
    const countElement = document.getElementById('coursesCount');

    loading.classList.remove('d-none');
    container.classList.add('d-none');
    emptyState.classList.add('d-none');

    loading.classList.add('d-none');

    if (!courses?.length) {
        emptyState.classList.remove('d-none');
        countElement.textContent = '0';
        return;
    }

    // 清空表格内容
    tbody.innerHTML = '';

    // 使用安全的DOM操作渲染培训课程列表
    courses.forEach((course, index) => {
        const row = document.createElement('tr');
        
        // 创建序号单元格
        const numberCell = document.createElement('td');
        numberCell.className = 'text-center fw-bold text-muted';
        numberCell.textContent = index + 1;
        row.appendChild(numberCell);
        
        // 创建课程名称单元格
        const nameCell = document.createElement('td');
        const nameContainer = document.createElement('div');
        nameContainer.className = 'd-flex align-items-center';
        
        const icon = document.createElement('i');
        icon.className = 'bi bi-journal-text fs-5 text-primary me-3';
        nameContainer.appendChild(icon);
        
        const courseNameContainer = document.createElement('div');
        courseNameContainer.className = 'course-name';
        
        const courseName = document.createElement('h6');
        courseName.className = 'mb-0';
        courseName.textContent = course.name || '未命名课程';
        courseNameContainer.appendChild(courseName);
        
        nameContainer.appendChild(courseNameContainer);
        nameCell.appendChild(nameContainer);
        row.appendChild(nameCell);
        
        // 创建完成时间单元格
        const dateCell = document.createElement('td');
        dateCell.className = 'text-end';
        
        const dateInfo = document.createElement('div');
        dateInfo.className = 'text-muted small';
        dateInfo.textContent = course.completedAt || '无记录';
        dateCell.appendChild(dateInfo);
        row.appendChild(dateCell);
        
        // 将行添加到表格
        tbody.appendChild(row);
    });

    countElement.textContent = courses.length;
    container.classList.remove('d-none');
}