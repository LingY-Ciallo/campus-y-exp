const { compute } = require('./calculator');
const demoAppearance = require('./demo-appearance');

// 固定行数，与实验记录表一致：定标 8 组砝码、内/外径各 5 次、每种液体 6 次
const CALIB_ROWS = 8;
const DIAMETER_ROWS = 5;
const LIQUID_ROWS = 6;

// 示例数据 = 随堂记录表原始读数
const EXAMPLE = {
  calibration: [
    ['0', '0'], ['0.5', '14.2'], ['1', '28.1'], ['1.5', '43.1'],
    ['2', '56.2'], ['2.5', '70.6'], ['3', '84.2'], ['3.5', '97.9'],
  ],
  d1: ['32.92', '32.94', '32.88', '32.90', '32.92'],
  d2: ['34.80', '34.74', '34.78', '34.76', '34.84'],
  liquids: [
    {
      name: '盐水',
      rows: [
        ['49.3', '0.1'], ['48.8', '-0.3'], ['49.0', '0.2'],
        ['48.9', '-0.1'], ['49.1', '-0.2'], ['49.0', '0.1'],
      ],
    },
    {
      name: '水',
      rows: [
        ['44.0', '-0.4'], ['42.9', '-0.2'], ['43.2', '-0.5'],
        ['42.7', '-0.3'], ['43.1', '-0.4'], ['42.8', '-0.1'],
      ],
    },
  ],
};

// 直径读数用 { id, value }：wx:for 有稳定 key，计算时再取出纯数值
function blankCells(count) {
  const cells = [];
  for (let index = 0; index < count; index += 1) {
    cells.push({ id: index, value: '' });
  }
  return cells;
}

function cellsOf(values) {
  return (values || []).map((text, index) => ({ id: index, value: text }));
}

function emptyCalibration() {
  const rows = [];
  for (let index = 0; index < CALIB_ROWS; index += 1) {
    rows.push({ id: index, mass: '', voltage: '' });
  }
  return rows;
}

function emptyLiquids() {
  return EXAMPLE.liquids.map((liquid, liquidIndex) => {
    const rows = [];
    for (let rowIndex = 0; rowIndex < LIQUID_ROWS; rowIndex += 1) {
      rows.push({ id: rowIndex, u1: '', u2: '' });
    }
    return { id: liquidIndex, name: liquid.name, rows };
  });
}

function emptyDiameters() {
  return { d1: blankCells(DIAMETER_ROWS), d2: blankCells(DIAMETER_ROWS) };
}

function exampleCalibration() {
  return EXAMPLE.calibration.map((pair, index) => ({
    id: index, mass: pair[0], voltage: pair[1],
  }));
}

function exampleLiquids() {
  return EXAMPLE.liquids.map((liquid, liquidIndex) => ({
    id: liquidIndex,
    name: liquid.name,
    rows: liquid.rows.map((pair, rowIndex) => ({ id: rowIndex, u1: pair[0], u2: pair[1] })),
  }));
}

function exampleDiameters() {
  return { d1: cellsOf(EXAMPLE.d1), d2: cellsOf(EXAMPLE.d2) };
}

