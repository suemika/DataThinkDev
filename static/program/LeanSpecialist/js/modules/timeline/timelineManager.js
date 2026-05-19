/**
 * 时间线管理器模块
 * 负责生成用户认证时间线和管理培训课程模态框
 */
import {processTimelineData} from './timelineDataProcessor.js';
import {renderTimeline} from './timelineRenderer.js';
import {ButtonManager} from '../buttonManager.js';
import {ApiService} from '../apiService.js';
import {getAppState, setAppState} from '../appState.js';

/**
 * 时间线管理器
 * 提供生成时间线和填充培训模态框的功能
 */
export const TimelineManager = {
    /**
     * 生成时间线
     * @param {string} userName - 用户名
     * @param {string} currentRole - 当前角色
     */
    async generateTimeline(userName, currentRole) {
        // 查询用户数据
        const {currentData: loadedData, userStatus: loadedStatus} =
            await ApiService.queryUserData(userName, currentRole);
        
        // 更新应用状态
        setAppState({userData: loadedData, userStatus: loadedStatus});
        
        // 处理时间线数据
        const processedData = processTimelineData(loadedData);
        
        // 渲染时间线
        renderTimeline(processedData, currentRole);
        
        // 更新报名按钮状态
        ButtonManager.updateSignupButton(processedData, currentRole);

        // 填充培训模态框数据（暂时注释）
        //this.populateTrainingModal();
    },

    /**
     * 填充培训模态框数据
     * 将培训课程数据渲染到模态框中
     */
    populateTrainingModal() {
        // 从应用状态获取培训课程数据
        const {trainingCourses} = getAppState();
        
        // 获取DOM元素
        const container = document.getElementById('coursesTableContainer');
        const loading = document.getElementById('loadingIndicator');
        const emptyState = document.getElementById('emptyState');
        const tbody = document.getElementById('coursesTableBody');
        const countElement = document.getElementById('coursesCount');

        // 显示加载状态
        loading.classList.remove('d-none');
        container.classList.add('d-none');
        emptyState.classList.add('d-none');

        // 检查是否有培训课程数据
        if (!trainingCourses?.length) {
            // 显示空状态
            loading.classList.add('d-none');
            emptyState.classList.remove('d-none');
            countElement.textContent = '0';
            return;
        }

        // 清空表格内容
        tbody.innerHTML = '';

        // 使用安全的DOM操作渲染培训课程列表
        trainingCourses.forEach((course, index) => {
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

        // 更新课程数量并显示容器
        countElement.textContent = trainingCourses.length;
        loading.classList.add('d-none');
        container.classList.remove('d-none');
    },
};