let currentPage = 1;  // 当前页数
let pageSize = 5;     // 每页显示数量
let totalPages = 2;
// 映射后的列名，按照你希望的顺序排列
const columnMapping = {
    "序号": "序号",
    "任务名称": "任务名称",
    "提报单位": "提报单位",
    "提报人": "提报人",
    "任务类别": "任务类别",
    "任务来源": "任务来源",
    "计划完成日期": "计划完成日期",
    "实际完成日期": "实际完成日期",
    "任务创建日期": "任务创建日期",
    "任务状态": "任务状态",
    "计划总工时": "计划总工时",
    "角色": "角色",
    "分配工时": "分配工时",
    "实际分配工时": "实际分配工时",
    "分工": "分工",
    "是否发起工时调整": "是否发起工时调整",
    "周进度情况": "周进度情况",
    "周完成工时": "周完成工时",
    "提交时间": "提交时间"
};
let allData; // 用于保存全部数据
let personalTaskData; // 用于保存个人任务列表数据
let pieChartData;

document.addEventListener("DOMContentLoaded", function () {
    // 调用 fetchData 函数
    fetchData();
    // 调用 fetchPersonalTaskData 函数
    fetchPersonalTaskData(currentPage, pageSize);
    // 调用 fetchPieChartData 函数
    fetchPieChartData();
    // 设置定时器，时间单位为毫秒，这里设置为每1分钟刷新一次
    setInterval(autoRefresh, 60 * 1000);

});

// 定时刷新页面函数
function autoRefresh() {
    location.reload(); // 刷新页面
}

// 数据获取
function fetchData() {
    // 发起 GET 请求获取数据
    axios.post('/imc/customOpt', {
        req: '384',
        data: {}
    })
        .then(function (response) {
            // console.log('响应数据:', response.data.data);
            // 处理返回的数据
            const data = response.data.data.data;
            displayData(data);
        })
        .catch(function (error) {
            console.error('Error fetching data:', error);
        });
}

// 在 updatePersonalTaskData 函数中，调用回调函数以处理个人数据的可见性
//更新个人数据
function updatePersonalTaskData(page, size) {
    // 调用显示个人任务列表的函数
    displayPersonalTaskTable(personalTaskData, size, page);

    // 调用显示分页导航栏的函数
    displayPagination(personalTaskData.length);
}

// 修改fetchPersonalTaskData函数，添加回调函数用于根据数据是否存在来显示或隐藏个人任务相关元素
function fetchPersonalTaskData(currentPage, pageSize) {
    axios.post('/imc/customOpt', {
        req: '385',
        data: {}
    })
        .then(function (response) {
            if (response.data) {
                personalTaskData = response.data.data.data;
                $('#paginationSection').show();
                $('#paginationSection1').show();
                $('#paginationSection2').show();
                updatePersonalTaskData(currentPage, pageSize);
            } else {
                $('#paginationSection').hide();
                $('#paginationSection1').hide();
                $('#paginationSection2').hide();
                console.warn('No data received from the server.');
            }
        })
        .catch(function (error) {
            console.error('Error fetching personal task data:', error);
        });
}

// 显示个人任务列表的函数
function displayPersonalTaskTable(data, pageSize, currentPage) {
    let columnName;
    const tableContainer = document.querySelector('.table');
    // 构建表头
    let tableHTML = '<thead><tr>';
    for (columnName in columnMapping) {
        tableHTML += '<th>' + columnMapping[columnName] + '</th>';
    }
    tableHTML += '</tr></thead>';
    // 构建表格内容
    tableHTML += '<tbody>';

    // 计算起始索引和结束索引
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);

    // 显示当前页数据
    for (let i = startIndex; i < endIndex; i++) {
        // 根据任务状态添加相应的类
        const statusClass = data[i]["任务状态"] === "进行中" ? "in-progress" : data[i]["任务状态"] === "已完成" ? "completed" : "";

        tableHTML += '<tr class="' + statusClass + '">';
        for (columnName in columnMapping) {
            tableHTML += '<td>' + data[i][columnName] + '</td>';
        }
        tableHTML += '</tr>';
    }

    tableHTML += '</tbody>';
    // 将表格插入到页面中
    tableContainer.innerHTML = tableHTML;
}

// 显示分页导航栏的函数
function displayPagination(totalItems) {
    totalPages = Math.ceil(totalItems / pageSize);
    let paginationHTML = '<ul class="pagination">';

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += '<li class="page-item active"><a class="page-link" href="#" onclick="changePageNumber(' + i + ')">' + i + '</a></li>';
        } else {
            paginationHTML += '<li class="page-item"><a class="page-link" href="#" onclick="changePageNumber(' + i + ')">' + i + '</a></li>';
        }
    }

    paginationHTML += '</ul>';

    $('#currentPage').html(paginationHTML);
}

// 每页显示数量变化时的回调函数
function changePageSize() {
    // 更新每页显示数量
    pageSize = parseInt($('#pageSizeSelect').val()); // 解析为整数
    totalPages = Math.ceil(personalTaskData.length / pageSize); // 更新总页数
    currentPage = 1;
    // 重新获取数据
    updatePersonalTaskData(currentPage, pageSize);
}

// 更新 changePage 函数，确保能够处理数字页码的点击跳转
function changePageNumber(pageNumber) {
    // 更新当前页数
    currentPage = pageNumber;
    // 重新获取数据
    updatePersonalTaskData(currentPage, pageSize);
}

// 切换页面时的回调函数
function changePage(direction) {
    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
    } else if (direction === 'next') {
        // 检查是否已经到达最后一页
        if (currentPage < totalPages) {
            currentPage++;
        }
    }
    // 重新获取数据
    updatePersonalTaskData(currentPage, pageSize);
}

