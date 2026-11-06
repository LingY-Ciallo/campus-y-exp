const { calculate, formatNumber, MIN_ROWS, MAX_ROWS } = require('./calculator');
const demoAppearance = require('./demo-appearance');

function emptyRows() {
  return Array.from({ length: 5 }, (_, index) => ({ id: index + 1, value: '' }));
}

Page({
  data: {
    // 在校园小音内由 app.js 的 Page 包装器注入当前主题；不要在 onShow 中写死主题。
    appearanceTheme: 'light', appearanceAccent: 'sky',
    demoMode: false, themeNames: [], accentNames: [], themeIndex: 0, accentIndex: 0,
    unit: 'mm', referenceValue: '', rows: emptyRows(),
    minRows: MIN_ROWS, maxRows: MAX_ROWS, result: null, error: ''
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
    if (this._themeListener && typeof wx.offThemeChange === 'function') wx.offThemeChange(this._themeListener);
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
  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    if (!['unit', 'referenceValue'].includes(field)) return;
    this.setData({ [field]: event.detail.value, result: null, error: '' });
  },
  onMeasurementInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || !this.data.rows[index]) return;
    this.setData({ [`rows[${index}].value`]: event.detail.value, result: null, error: '' });
  },
  addRow() {
    if (this.data.rows.length >= MAX_ROWS) return;
    const id = Math.max(...this.data.rows.map(row => row.id)) + 1;
    this.setData({ rows: this.data.rows.concat({ id, value: '' }), result: null, error: '' });
  },
  removeRow(event) {
    if (this.data.rows.length <= MIN_ROWS) return;
    const id = Number(event.currentTarget.dataset.id);
    this.setData({ rows: this.data.rows.filter(row => row.id !== id), result: null, error: '' });
  },
  loadExample() {
    const fill = () => this.setData({
      unit: 'mm', referenceValue: '10.00', error: '', result: null,
      rows: ['10.12', '10.15', '10.10', '10.14', '10.11'].map((value, index) => ({ id: index + 1, value }))
    });
    if (this.data.rows.some(row => row.value.trim()) || this.data.referenceValue.trim()) {
      wx.showModal({ title: '载入示例数据', content: '将替换当前输入，是否继续？', success: res => { if (res.confirm) fill(); } });
    } else fill();
  },
  resetForm() {
    wx.showModal({
      title: '清空本次数据', content: '清空测量值和结果？此操作无法撤销。',
      success: res => {
        if (res.confirm) this.setData({ unit: 'mm', referenceValue: '', rows: emptyRows(), result: null, error: '' });
      }
    });
  },
  calculate() {
    try {
      const unit = this.data.unit.trim();
      if (!unit) throw new Error('请填写测量单位；无量纲数据请填“无量纲”');
      const raw = calculate(this.data.rows.map(row => row.value), this.data.referenceValue);
      const result = {
        count: raw.count, unit, mean: formatNumber(raw.mean),
        standardDeviation: formatNumber(raw.standardDeviation), uncertaintyA: formatNumber(raw.uncertaintyA),
        hasRelativeError: raw.relativeError !== null,
        relativeError: raw.relativeError === null ? '' : formatNumber(raw.relativeError),
        details: raw.values.map((value, index) => ({
          index: index + 1, value: formatNumber(value), squaredDeviation: formatNumber(raw.squaredDeviations[index])
        }))
      };
      this.setData({ result, error: '' });
    } catch (error) {
      this.setData({ result: null, error: error.message });
    }
  },
  copyResult() {
    const result = this.data.result;
    if (!result) return;
    const lines = [
      '重复测量数据处理', `测量次数：${result.count}`,
      `平均值：${result.mean} ${result.unit}`,
      `样本标准差：${result.standardDeviation} ${result.unit}`,
      `A 类标准不确定度 uA：${result.uncertaintyA} ${result.unit}`
    ];
    if (result.hasRelativeError) lines.push(`相对误差：${result.relativeError}%`);
    lines.push('说明：仅含 A 类标准不确定度，未合成 B 类分量。', '原始测量值：');
    this.data.rows.forEach((row, index) => lines.push(`${index + 1}. ${row.value} ${result.unit}`));
    wx.setClipboardData({ data: lines.join('\n'), fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }) });
  }
});
