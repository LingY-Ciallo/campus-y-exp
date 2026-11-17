const { compute } = require('./calculator');
const demoAppearance = require('./demo-appearance');

// 固定 5 组：与实验记录表的 5 个砝码（1 / 2 / 3 / 5 / 8 g）对应
const GROUP_COUNT = 5;
const READINGS = 3;

const EXAMPLE = [
  { mass: '1', t1: ['2.49021', '2.47475', '2.49084'], t2: ['4.13579', '4.11533', '4.13952'] },
  { mass: '2', t1: ['2.34567', '2.22399', '2.21827'], t2: ['3.88888', '3.69096', '3.68289'] },
  { mass: '3', t1: ['2.18378', '2.08904', '2.07202'], t2: ['3.62535', '3.47217', '3.44796'] },
  { mass: '5', t1: ['1.95394', '1.96276', '1.95739'], t2: ['3.24778', '3.25945', '3.25232'] },
  { mass: '8', t1: ['1.73804', '1.74664', '1.74214'], t2: ['2.88871', '2.89908', '2.89512'] },
];

function blankReadings() {
  return new Array(READINGS).fill('');
}

function emptyGroups() {
  const groups = [];
  for (let index = 0; index < GROUP_COUNT; index += 1) {
    groups.push({ id: index, mass: '', t1: blankReadings(), t2: blankReadings() });
  }
  return groups;
}

function exampleGroups() {
  return EXAMPLE.map((group, index) => ({
    id: index,
    mass: group.mass,
    t1: group.t1.slice(),
    t2: group.t2.slice(),
  }));
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

    groups: emptyGroups(),
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

  // 每个输入框带 data-group（第几组）、data-field（mass/t1/t2）、data-index（第几次读数）
  onInput(event) {
    const dataset = event.currentTarget.dataset;
    const group = Number(dataset.group);
    const field = dataset.field;
    if (!Number.isInteger(group) || !field) return;
    const path = dataset.index === undefined || dataset.index === ''
      ? `groups[${group}].${field}`
      : `groups[${group}].${field}[${Number(dataset.index)}]`;
    this.setData({ [path]: event.detail.value, result: null, error: '' });
  },

  loadExample() {
    const fill = () => {
      this.setData({ groups: exampleGroups(), result: null, error: '' });
    };
    const filled = (value) => String(value === null || value === undefined ? '' : value).trim();
    const dirty = this.data.groups.some((group) => (
      filled(group.mass)
      || (group.t1 || []).some(filled)
      || (group.t2 || []).some(filled)
    ));
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
        this.setData({ groups: emptyGroups(), result: null, error: '' });
      },
    });
  },

  calculate() {
    try {
      const outcome = compute({ groups: this.data.groups });
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
    // 逐次读数 + 单位（均值，次数）：填了几次列几次，不合并、不省略
    const measure = (label, list, unit, meanText, count) =>
      `${label}：${readings(list)} ${unit}（均值 ${meanText}，${count} 次）`;

    const rawLines = [];
    result.groups.forEach((group) => {
      const source = this.data.groups[group.index - 1] || {};
      rawLines.push(`第 ${group.index} 组：砝码质量 m = ${group.massText} g`);
      rawLines.push(measure(`第 ${group.index} 组 t1`, source.t1, 's', group.t1Text, group.t1Count));
      rawLines.push(measure(`第 ${group.index} 组 t2`, source.t2, 's', group.t2Text, group.t2Count));
    });

    const rowLines = result.groups.map((group) => (
      `第 ${group.index} 组：t̄1 = ${group.t1Text} s，t̄2 = ${group.t2Text} s，`
      + `α = ${group.alphaText} rad/s²，M = ${group.torqueText} N·m`
    ));

    const lines = [
      '气垫法测刚体转动惯量',
      '',
      `实验常量：g = ${result.gText} m/s²，塔轮半径 r = ${result.radiusText} cm`,
      '',
      '原始数据：',
      ...rawLines,
      '',
      '各组结果（M = m·g·r，α 由 t1、t2 计算）：',
      ...rowLines,
      '',
      `最小二乘拟合（M = J·α + Mf，有效 ${result.fit.count} 组）：`,
      `转动惯量 J：${result.fit.slopeText} kg·m²`,
      `拟合截距 Mf：${result.fit.interceptText} N·m`,
      `相关系数 r：${result.fit.rText}`,
      '',
      `判读：${result.fit.verdict}`,
      `截距说明：${result.fit.interceptNote}`,
    ];

    wx.setClipboardData({
      data: lines.join('\n'),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }),
    });
  },
});
