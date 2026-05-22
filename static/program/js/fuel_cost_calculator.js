
$(document).ready(function () {

    // ===== 实时油价获取 =====
    function fetchOilPrice() {
        var $btn = $("#fetchOilPrice");
        var $tip = $("#oilPriceUpdate");
        $btn.prop("disabled", true).text("⏳");
        
        axios.post("/imc/customOpt", {
            req: "801",
            data: JSON.stringify({})
        }).then(function(res) {
            var d = res.data;
            // customOpt 外层包了一层，实际数据在 d.data 里
            var inner = d.data;
            if (d.status === 0 && inner && inner.status === 0 && inner.data && inner.data.prices) {
                var p = inner.data.prices;
                if (p["92"]) $("#fuelPrice92").val(p["92"]);
                if (p["95"]) $("#fuelPrice95").val(p["95"]);
                var timeStr = inner.data.updateTime || new Date().toLocaleDateString("zh-CN");
                $tip.text("泰安油价 更新于 " + timeStr).show();
                $("#heroOilTime").text(timeStr);
                $btn.text("✅").removeClass("btn-outline-secondary").addClass("btn-outline-success");

                // 将新价格追加到走势图
                if (typeof addPriceToTrend === "function") {
                    addPriceToTrend(timeStr, p);
                }
            } else {
                $btn.text("⚠️").removeClass("btn-outline-secondary").addClass("btn-outline-danger");
                console.error("油价获取失败:", d.msg || inner.msg || d);
            }
        }).catch(function(err) {
            $btn.text("❌").removeClass("btn-outline-secondary").addClass("btn-outline-danger");
            console.error("油价请求失败:", err);
        }).finally(function() {
            setTimeout(function() { $btn.prop("disabled", false); }, 2000);
        });
    }
    
    // 点击按钮获取油价
    $("#fetchOilPrice").click(fetchOilPrice);
    
    // 页面加载时自动获取一次
    fetchOilPrice();

    // ===== 电价参考面板 =====
    $("#toggleElecRef").click(function() {
        $("#elecRefPanel").slideToggle(200);
    });

    // 定义一个变量来存储柱状图的数据
    var chartData = {
        dailyFuelCost92: 0,
        dailyFuelCost95: 0,
        dailyElectricCost: 0,
        monthlyFuelCost92: 0,
        monthlyFuelCost95: 0,
        monthlyElectricCost: 0,
        yearlyFuelCost92: 0,
        yearlyFuelCost95: 0,
        yearlyElectricCost: 0
    };

    // 点击"计算费用"按钮时执行计算
    $("#calculate-button").click(function () {
        // 获取用户输入的数据
        var fuelConsumption = parseFloat($("#fuelConsumption").val());
        var fuelPrice92 = parseFloat($("#fuelPrice92").val());
        var fuelPrice95 = parseFloat($("#fuelPrice95").val());
        var electricConsumption = parseFloat($("#electricConsumption").val());
        var electricPrice = parseFloat($("#electricPrice").val());
        var distance = parseFloat($("#distance").val());
        var daysPerMonth = parseFloat($("#daysPerMonth").val());

        // 调用通用计算费用方法
        var result = calculateCost(fuelConsumption, fuelPrice92, fuelPrice95, electricConsumption, electricPrice, distance, daysPerMonth);

        // 存储计算结果
        chartData = result;

        // 显示结果区域
        $("#result-section").slideDown(300);

        // 更新每公里油费和电费
        $("#perKmFuelCost92").text(result.perKmFuelCost92);
        $("#perKmFuelCost95").text(result.perKmFuelCost95);
        $("#perKmElectricCost").text(result.perKmElectricCost);

        // 更新里程
        $("#dailyDistance").text(result.dailyDistance);
        $("#monthlyDistance").text(result.monthlyDistance);
        $("#yearlyDistance").text(result.yearlyDistance);

        // 更新每日、每月和每年的费用
        $("#dailyFuelCost92").text(result.dailyFuelCost92);
        $("#dailyFuelCost95").text(result.dailyFuelCost95);
        $("#dailyElectricCost").text(result.dailyElectricCost);
        $("#monthlyFuelCost92").text(result.monthlyFuelCost92);
        $("#monthlyFuelCost95").text(result.monthlyFuelCost95);
        $("#monthlyElectricCost").text(result.monthlyElectricCost);
        $("#yearlyFuelCost92").text(result.yearlyFuelCost92);
        $("#yearlyFuelCost95").text(result.yearlyFuelCost95);
        $("#yearlyElectricCost").text(result.yearlyElectricCost);

        // 更新柱状图
        updateChart();

        // 滚动到结果区
        $("html, body").animate({ scrollTop: $("#result-section").offset().top - 20 }, 400);
    });
    // 获取柱状图容器
    var resultChart = document.getElementById("resultChart");

    // 创建 ECharts 实例
    var chart = echarts.init(resultChart);

    // 创建柱状图配置
    var option = {
        title: {
            text: "费用对比统计",
            left: "center",
            textStyle: { fontSize: 16, fontWeight: 700, color: "#334155" }
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: function(value) { return "¥" + value + " 元"; }
        },
        legend: {
            data: ["92#油费", "95#油费", "电费"],
            bottom: 0,
            textStyle: { color: "#64748b" }
        },
        grid: { top: 50, bottom: 50, left: 60, right: 30 },
        xAxis: {
            data: ["每日", "每月", "每年"],
            axisLine: { lineStyle: { color: "#e2e8f0" } },
            axisTick: { show: false },
            axisLabel: { color: "#64748b", fontWeight: 600 }
        },
        yAxis: {
            name: "费用（元）",
            nameTextStyle: { color: "#94a3b8", fontSize: 12 },
            axisLabel: { color: "#94a3b8" },
            splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } }
        },
        color: ["#f97316", "#ea580c", "#0ea5e9"],
        series: [
            {
                name: "92#油费",
                type: "bar",
                barWidth: "28%",
                itemStyle: { borderRadius: [6, 6, 0, 0] },
                data: [chartData.dailyFuelCost92, chartData.monthlyFuelCost92, chartData.yearlyFuelCost92]
            },
            {
                name: "95#油费",
                type: "bar",
                barWidth: "28%",
                itemStyle: { borderRadius: [6, 6, 0, 0] },
                data: [chartData.dailyFuelCost95, chartData.monthlyFuelCost95, chartData.yearlyFuelCost95]
            },
            {
                name: "电费",
                type: "bar",
                barWidth: "28%",
                itemStyle: { borderRadius: [6, 6, 0, 0] },
                data: [chartData.dailyElectricCost, chartData.monthlyElectricCost, chartData.yearlyElectricCost]
            }
        ]
    };

    // 使用配置绘制柱状图
    chart.setOption(option);

    // 更新柱状图
    function updateChart() {
        option.series[0].data = [chartData.dailyFuelCost92, chartData.monthlyFuelCost92, chartData.yearlyFuelCost92];
        option.series[1].data = [chartData.dailyFuelCost95, chartData.monthlyFuelCost95, chartData.yearlyFuelCost95];
        option.series[2].data = [chartData.dailyElectricCost, chartData.monthlyElectricCost, chartData.yearlyElectricCost];

        chart.setOption(option);
    }

    // 添加窗口大小改变的事件监听器
    window.addEventListener('resize', function () {
        chart.resize();
    });
});



