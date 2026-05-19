// (字典模型)MDModel1.endLoad
debugger;

var list = responseObject.ResponseObject.dataSetMap.HLZB_tbCompanyInfo.rowSetArray || [];
var count = list.length;

var getdate = function () {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day; // 返回 2025-11-10 格式
};

var dqrq = getdate();
console.log("当前日期：" + dqrq);
Column9.setCellFontColorMap({'#ffffff': "yxrq <='" + dqrq + "'"});
for (var i = 0; i < count; i++) {
    var selected = list[i];
    if (!selected) continue;
    var yxrq = selected.dataMap.yxrq || '';

    console.log("数据库日期：" + yxrq);

    // 直接比较日期字符串（YYYY-MM-DD格式可以直接比较）
    if (yxrq && yxrq <= dqrq) {
        console.log("需要高亮显示: " + yxrq);
        // 设置列背景色
        Column9.setCellBackgroundColorMap({'#ff1818': "yxrq <='" + dqrq + "'"});
        //列字体颜色

        Column9.setCellFontColorMap({'#ffffff': "yxrq <='" + dqrq + "'"});

        //.setBackgroundColor("red");
        //AGGrid1.setRowBkgColor({'red':yxrq && yxrq <= dqrq});
    }
}
AGGrid1.redrawRows();