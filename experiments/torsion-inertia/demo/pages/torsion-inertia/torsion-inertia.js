const { compute } = require('./calculator');
const demoAppearance = require('./demo-appearance');

// 每个量的测量次数固定为 3 行：空白格子会被忽略，只填 1 次也可以
const EXAMPLE = {
  cylinderMass: ['723', '', ''],
  cylinderDiameter: ['100', '100', '100'],
  tubeMass: ['715', '', ''],
  tubeOuter: ['100.1', '100.2', '100.2'],
  tubeInner: ['93.13', '93.14', '93.14'],
  rodMass: ['134.6', '', ''],
  rodLength: ['601', '', ''],
  periodEmpty: ['0.667534', '0.668085', '0.667923'],
  periodCylinder: ['1.141298', '1.140715', '1.141011'],
  periodTube: ['1.402563', '1.402269', '1.402373'],
  periodRod: ['1.994677', '1.994867', '1.994723'],
};

const ARRAY_FIELDS = Object.keys(EXAMPLE);

function blankRow() {
  return ['', '', ''];
}

function emptyForm() {
  const form = {};
  ARRAY_FIELDS.forEach((field) => { form[field] = blankRow(); });
  return form;
}

Page({
  data: {
    appearanceTheme: 'light',
    appearanceAccent: 'sky',
    demoMode: false,
    themeNames: [],
    accentNames: [],
    themeIndex: 0,
    accentIndex: 0,

    cylinderMass: blankRow(),
    cylinderDiameter: blankRow(),
    tubeMass: blankRow(),
    tubeOuter: blankRow(),
    tubeInner: blankRow(),
    rodMass: blankRow(),
    rodLength: blankRow(),
    periodEmpty: blankRow(),
    periodCylinder: blankRow(),
    periodTube: blankRow(),
    periodRod: blankRow(),

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
    const { list, index } = event.currentTarget.dataset;
    if (!list) return;
    this.setData({ [`${list}[${index}]`]: event.detail.value, result: null, error: '' });
  },

  loadExample() {
    const fill = () => {
      const payload = {};
      ARRAY_FIELDS.forEach((field) => { payload[field] = EXAMPLE[field].slice(); });
      payload.result = null;
      payload.error = '';
      this.setData(payload);
    };
    const filled = (value) => String(value === null || value === undefined ? '' : value).trim();
    const dirty = ARRAY_FIELDS.some((field) => (this.data[field] || []).some(filled));
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
        const payload = emptyForm();
        payload.result = null;
        payload.error = '';
        this.setData(payload);
      },
    });
  },

  calculate() {
    try {
      const outcome = compute({
        cylinder: { mass: this.data.cylinderMass, diameter: this.data.cylinderDiameter },
        tube: { mass: this.data.tubeMass, outer: this.data.tubeOuter, inner: this.data.tubeInner },
        rod: { mass: this.data.rodMass, length: this.data.rodLength },
        periods: {
          empty: this.data.periodEmpty,
          cylinder: this.data.periodCylinder,
          tube: this.data.periodTube,
          rod: this.data.periodRod,
        },
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
    const readings = (list) => (list || [])
      .map((value) => String(value === null || value === undefined ? '' : value).trim())
      .filter((value) => value)
      .join(' / ');
    // 与周期同一写法：逐次读数 + 单位（均值，次数）。填了几次就列几次，不合并、不省略
    const measure = (label, list, unit, meanText, count) =>
      `${label}：${readings(list)} ${unit}（均值 ${meanText}，${count} 次）`;
    const lines = [
      '扭摆法测量转动惯量',
      '',
      '原始数据：',
      '几何尺寸与质量：',
      measure('圆柱体质量 m1', this.data.cylinderMass, 'g', result.cylinderMassText, result.cylinderMassCount),
      measure('圆柱体直径 D1', this.data.cylinderDiameter, 'mm', result.cylinderDiameterText, result.cylinderDiameterCount),
      measure('圆筒质量 m2', this.data.tubeMass, 'g', result.tubeMassText, result.tubeMassCount),
      measure('圆筒外径 D外', this.data.tubeOuter, 'mm', result.tubeOuterText, result.tubeOuterCount),
      measure('圆筒内径 D内', this.data.tubeInner, 'mm', result.tubeInnerText, result.tubeInnerCount),
      measure('细杆质量 m3', this.data.rodMass, 'g', result.rodMassText, result.rodMassCount),
      measure('细杆长度 L', this.data.rodLength, 'mm', result.rodLengthText, result.rodLengthCount),
      '',
      '周期：',
      measure('周期 T0（空载物盘）', this.data.periodEmpty, 's', result.t0Text, result.t0Count),
      measure('周期 T1（放圆柱体）', this.data.periodCylinder, 's', result.t1Text, result.t1Count),
      measure('周期 T2（放圆筒）', this.data.periodTube, 's', result.t2Text, result.t2Count),
      measure('周期 T3（放细杆）', this.data.periodRod, 's', result.t3Text, result.t3Count),
      '',
      `扭转常量 K：${result.kText} N·m`,
      `K/(4π²)：${result.kOverFourPi2Text} kg·m²/s²`,
      `空载物盘转动惯量 J0：${result.j0Text} kg·m²`,
      '',
      '转动惯量结果（J理 / J实 / 相对误差）：',
      ...result.items.map((item) => `${item.name}：${item.theoryText} / ${item.measuredText} kg·m²，E = ${item.errorText}%`),
      '',
      '注：圆柱体是标定体，J实 恒等于 J理，E = 0 由方法本身决定，不作为准确度指标。',
    ];
    wx.setClipboardData({
      data: lines.join('\n'),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }),
    });
  },
});
