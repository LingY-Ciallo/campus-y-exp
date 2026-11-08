const { compute } = require('./calculator');
const demoAppearance = require('./demo-appearance');

const LIMITS = {
  calibration: { min: 4, max: 12 },
  deflection: { min: 1, max: 6 },
};

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function emptyCalibration() {
  return Array.from({ length: 6 }, (_, index) => ({ id: index + 1, z: '', u: '' }));
}

function emptyDeflection() {
  return Array.from({ length: 3 }, (_, index) => ({ id: index + 1, dz: '', du: '' }));
}

const EXAMPLE = {
  material: '铸铁',
  thickness: ['0.875', '0.868', '0.867'],
  width: ['20.8', '20.9', '20.96'],
  span: ['23.2', '22.8', '23'],
  massG: '60',
  referenceY: '1.815e11',
  calibration: [
    { z: '3.245', u: '13' },
    { z: '3.56', u: '-81' },
    { z: '3.89', u: '-179' },
    { z: '4.21', u: '-276' },
    { z: '4.53', u: '-371' },
    { z: '4.86', u: '-470' },
  ],
  deflection: [{ dz: '', du: '200' }, { dz: '', du: '203' }, { dz: '', du: '201' }],
};

Page({
  data: {
    appearanceTheme: 'light',
    appearanceAccent: 'sky',
    demoMode: false,
    themeNames: [],
    accentNames: [],
    themeIndex: 0,
    accentIndex: 0,

    material: '',
    thickness: ['', '', ''],
    width: ['', '', ''],
    span: ['', '', ''],
    massG: '60',
    referenceY: '',

    calibration: emptyCalibration(),
    deflection: emptyDeflection(),

    minCalibration: LIMITS.calibration.min,
    maxCalibration: LIMITS.calibration.max,
    minDeflection: LIMITS.deflection.min,
    maxDeflection: LIMITS.deflection.max,

    result: null,
    error: '',
  },

  onLoad() {
    const app = getApp();
    const demoMode = !!(app && app.globalData && app.globalData.experimentTemplateDemo);
    this.setData({ demoMode });
    if (demoMode && typeof wx.onThemeChange === 'function') {
      this._themeListener = () => demoAppearance.apply(this);
      wx.onThemeChange(this._themeListener);
    }
  },

  onShow() {
    if (this.data.demoMode) demoAppearance.apply(this);
  },

  onUnload() {
    if (this._themeListener && typeof wx.offThemeChange === 'function') {
      wx.offThemeChange(this._themeListener);
    }
  },

  onThemeChange(event) {
    if (!this.data.demoMode) return;
    const option = demoAppearance.THEMES[Number(event.detail.value)];
    if (option) demoAppearance.apply(this, { theme: option.id });
  },

  onAccentChange(event) {
    if (!this.data.demoMode) return;
    const option = demoAppearance.ACCENTS[Number(event.detail.value)];
    if (option) demoAppearance.apply(this, { accent: option.id });
  },

  onInput(event) {
    const { field, list, index, key } = event.currentTarget.dataset;
    const value = event.detail.value;
    if (field) {
      this.setData({ [field]: value, result: null, error: '' });
      return;
    }
    if (!list) return;
    const path = key ? `${list}[${index}].${key}` : `${list}[${index}]`;
    this.setData({ [path]: value, result: null, error: '' });
  },

  addRow(event) {
    const list = event.currentTarget.dataset.list;
    const limit = LIMITS[list];
    if (!limit) return;
    const rows = this.data[list];
    if (rows.length >= limit.max) return;
    const blank = list === 'calibration'
      ? { id: nextId(rows), z: '', u: '' }
      : { id: nextId(rows), dz: '', du: '' };
    this.setData({ [list]: rows.concat(blank), result: null, error: '' });
  },

  removeRow(event) {
    const { list, id } = event.currentTarget.dataset;
    const limit = LIMITS[list];
    if (!limit) return;
    const rows = this.data[list];
    if (rows.length <= limit.min) return;
    this.setData({
      [list]: rows.filter((row) => row.id !== Number(id)),
      result: null,
      error: '',
    });
  },

  loadExample() {
    const fill = () => this.setData({
      material: EXAMPLE.material,
      thickness: EXAMPLE.thickness.slice(),
      width: EXAMPLE.width.slice(),
      span: EXAMPLE.span.slice(),
      massG: EXAMPLE.massG,
      referenceY: EXAMPLE.referenceY,
      calibration: EXAMPLE.calibration.map((row, index) => ({ id: index + 1, ...row })),
      deflection: EXAMPLE.deflection.map((row, index) => ({ id: index + 1, ...row })),
      result: null,
      error: '',
    });
    const filled = (value) => String(value === null || value === undefined ? '' : value).trim();
    const dirty = [this.data.material, this.data.referenceY].some(filled)
      || filled(this.data.massG) !== '60'
      || this.data.thickness.some(filled)
      || this.data.width.some(filled)
      || this.data.span.some(filled)
      || this.data.calibration.some((row) => filled(row.z) || filled(row.u))
      || this.data.deflection.some((row) => filled(row.dz) || filled(row.du));
    if (dirty) {
      wx.showModal({
        title: '载入示例数据',
        content: '将替换当前输入，是否继续？',
        success: (res) => { if (res.confirm) fill(); },
      });
    } else {
      fill();
    }
  },

  resetForm() {
    wx.showModal({
      title: '清空本次数据',
      content: '清空所有输入和结果？此操作无法撤销。',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({
          material: '',
          thickness: ['', '', ''],
          width: ['', '', ''],
          span: ['', '', ''],
          massG: '60',
          referenceY: '',
          calibration: emptyCalibration(),
          deflection: emptyDeflection(),
          result: null,
          error: '',
        });
      },
    });
  },

  calculate() {
    try {
      const outcome = compute({
        material: this.data.material,
        thickness: this.data.thickness,
        width: this.data.width,
        span: this.data.span,
        massG: this.data.massG,
        referenceY: this.data.referenceY,
        calibration: this.data.calibration,
        deflection: this.data.deflection,
      });
      if (outcome.error) throw new Error(outcome.error);
      this.setData({ result: outcome.result, error: '' });
    } catch (error) {
      this.setData({ result: null, error: error.message });
    }
  },

  copyResult() {
    const result = this.data.result;
    if (!result) return;
    const readings = (list) => list
      .map((value) => String(value === null || value === undefined ? '' : value).trim())
      .filter((value) => value);
    const lines = [
      '弯曲法测量杨氏模量（霍尔位置传感器）',
      `材料：${result.material}`,
      `厚度 a：${readings(this.data.thickness).join(' / ')} mm（均值 ${result.thicknessText}，${result.thicknessCount} 次）`,
      `宽度 b：${readings(this.data.width).join(' / ')} mm（均值 ${result.widthText}，${result.widthCount} 次）`,
      `刀口间距 d：${readings(this.data.span).join(' / ')} cm（均值 ${result.spanText}，${result.spanCount} 次）`,
      `负荷 M：${result.massText} g`,
      '',
      '定标数据（Z 对 U）：',
      ...this.data.calibration
        .filter((row) => String(row.z || '').trim() || String(row.u || '').trim())
        .map((row) => `Z = ${String(row.z || '').trim()} mm，U = ${String(row.u || '').trim()} mV`),
      `灵敏度 K：${result.kText} V/m（R² = ${result.r2Text}，${result.pointCount} 个定标点）`,
      '',
      '挠度明细：',
      ...result.details.map((item) => (item.deltaUText
        ? `${item.index}. ${item.deltaZText} mm（ΔU = ${item.deltaUText} mV）`
        : `${item.index}. ${item.deltaZText} mm（ΔZ 直测）`)),
      `平均挠度 ΔZ：${result.deltaZAvgText} mm`,
      `杨氏模量 Y：${result.yGpaText} GPa（${result.yExponential} Pa）`,
    ];
    if (result.hasReference) {
      lines.push(`与公认值 ${result.referenceText} Pa 相比：${result.errorText}%`);
    }
    wx.setClipboardData({
      data: lines.join('\n'),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }),
    });
  },
});