function filled(value) {
  return String(value === null || value === undefined ? '' : value).trim();
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

    calibration: emptyCalibration(),
    diameters: emptyDiameters(),
    liquids: emptyLiquids(),
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

  // 定标：data-index 第几组、data-field mass / voltage
  onCalibrationInput(event) {
    const dataset = event.currentTarget.dataset;
    const index = Number(dataset.index);
    const field = dataset.field;
    if (!Number.isInteger(index) || !field) return;
    this.setData({ [`calibration[${index}].${field}`]: event.detail.value, result: null, error: '' });
  },

  // 直径：data-field d1 / d2、data-index 第几次
  onDiameterInput(event) {
    const dataset = event.currentTarget.dataset;
    const field = dataset.field;
    const index = Number(dataset.index);
    if (!field || !Number.isInteger(index)) return;
    this.setData({ [`diameters.${field}[${index}].value`]: event.detail.value, result: null, error: '' });
  },

  // 液体：data-liquid 第几种、data-index 第几次、data-field u1 / u2
  onLiquidInput(event) {
    const dataset = event.currentTarget.dataset;
    const liquid = Number(dataset.liquid);
    const index = Number(dataset.index);
    const field = dataset.field;
    if (!Number.isInteger(liquid) || !Number.isInteger(index) || !field) return;
    this.setData({ [`liquids[${liquid}].rows[${index}].${field}`]: event.detail.value, result: null, error: '' });
  },

  loadExample() {
    const fill = () => {
      this.setData({
        calibration: exampleCalibration(),
        diameters: exampleDiameters(),
        liquids: exampleLiquids(),
        result: null,
        error: '',
      });
    };
    const dirty = this.data.calibration.some((row) => filled(row.mass) || filled(row.voltage))
      || (this.data.diameters.d1 || []).some((cell) => filled(cell.value))
      || (this.data.diameters.d2 || []).some((cell) => filled(cell.value))
      || this.data.liquids.some((liquid) => (liquid.rows || []).some(
        (row) => filled(row.u1) || filled(row.u2),
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
        this.setData({
          calibration: emptyCalibration(),
          diameters: emptyDiameters(),
          liquids: emptyLiquids(),
          result: null,
          error: '',
        });
      },
    });
  },

  calculate() {
    try {
      const outcome = compute({
        calibration: {
          masses: this.data.calibration.map((row) => row.mass),
          voltages: this.data.calibration.map((row) => row.voltage),
        },
        diameters: {
          d1: (this.data.diameters.d1 || []).map((cell) => cell.value),
          d2: (this.data.diameters.d2 || []).map((cell) => cell.value),
        },
        liquids: this.data.liquids.map((liquid) => ({
          name: liquid.name,
          u1: (liquid.rows || []).map((row) => row.u1),
          u2: (liquid.rows || []).map((row) => row.u2),
        })),
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
    const join = (list) => (list || []).map(filled).filter((value) => value).join(' / ');
    // 直径逐次列出：均值只作汇总，原始读数一次也不能少
    const measure = (label, list, unit, meanText, count) =>
      `${label}：${join(list)} ${unit}（均值 ${meanText}，${count} 次）`;

    const lines = ['拉脱法测液体表面张力系数', '', '原始数据：'];
    lines.push(`定标砝码 m：${join(this.data.calibration.map((row) => row.mass))} g`);
    lines.push(`定标电压 U：${join(this.data.calibration.map((row) => row.voltage))} mV（与砝码一一对应）`);
    lines.push(measure('圆环内径 D1', this.data.diameters.d1.map((cell) => cell.value), 'mm', result.diameters.d1Text, result.diameters.d1Count));
    lines.push(measure('圆环外径 D2', this.data.diameters.d2.map((cell) => cell.value), 'mm', result.diameters.d2Text, result.diameters.d2Count));
    this.data.liquids.forEach((liquid) => {
      lines.push(`${liquid.name} U1：${join((liquid.rows || []).map((row) => row.u1))} mV`);
      lines.push(`${liquid.name} U2：${join((liquid.rows || []).map((row) => row.u2))} mV`);
    });

    lines.push('', '定标结果（逐差法：前 4 组与后 4 组）：');
    lines.push(`ΔU = ${result.calibration.deltaVoltText} mV，Δm = ${result.calibration.deltaMassText} g，斜率 = ${result.calibration.slopeText} mV/g`);
    lines.push(`灵敏度 K = ${result.calibration.kText} V/N`);
    lines.push('', '圆环尺寸：');
    lines.push(`D̄1 = ${result.diameters.d1Text} mm，D̄2 = ${result.diameters.d2Text} mm，`
      + `L = π(D̄1 + D̄2) = ${result.diameters.loopText} mm`);

    lines.push('', '各液体结果：');
    result.liquids.forEach((liquid) => {
      lines.push(`${liquid.name}（${liquid.count} 次）：`);
      liquid.rows.forEach((row) => {
        lines.push(`  第 ${row.index} 次：U1 = ${row.u1Text} mV，U2 = ${row.u2Text} mV，`
          + `ΔU = ${row.dUText} mV，F = ${row.fText} mN，a = ${row.aText} N/m`);
      });
      lines.push(`  平均 a = ${liquid.meanAText} N/m`);
    });
    if (result.verdict) {
      lines.push('', `判读：${result.verdict}`);
    }
    lines.push(`说明：定标按数据表约定把 Δm(g) 换算成 ΔF(N) 时除以 ${result.divisorText}（等价于 g 取 10 m/s²）；`
      + '表面张力系数 a 的单位是 N/m，不是 mN/m。');

    wx.setClipboardData({
      data: lines.join('\n'),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }),
    });
  },
});
