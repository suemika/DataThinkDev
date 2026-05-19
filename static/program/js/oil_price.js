// static/js/main.js
document.addEventListener('DOMContentLoaded', function () {
    // 使用 AJAX 获取数据
    fetch('/oil_price')
        .then(response => response.json())
        .then(data => {
            // 使用 ECharts 渲染图表
            var myChart = echarts.init(document.getElementById('oilPriceChart'), 'dark');
            var option = {
                title: {
                    text: 'Oil Price Over Time'
                },
                legend: {
                    data: ['Price92', 'Price95']
                },
                xAxis: {
                    type: 'category',
                    data: data.date
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    name: 'Price92',
                    data: data.price92,
                    type: 'line',
                    markPoint: {
                        data: [
                            {type: 'max', name: 'Max'},
                            {type: 'min', name: 'Min'}
                        ],
                        label: {
                            formatter: function (params) {
                                return params.name + ': ' + params.value;
                            }
                        }
                    }
                }, {
                    name: 'Price95',
                    data: data.price95,
                    type: 'line',
                    markPoint: {
                        data: [
                            {type: 'max', name: 'Max'},
                            {type: 'min', name: 'Min'}
                        ],
                        label: {
                            formatter: function (params) {
                                return params.name + ': ' + params.value;
                            }
                        }
                    }
                }],
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    },
                    formatter: function (params) {
                        var result = params[0].name + '<br />';
                        // 循环遍历 markPoint 的数据
                        params.forEach(function (item) {
                            if (item.seriesName.includes('Price')) {
                                result += item.seriesName + ': ' + item.value + '<br />';
                            }
                        });
                        return result;
                    }
                },
                dataZoom: [
                    {
                        type: 'inside',
                        start: 0,
                        end: 100
                    },
                    {
                        show: true,
                        type: 'slider',
                        y: '90%',
                        start: 0,
                        end: 100
                    }
                ],
                toolbox: {
                    feature: {
                        dataZoom: {
                            yAxisIndex: 'none'
                        },
                        restore: {},
                        saveAsImage: {}
                    }
                },
                visualMap: {
                    show: false,
                    min: Math.min(...data.price92, ...data.price95),
                    max: Math.max(...data.price92, ...data.price95),
                    inRange: {
                        color: ['#50a3ba', '#eac736','#d94e5d' ]
                    }
                },
            };
            myChart.setOption(option);

            // 在页面底部添加表格
            var tableHtml = '<h2>Oil Price List</h2><table border="1"><thead><tr><th>Date</th><th>Price92</th><th>Price95</th></tr></thead><tbody>';

            // 遍历日期属性
            Object.keys(data.date).forEach(function (key, index) {
                tableHtml += '<tr><td>' + data.date[key] + '</td><td>' + data.price92[index] + '</td><td>' + data.price95[index] + '</td></tr>';
            });

            tableHtml += '</tbody></table>';
            document.body.insertAdjacentHTML('beforeend', tableHtml);

            // 添加窗口大小改变的事件监听器
            window.addEventListener('resize', function () {
                myChart.resize();
            });
        });

});
