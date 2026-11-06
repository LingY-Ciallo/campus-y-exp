// AI 改实验时，优先替换这个纯计算模块；不依赖 wx，便于手算核对与自动测试。
const MIN_ROWS = 2;
const MAX_ROWS = 20;

function parseNumber(value, label) {
  const text = String(value == null ? '' : value).trim();
  // 接受负数、小数和科学计数法，拒绝空值、十六进制、Infinity、尾随单位。
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
    throw new Error(`${label}请输入有效数字（单位请填在单位栏）`);
  }
  const result = Number(text);
  if (!Number.isFinite(result)) throw new Error(`${label}超出可计算范围`);
  return result;
}

function calculate(measurements, referenceValue) {
  if (!Array.isArray(measurements) || measurements.length < MIN_ROWS || measurements.length > MAX_ROWS) {
    throw new Error(`请填写 ${MIN_ROWS}～${MAX_ROWS} 组测量值`);
  }
  const values = measurements.map((value, index) => parseNumber(value, `第 ${index + 1} 组：`));
  const count = values.length;
  // 先除以 n 再相加，减小求和时溢出的机会；所有后续运算保留原始精度。
  const mean = values.reduce((sum, value) => sum + value / count, 0);
  const squaredDeviations = values.map(value => (value - mean) ** 2);
  const standardDeviation = Math.sqrt(squaredDeviations.reduce((sum, value) => sum + value, 0) / (count - 1));
  const uncertaintyA = standardDeviation / Math.sqrt(count);
  const referenceText = String(referenceValue == null ? '' : referenceValue).trim();
  let relativeError = null;
  if (referenceText !== '') {
    const reference = parseNumber(referenceText, '参考值：');
    if (reference === 0) throw new Error('参考值不能为 0；不计算相对误差时请留空');
    relativeError = Math.abs((mean - reference) / reference) * 100;
  }
  if (![mean, standardDeviation, uncertaintyA, ...squaredDeviations].every(Number.isFinite) ||
      (relativeError !== null && !Number.isFinite(relativeError))) {
    throw new Error('数据量级过大，请换算单位后重试');
  }
  return { count, values, mean, squaredDeviations, standardDeviation, uncertaintyA, relativeError };
}

function formatNumber(value) {
  // 仅显示时保留 6 位有效数字，不把舍入后的文本重新用于计算。
  return Number(value.toPrecision(6)).toString();
}

module.exports = { calculate, parseNumber, formatNumber, MIN_ROWS, MAX_ROWS };