// 通用计算费用方法
function calculateCost(fuelConsumption, fuelPrice92, fuelPrice95, electricConsumption, electricPrice, distance, daysPerMonth) {
    // 计算每日、每月和每年的行驶里程
    var dailyDistance = distance;
    var monthlyDistance = distance * daysPerMonth;
    var yearlyDistance = monthlyDistance * 12;

    // 计算油费和电费
    var fuelCost92 = calculateGenericCost(fuelConsumption, fuelPrice92, distance);
    var fuelCost95 = calculateGenericCost(fuelConsumption, fuelPrice95, distance);
    var electricCost = calculateGenericCost(electricConsumption, electricPrice, distance);

    // 计算每公里油费和电费
    var perKmFuelCost92 = calculateGenericCost(fuelConsumption, fuelPrice92, 1);
    var perKmFuelCost95 = calculateGenericCost(fuelConsumption, fuelPrice95, 1);
    var perKmElectricCost = calculateGenericCost(electricConsumption, electricPrice, 1);

    // 计算每日、每月和每年的费用
    var dailyFuelCost92 = calculateGenericCost(fuelConsumption, fuelPrice92, dailyDistance);
    var dailyFuelCost95 = calculateGenericCost(fuelConsumption, fuelPrice95, dailyDistance);
    var dailyElectricCost = calculateGenericCost(electricConsumption, electricPrice, dailyDistance);

    var monthlyFuelCost92 = calculateGenericCost(fuelConsumption, fuelPrice92, monthlyDistance);
    var monthlyFuelCost95 = calculateGenericCost(fuelConsumption, fuelPrice95, monthlyDistance);
    var monthlyElectricCost = calculateGenericCost(electricConsumption, electricPrice, monthlyDistance);

    var yearlyFuelCost92 = calculateGenericCost(fuelConsumption, fuelPrice92, yearlyDistance);
    var yearlyFuelCost95 = calculateGenericCost(fuelConsumption, fuelPrice95, yearlyDistance);
    var yearlyElectricCost = calculateGenericCost(electricConsumption, electricPrice, yearlyDistance);

    return {
        dailyDistance: dailyDistance.toFixed(2),
        monthlyDistance: monthlyDistance.toFixed(2),
        yearlyDistance: yearlyDistance.toFixed(2),
        fuelCost92: fuelCost92.toFixed(2),
        fuelCost95: fuelCost95.toFixed(2),
        electricCost: electricCost.toFixed(2),
        perKmFuelCost92: perKmFuelCost92.toFixed(2),
        perKmFuelCost95: perKmFuelCost95.toFixed(2),
        perKmElectricCost: perKmElectricCost.toFixed(2),
        dailyFuelCost92: dailyFuelCost92.toFixed(2),
        dailyFuelCost95: dailyFuelCost95.toFixed(2),
        dailyElectricCost: dailyElectricCost.toFixed(2),
        monthlyFuelCost92: monthlyFuelCost92.toFixed(2),
        monthlyFuelCost95: monthlyFuelCost95.toFixed(2),
        monthlyElectricCost: monthlyElectricCost.toFixed(2),
        yearlyFuelCost92: yearlyFuelCost92.toFixed(2),
        yearlyFuelCost95: yearlyFuelCost95.toFixed(2),
        yearlyElectricCost: yearlyElectricCost.toFixed(2)
    };
}