// 处理数据的函数
function displayData(data) {
    // 更新页面文本内容
    $('#totalTasks').html('科室总任务数：<span class="bold-text">' + data[0]["总任务数"] + '</span>');
    $('#totalHours').html('总工时：<span class="bold-text">' + data[0]["总工时"] + '</span>');
    $('#completedTasks').html('已完成任务数：<span class="bold-text">' + data[0]["总完成任务数"] + '</span>');
    $('#completedHours').html('已完成工时：<span class="bold-text">' + data[0]["总完成工时"] + '</span>');
    $('#inProgressHours').html('在开发工时：<span class="bold-text">' + data[0]["总在开发工时"] + '</span>');
    $('#personalTasks').html('个人任务数：<span class="bold-text">' + data[0]["个人任务数"] + '</span>');
    $('#personalHours').html('个人工时：<span class="bold-text">' + data[0]["个人工时"] + '</span>');
    $('#personalCompletedTasks').html('个人已完成任务数：<span class="bold-text">' + data[0]["已完成任务数"] + '</span>');
    $('#personalCompletedHours').html('个人已完成工时：<span class="bold-text">' + data[0]["已完成工时"] + '</span>');
    $('#personalInProgressHours').html('个人在开发工时：<span class="bold-text">' + data[0]["在开发工时"] + '</span>');

    // 更新 ECharts 图表
    const echartsContainer = document.getElementById('echartsContainer');
    const myChart = echarts.init(echartsContainer);

    const options = {
        title: {
            text: '月度研发任务概况'
        },
        tooltip: {},
        legend: {
            data: ['汇总', '个人'],
        },
        xAxis: {
            data: ['任务数', '工时', '已完成任务数', '已完成工时', '在开发工时']
        },
        yAxis: {},
        series: [{
            name: '汇总',
            type: 'bar',
            barWidth: 40, // 设置柱子宽度
            data: [
                data[0].总任务数,
                data[0].总工时,
                data[0].总完成任务数,
                data[0].总完成工时,
                data[0].总在开发工时
            ],
            itemStyle: {
                color: '#61a0a8' // 设置总任务的柱状图颜色
            },
            label: {
                show: true, // 显示标签
                position: 'top', // 标签位置
                color: 'black', // 标签文字颜色
                formatter: function (params) {
                    return params.value; // 显示具体数值
                }
            }
        }, {
            name: '个人',
            type: 'bar',
            barWidth: 40, // 设置柱子宽度
            data: [
                data[0].个人任务数,
                data[0].个人工时,
                data[0].已完成任务数,
                data[0].已完成工时,
                data[0].在开发工时
            ],
            itemStyle: {
                color: '#f2a646' // 设置个人任务的柱状图颜色
            },
            label: {
                show: true, // 显示标签
                position: 'top', // 标签位置
                color: 'black', // 标签文字颜色
                formatter: function (params) {
                    return params.value; // 显示具体数值
                }
            }
        }]
    };

    myChart.setOption(options);

    // 监听柱状图点击事件
    myChart.on('click', function (params) {

        // 根据点击的是任务数、工时、已完成任务数、已完成工时还是在开发工时，选择要显示的详细数据字段
        const detailFieldName = ['任务数', '工时', '已完成任务数', '已完成工时', '在开发工时'][params.dataIndex];

        // 在 pieChartData 中找到对应的详细数据
        const clickedDetailData = pieChartData.map(item => ({
            姓名: item['姓名'],
            [detailFieldName]: item[detailFieldName]
        }));

        // 更新饼状图数据
        updatePieChart(clickedDetailData);
    });
    // 监听窗口大小变化事件，调整图表大小
    window.addEventListener('resize', function () {
        myChart.resize();
    });
}

// 定义一个函数，用于更新饼状图数据
function updatePieChart(data) {
    const pieChart = echarts.init(document.getElementById('pieChartContainer'));
    // 提取传入数据的字段名作为图例
    const legendData = Object.keys(data[0]);
    const pieOptions = {
        title: {
            text: legendData[1],
            subtext: '点击柱状图切换',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b} : {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'right'
        },
        series: [
            {
                name: legendData[1],
                type: 'pie',
                radius: '55%',
                center: ['50%', '60%'],
                roseType: 'radius', // 添加 roseType 属性
                data: data.map(item => ({
                    value: item[legendData[1]],
                    name: item[legendData[0]]
                })),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };

    pieChart.setOption(pieOptions);
}

// 新增获取饼状图数据的函数
function fetchPieChartData() {
    axios.post('/imc/customOpt', {
        req: '386',
        data: {}
    })
        .then(function (response) {
            // 处理返回的数据
            pieChartData = response.data.data.data;
            // 调用显示饼状图的函数
            displayPieChart(pieChartData);
        })
        .catch(function (error) {
            console.error('Error fetching pie chart data:', error);
        });
}


// 新增显示饼状图的函数
function displayPieChart(pieChartData) {
    const pieChartContainer = document.getElementById('pieChartContainer');
    const pieChart = echarts.init(pieChartContainer);

    const options = {
        title: {
            text: '工时',
            subtext: '点击柱状图切换',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'right',
            data: pieChartData.map(item => item['姓名'])
        },
        series: [
            {
                name: '个人工时',
                type: 'pie',
                radius: '50%',
                center: ['50%', '60%'],
                roseType: 'radius', // 添加 roseType 属性
                data: pieChartData.map(item => ({
                    name: item['姓名'],
                    value: item['工时']
                })),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                label: {
                    show: true,
                    position: 'outer',
                    formatter: '{b}: {c} ({d}%)'
                }
            }
        ]
    };

    pieChart.setOption(options);

    // 监听窗口大小变化事件，调整图表大小
    window.addEventListener('resize', function () {
        pieChart.resize();
    });
}