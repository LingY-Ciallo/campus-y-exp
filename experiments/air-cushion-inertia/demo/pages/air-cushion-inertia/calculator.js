// 气垫法测刚体转动惯量 —— 纯计算，不依赖 wx
//
// 入参使用实验记录的原始单位：砝码质量 g、计时 s
// 固定常量（与实验记录表一致）：重力加速度 g = 9.8 m/s²，塔轮半径 r = 2.00 cm
//
// 方法链：
//   1) 每组 t1、t2 各取算术平均。t1 是动盘从同一初态转过 1 周用时，t2 是转过 2 周用时
//   2) 匀角加速 θ = ω0·t + α·t²/2，代入 (2π, t1) 与 (4π, t2) 消去 ω0：
//        α = 4π(2/t̄2 − 1/t̄1) / (t̄2 − t̄1)
//   3) 力矩 M = m·g·r
//   4) 最小二乘拟合 M = J·α + Mf：斜率 J 即转动惯量，截距 Mf 为阻力矩
//   5) 相关系数 r = Sxy / √(Sxx·Syy)，用来判断 M 与 α 是否成线性

const G = 9.8;
const R = 0.02; // 塔轮半径 2.00 cm
const FOUR_PI = 4 * Math.PI;

// 图表用 rpx 坐标：宽度决定在手机上的实际尺寸
// padLeft 需容纳纵轴刻度（形如 -1.47e-3 在 10px 字号下约 45px，320px 屏上 120rpx ≈ 51px）
// padBottom 要放下横轴刻度并与纵轴端点刻度错开一行
const PLOT = { width: 560, height: 320, padLeft: 120, padRight: 18, padTop: 18, padBottom: 58 };
const TICK_GAP = 8; // 纵轴刻度右端与轴线之间的距离 rpx
const DOT = 14; // 散点直径 rpx

function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  const text = String(value).trim();
  if (!text) return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function cellsOf(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [''];
  return [value];
}

function isBlank(value) {
  return String(value === null || value === undefined ? '' : value).trim() === '';
}

function average(values) {
  const numbers = (values || []).map(toNumber).filter(Number.isFinite);
  if (!numbers.length) return NaN;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

// 单值输入（砝码质量）：不能留空，必须填大于 0 的数字
function positiveSingle(value, label, unit) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return { error: `${label} 不能为空（${unit}）` };
  const number = toNumber(text);
  if (!Number.isFinite(number)) return { error: `${label} 要填数字（${unit}）` };
  if (!(number > 0)) return { error: `${label} 必须大于 0（${unit}）` };
  return { value: number, count: 1 };
}

// 多次读数：只忽略真正空白的格子，填了的内容必须是有限正数
function positiveAverage(values, label, unit) {
  const list = cellsOf(values);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < list.length; i += 1) {
    const text = list[i] === null || list[i] === undefined ? '' : String(list[i]).trim();
    if (!text) continue;
    const number = toNumber(text);
    if (!Number.isFinite(number)) {
      return { error: `${label} 第 ${i + 1} 次测量要填数字（${unit}）` };
    }
    if (!(number > 0)) {
      return { error: `${label} 第 ${i + 1} 次测量必须大于 0（${unit}）` };
    }
    sum += number;
    count += 1;
  }
  if (!count) return { error: `${label} 至少要填一次测量（${unit}）` };
  return { value: sum / count, count };
}

function trim(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return String(Number(value.toPrecision(digits || 6)));
}

function sci(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return value.toExponential(digits || 4);
}

// 角加速度：θ = ω0·t + α·t²/2 分别代入 (2π, t1)、(4π, t2)，消去 ω0 得该式
function angularAcceleration(t1, t2) {
  if (!(t1 > 0) || !(t2 > t1)) return NaN;
  return (FOUR_PI * (2 / t2 - 1 / t1)) / (t2 - t1);
}

// 砝码经细线绕塔轮产生的力矩 M = m·g·r
function torque(massGram) {
  if (!(massGram > 0)) return NaN;
  return (massGram / 1000) * G * R;
}

