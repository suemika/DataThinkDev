export const DISPLAY_COLS = [
  { key: '发货通知单号', label: '发货通知单号', sortable: true },
  { key: '合同号', label: '合同号', sortable: true },
  { key: '批号', label: '批号', sortable: true },
  { key: 'MATE_CODE', label: '物料编码', sortable: true },
  { key: 'AL', label: 'AL', sortable: true },
  { key: '规格', label: '规格', sortable: true },
  { key: '牌号', label: '牌号', sortable: true },
  { key: '产品名称1', label: '产品名称', sortable: true },
  { key: '收货单位', label: '收货单位', sortable: true },
  { key: '车号', label: '车号', sortable: true },
  { key: '重量', label: '重量', sortable: true },
  { key: '日期', label: '日期', sortable: true },
  { key: '审核状态', label: '审核状态', sortable: true },
  { key: '操作人', label: '操作人', sortable: true },
  { key: '操作时间', label: '操作时间', sortable: true },
  { key: '更新时间', label: '更新时间', sortable: true },
  { key: '审核人', label: '审核人', sortable: true },
  { key: '审核时间', label: '审核时间', sortable: true }
]

export const FORM_SECTIONS = [
  {
    title: '基本信息',
    icon: 'bi-info-circle',
    fields: [
      { key: '发货通知单号', required: true, col: 'col-12 col-md-4' },
      { key: '合同号', col: 'col-12 col-md-4' },
      { key: '收货单位', col: 'col-12 col-md-3' },
      { key: '车号', col: 'col-12 col-md-3' },
      { key: '日期', col: 'col-12 col-md-3', type: 'date' },
      { key: '请发日期', col: 'col-12 col-md-3', type: 'date' }
    ]
  },
  {
    title: '产品信息',
    icon: 'bi-box-seam',
    fields: [
      { key: '批号', col: 'col-12 col-md-3' },
      { key: 'MATE_CODE', label: '物料编码', col: 'col-12 col-md-3' },
      { key: '规格', col: 'col-12 col-md-3' },
      { key: '定尺', label: '定尺(mm)', col: 'col-12 col-md-3' },
      { key: '产品名称1', col: 'col-12 col-md-3' },
      { key: '牌号', col: 'col-12 col-md-3' },
      { key: '许可证号', col: 'col-12 col-md-3' },
      { key: '执行标准', col: 'col-12 col-md-3' },
      { key: '炉号', col: 'col-12 col-md-3' }
    ]
  },
  {
    title: '重量与数量',
    icon: 'bi-speedometer2',
    fields: [
      { key: '重量', col: 'col-6 col-md-2' },
      { key: '支数', col: 'col-6 col-md-2' },
      { key: '件数', col: 'col-6 col-md-2' },
      { key: '总重量', col: 'col-6 col-md-2' },
      { key: '总件数', col: 'col-6 col-md-2' },
      { key: '米重', col: 'col-6 col-md-2' },
      { key: '各支理重', col: 'col-12 col-md-4' },
      { key: '各支实重', col: 'col-12 col-md-4' },
      { key: '各支件数', col: 'col-12 col-md-4' }
    ]
  },
  {
    title: '力学性能',
    icon: 'bi-graph-up',
    fields: [
      { key: '屈服强度', col: 'col-6 col-md-2' },
      { key: '抗拉强度', col: 'col-6 col-md-2' },
      { key: '强屈比', col: 'col-6 col-md-2' },
      { key: '断后伸长率', col: 'col-6 col-md-2' },
      { key: '最大应力下的总伸长率', col: 'col-6 col-md-2' },
      { key: '超强比', col: 'col-6 col-md-2' },
      { key: '下屈服强度', col: 'col-6 col-md-2' },
      { key: '断面收缩率', col: 'col-6 col-md-2' },
      { key: '冷弯180度', col: 'col-6 col-md-2' },
      { key: '反弯', col: 'col-6 col-md-2' },
      { key: '弯曲类型', col: 'col-6 col-md-2' }
    ]
  },
  {
    title: '冲击功',
    icon: 'bi-lightning-charge',
    fields: [
      { key: '冲击功1', col: 'col-6 col-md-2' },
      { key: '冲击功2', col: 'col-6 col-md-2' },
      { key: '冲击功3', col: 'col-6 col-md-2' },
      { key: '冲击功平均值', col: 'col-6 col-md-2' },
      { key: '冲击功', col: 'col-6 col-md-2' },
      { key: '试样尺寸', col: 'col-6 col-md-2' },
      { key: 'D类型', col: 'col-6 col-md-2' },
      { key: '试验温度', col: 'col-12 col-md-3' }
    ]
  },
  {
    title: '化学成分',
    icon: 'bi-droplet',
    fields: [
      { key: 'C', col: 'col-4 col-md-2' },
      { key: 'MN', col: 'col-4 col-md-2' },
      { key: 'P', col: 'col-4 col-md-2' },
      { key: 'S', col: 'col-4 col-md-2' },
      { key: 'SI', col: 'col-4 col-md-2' },
      { key: 'CU', col: 'col-4 col-md-2' },
      { key: 'NI', col: 'col-4 col-md-2' },
      { key: 'CR', col: 'col-4 col-md-2' },
      { key: 'MO', col: 'col-4 col-md-2' },
      { key: 'V', col: 'col-4 col-md-2' },
      { key: 'B', col: 'col-4 col-md-2' },
      { key: 'N', col: 'col-4 col-md-2' },
      { key: 'ALT', col: 'col-4 col-md-2' },
      { key: 'AL', col: 'col-4 col-md-2' },
      { key: 'TI', col: 'col-4 col-md-2' },
      { key: 'NB', col: 'col-4 col-md-2' },
      { key: 'ALS', col: 'col-4 col-md-2' },
      { key: 'CEQ', col: 'col-4 col-md-2' },
      { key: 'CMN6', col: 'col-4 col-md-2' },
      { key: 'CE', col: 'col-12 col-md-4' },
      { key: '技术规范', col: 'col-12 col-md-4' },
      { key: '实物标记', col: 'col-12 col-md-4' }
    ]
  }
]

// 从 FORM_SECTIONS 自动提取所有表单字段（新增字段只需在对应 section 加一行）
export function getFormFields() {
  const fields = []
  const seen = new Set()
  for (const section of FORM_SECTIONS) {
    for (const f of section.fields) {
      if (!seen.has(f.key)) {
        seen.add(f.key)
        fields.push(f.key)
      }
    }
  }
  return fields
}