// 计算费用的通用方法
function calculateGenericCost(consumption, price, distance) {
    return (consumption / 100) * price * distance;
}

// ===== 近3个月油价走势图 =====
var trendChart = null;
var trendData = {
    dates: [
        "3/1", "3/8", "3/15", "3/22", "3/29",
        "4/5", "4/12", "4/19", "4/26",
        "5/3", "5/10", "5/17", "5/18"
    ],
    price92: [7.89, 7.89, 7.72, 7.72, 7.55, 7.45, 7.45, 7.67, 7.89, 8.13, 8.13, 8.68, 8.68],
    price95: [8.52, 8.52, 8.35, 8.35, 8.18, 8.08, 8.08, 8.30, 8.52, 8.76, 8.76, 9.31, 9.31]
};

// 将新价格追加到走势图（由 fetchOilPrice 成功后调用）
window.addPriceToTrend = function(timeStr, prices) {
    if (!trendChart) return;
    // 从 timeStr 提取日期部分，如 "2026-05-22" → "5/22"
    var dateMatch = timeStr.match(/(\d+)-(\d+)-(\d+)/);
    var dateLabel = dateMatch ? (parseInt(dateMatch[2]) + "/" + parseInt(dateMatch[3])) : timeStr;
    // 去重：同一天不重复添加
    if (trendData.dates[trendData.dates.length - 1] === dateLabel) return;
    trendData.dates.push(dateLabel);
    trendData.price92.push(prices["92"]);
    trendData.price95.push(prices["95"]);
    // 更新 markLine 到最新 92# 价格
    trendChart.setOption({
        xAxis: { data: trendData.dates },
        series: [
            {
                data: trendData.price92,
                markLine: { data: [{ yAxis: prices["92"], name: "92# 当前" }] }
            },
            { data: trendData.price95 }
        ]
    });
};

$(function() {
    var trendDom = document.getElementById("trendChart");
    if (!trendDom) return;
    trendChart = echarts.init(trendDom);

    var option = {
        title: {
            text: "山东泰安 — 近3个月油价走势",
            left: "center",
            textStyle: { fontSize: 16, fontWeight: 700, color: "#334155" }
        },
        tooltip: {
            trigger: "axis",
            valueFormatter: function(value) { return "¥" + value + " 元/升"; }
        },
        legend: {
            data: ["92# 汽油", "95# 汽油"],
            bottom: 0,
            textStyle: { color: "#64748b" }
        },
        grid: { top: 50, bottom: 50, left: 60, right: 30 },
        xAxis: {
            data: trendData.dates,
            axisLine: { lineStyle: { color: "#e2e8f0" } },
            axisTick: { show: false },
            axisLabel: { color: "#64748b", fontSize: 11 }
        },
        yAxis: {
            name: "元/升",
            min: function(value) { return Math.floor(value.min * 10 - 3) / 10; },
            nameTextStyle: { color: "#94a3b8", fontSize: 12 },
            axisLabel: { color: "#94a3b8" },
            splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } }
        },
        color: ["#f97316", "#ea580c"],
        series: [
            {
                name: "92# 汽油",
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 6,
                lineStyle: { width: 3 },
                areaStyle: { opacity: 0.08, color: "#f97316" },
                markLine: {
                    silent: true,
                    symbol: "none",
                    lineStyle: { color: "#94a3b8", type: "dashed", width: 1 },
                    label: { formatter: "当前 ¥{c}", position: "end", fontSize: 11 },
                    data: [{ yAxis: 8.68, name: "92# 当前" }]
                },
                data: trendData.price92
            },
            {
                name: "95# 汽油",
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 6,
                lineStyle: { width: 3 },
                areaStyle: { opacity: 0.08, color: "#ea580c" },
                data: trendData.price95
            }
        ]
    };

    trendChart.setOption(option);

    window.addEventListener("resize", function() {
        trendChart.resize();
    });
});