function leastSquares(points) {
  const n = points.length;
  if (n < 2) return null;
  const xbar = points.reduce((sum, point) => sum + point.x, 0) / n;
  const ybar = points.reduce((sum, point) => sum + point.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  points.forEach((point) => {
    const dx = point.x - xbar;
    const dy = point.y - ybar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  });
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  const denominator = Math.sqrt(sxx * syy);
  const r = denominator > 0 ? sxy / denominator : NaN;
  return { slope, intercept, r, n, xbar, ybar, sxx, sxy, syy };
}

function round(value, digits) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

// 把 (α, M) 散点与拟合直线换算成 rpx 绝对定位；x 轴从 0 起，好让截距直接看得见
function buildPlot(groups, fit) {
  const innerWidth = PLOT.width - PLOT.padLeft - PLOT.padRight;
  const innerHeight = PLOT.height - PLOT.padTop - PLOT.padBottom;
  const xMax = Math.max.apply(null, groups.map((group) => group.alpha)) * 1.08;
  const torques = groups.map((group) => group.torque);
  const lineAtXMax = fit.slope * xMax + fit.intercept;

  let yLow = Math.min(0, fit.intercept, Math.min.apply(null, torques));
  let yHigh = Math.max(0, Math.max.apply(null, torques), lineAtXMax);
  const rawSpan = yHigh - yLow;
  yLow -= rawSpan * 0.08;
  yHigh += rawSpan * 0.08;

  const xOf = (x) => PLOT.padLeft + (x / xMax) * innerWidth;
  const yOf = (y) => PLOT.padTop + (1 - (y - yLow) / (yHigh - yLow)) * innerHeight;

  const points = groups.map((group, index) => ({
    index,
    left: round(xOf(group.alpha) - DOT / 2, 1),
    top: round(yOf(group.torque) - DOT / 2, 1),
  }));

  // 直线与绘图区上下边界求交，超出部分裁掉
  const candidates = [0, xMax];
  if (fit.slope !== 0) {
    candidates.push((yLow - fit.intercept) / fit.slope);
    candidates.push((yHigh - fit.intercept) / fit.slope);
  }
  const inside = candidates.filter((x) => x >= 0 && x <= xMax);
  const xStart = Math.min.apply(null, inside);
  const xEnd = Math.max.apply(null, inside);
  const screenStart = { x: xOf(xStart), y: yOf(fit.slope * xStart + fit.intercept) };
  const screenEnd = { x: xOf(xEnd), y: yOf(fit.slope * xEnd + fit.intercept) };
  const dx = screenEnd.x - screenStart.x;
  const dy = screenEnd.y - screenStart.y;

  const zeroTop = 0 >= yLow && 0 <= yHigh ? round(yOf(0), 1) : null;

  return {
    width: PLOT.width,
    height: PLOT.height,
    padLeft: PLOT.padLeft,
    padTop: PLOT.padTop,
    innerWidth,
    innerHeight,
    axisY: round(PLOT.padTop + innerHeight, 1),
    zeroTop,
    points,
    line: {
      left: round(screenStart.x, 1),
      top: round(screenStart.y, 1),
      width: round(Math.sqrt(dx * dx + dy * dy), 1),
      angle: round((Math.atan2(dy, dx) * 180) / Math.PI, 2),
    },
    xTicks: [
      { index: 0, left: round(PLOT.padLeft - 30, 1), top: round(PLOT.padTop + innerHeight + 26, 1), text: '0' },
      { index: 1, left: round(PLOT.padLeft + innerWidth - 30, 1), top: round(PLOT.padTop + innerHeight + 26, 1), text: xMax.toFixed(2) },
    ],
    yTicks: [
      { index: 0, right: round(PLOT.width - PLOT.padLeft + TICK_GAP, 1), top: round(PLOT.padTop - 10, 1), text: yHigh.toExponential(2) },
      { index: 1, right: round(PLOT.width - PLOT.padLeft + TICK_GAP, 1), top: round(PLOT.padTop + innerHeight - 10, 1), text: yLow.toExponential(2) },
    ],
  };
}

function verdictOf(fit) {
  if (!Number.isFinite(fit.r)) return '相关系数无法计算，请检查各组角加速度是否相同。';
  if (fit.r >= 0.9995) return 'r 已非常接近 1，M 与 α 严格成正比，刚体转动定律成立。';
  if (fit.r >= 0.99) return 'r > 0.99，M 与 α 线性关系良好，刚体转动定律成立。';
  if (fit.r >= 0.95) return 'r 在 0.95～0.99 之间，线性尚可，建议检查读数是否有明显偏差。';
  return 'r 偏低，M 与 α 的线性关系不明显，建议复核计时与砝码质量。';
}

function interceptNoteOf(fit) {
  if (!Number.isFinite(fit.intercept)) return '';
  if (Math.abs(fit.intercept) < 1e-12) return '截距为 0，力矩与角加速度严格成正比，未观察到阻力矩。';
  if (fit.intercept > 0) {
    return '截距为正，对应轴系阻力矩 Mf；J 取斜率，不受截距影响。';
  }
  return '截距为负：阻力矩不可能为负，说明单向测量存在系统偏差（零转未完全消除或计时误差），J 以斜率为准。';
}

function compute(input) {
  const source = input || {};
  const groups = Array.isArray(source.groups) ? source.groups : [];

  const rows = [];
  for (let index = 0; index < groups.length; index += 1) {
    const raw = groups[index] || {};
    const label = `第 ${index + 1} 组`;
    const everyCell = [raw.mass].concat(cellsOf(raw.t1), cellsOf(raw.t2));
    if (everyCell.every(isBlank)) continue; // 整组留空 → 该组不参与计算

    const mass = positiveSingle(raw.mass, `${label}砝码质量 m`, 'g');
    if (mass.error) return { error: mass.error };
    const t1 = positiveAverage(raw.t1, `${label} t1`, 's');
    if (t1.error) return { error: t1.error };
    const t2 = positiveAverage(raw.t2, `${label} t2`, 's');
    if (t2.error) return { error: t2.error };

    if (!(t2.value > t1.value)) {
      return { error: `${label} 的 t2 平均值必须大于 t1（t2 是转过 2 周的用时）` };
    }
    const alpha = angularAcceleration(t1.value, t2.value);
    if (!(alpha > 0)) {
      return { error: `${label} 角加速度计算异常（≤0），请检查 t1、t2 是否填反` };
    }
    const torqueValue = torque(mass.value);
    if (!(torqueValue > 0)) {
      return { error: `${label} 力矩计算失败，请检查砝码质量` };
    }

    rows.push({
      index: index + 1,
      mass: mass.value,
      t1: t1.value,
      t2: t2.value,
      alpha,
      torque: torqueValue,
      t1Count: t1.count,
      t2Count: t2.count,
    });
  }

  if (!rows.length) {
    return { error: '还没有填写有效数据：至少需要 2 组（砝码质量 + t1 + t2）才能拟合' };
  }
  if (rows.length < 2) {
    return { error: `只填写了 ${rows.length} 组有效数据，至少需要 2 组才能拟合 M–α 直线` };
  }

  const fit = leastSquares(rows.map((row) => ({ x: row.alpha, y: row.torque })));
  if (!fit) return { error: '各组角加速度完全相同，无法拟合 M–α 直线，请检查数据' };
  if (!(fit.slope > 0)) {
    return { error: '拟合斜率不为正（J ≤ 0），请检查砝码质量与 t1、t2 是否一一对应' };
  }

  const result = {
    groups: rows.map((row) => ({
      index: row.index,
      massText: trim(row.mass, 6),
      t1Text: trim(row.t1, 6),
      t2Text: trim(row.t2, 6),
      alpha: row.alpha,
      alphaText: row.alpha.toFixed(4),
      torque: row.torque,
      torqueText: sci(row.torque, 3),
      t1Count: row.t1Count,
      t2Count: row.t2Count,
    })),
    fit: {
      slope: fit.slope,
      slopeText: sci(fit.slope, 4),
      intercept: fit.intercept,
      interceptText: Math.abs(fit.intercept) < 5e-7 ? '0.0000e+0' : sci(fit.intercept, 4),
      r: fit.r,
      rText: Number.isFinite(fit.r) ? fit.r.toFixed(4) : '—',
      count: fit.n,
      verdict: verdictOf(fit),
      interceptNote: interceptNoteOf(fit),
    },
    plot: buildPlot(rows, fit),
    gText: String(G),
    radiusText: '2.00',
  };

  return { result };
}

module.exports = {
  compute,
  average,
  toNumber,
  positiveSingle,
  positiveAverage,
  angularAcceleration,
  torque,
  leastSquares,
  buildPlot,
  G,
  R,
};
