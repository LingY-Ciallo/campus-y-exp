// 拉脱法测液体表面张力系数 —— 纯计算，不依赖 wx
//
// 入参使用实验记录的原始单位：砝码 g、电压 mV、直径 mm
//
// 方法链（与随堂数据表一致）：
//   1) 力敏传感器定标（逐差法，8 组砝码对半分）：
//        K = [ mean(U5..U8) − mean(U1..U4) ] / [ mean(m5..m8) − mean(m1..m4) ] / 10
//      ΔU 用 mV、Δm 用 g 时，ΔU/Δm 的单位是 mV/g；除以 10 是数据表的折算约定
//      （ΔF = Δm·g，g 取 10 m/s²：m[g]/100 = ΔF[N]），得到 K 的单位 V/N
//   2) 圆环内径 D1、外径 D2 各测 5 次，取算术平均
//   3) 每次测量：ΔU = U1 − U2（拉脱前、拉脱后的电压读数差）
//   4) F = ΔU / K。ΔU 用 mV、K 用 V/N 时，F 的单位自动是 10⁻³ N（mN）
//   5) a = F / [π(D̄1 + D̄2)]。F 用 10⁻³ N、D 用 mm 时，a 的单位自动是 N/m
//      （10⁻³ N / 10⁻³ m）。数据表表头写的 a/(10⁻³N·m⁻¹) 是单位标注笔误，
//      数值 0.0731 与水在常温下的公认值 0.0728 N/m 同量级，页面按 N/m 显示

const PI = Math.PI;

// 定标折算常量：Δm[g] 折算成 ΔF[N] 时除以 100，等价于 (ΔU/Δm)/10，见文件头说明
const CALIB_DIVISOR = 10;

// 图表用 rpx 坐标：宽度决定在手机上的实际尺寸
// padLeft 需容纳纵轴刻度（形如 114.1 在 10px 字号下约 30px，320px 屏上 120rpx ≈ 51px）
const PLOT = { width: 560, height: 320, padLeft: 120, padRight: 18, padTop: 18, padBottom: 58 };
const TICK_GAP = 8; // 纵轴刻度右端与轴线之间的距离 rpx
const DOT = 14; // 散点直径 rpx

const CALIB_ROWS = 8; // 定标固定 8 组砝码（0～3.5 g，步长 0.5），逐差法对半分
const HALF = CALIB_ROWS / 2;
const DIAMETER_ROWS = 5; // 内、外径各测 5 次
const LIQUID_ROWS = 6; // 每种液体测 6 次 U1、U2

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

function trim(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return String(Number(value.toPrecision(digits || 6)));
}

function fixed(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function round(value, digits) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

// 定标输入：8 组砝码与电压都必须填写；0 是合法值（零点），但不允许负数
function calibrationCell(value, label, index, unit) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return { error: `定标第 ${index + 1} 组${label} 不能为空（${unit}）` };
  const number = toNumber(text);
  if (!Number.isFinite(number)) return { error: `定标第 ${index + 1} 组${label} 要填数字（${unit}）` };
  if (number < 0) return { error: `定标第 ${index + 1} 组${label} 不能为负（${unit}）` };
  return { value: number };
}

function calibrationOf(source) {
  const masses = cellsOf(source && source.masses);
  const voltages = cellsOf(source && source.voltages);
  const massValues = [];
  const voltageValues = [];
  for (let index = 0; index < CALIB_ROWS; index += 1) {
    const mass = calibrationCell(masses[index], '砝码质量 m', index, 'g');
    if (mass.error) return mass;
    const voltage = calibrationCell(voltages[index], '电压 U', index, 'mV');
    if (voltage.error) return voltage;
    massValues.push(mass.value);
    voltageValues.push(voltage.value);
  }

  const frontMass = average(massValues.slice(0, HALF));
  const backMass = average(massValues.slice(HALF));
  const frontVolt = average(voltageValues.slice(0, HALF));
  const backVolt = average(voltageValues.slice(HALF));
  const deltaMass = backMass - frontMass; // g
  const deltaVolt = backVolt - frontVolt; // mV
  if (!(deltaMass > 0)) {
    return { error: '定标砝码质量后 4 组的平均值必须大于前 4 组（g），请检查砝码是否从小到大排列' };
  }
  if (!(deltaVolt > 0)) {
    return { error: '定标电压后 4 组的平均值必须大于前 4 组（mV），电压应随砝码增大，请检查读数' };
  }

  const slope = deltaVolt / deltaMass; // mV/g
  const k = slope / CALIB_DIVISOR; // V/N
  if (!(k > 0)) return { error: '力敏传感器灵敏度 K 计算异常（≤0），请检查定标数据' };

  return {
    massValues,
    voltageValues,
    deltaMass,
    deltaVolt,
    slope,
    k,
    deltaMassText: trim(deltaMass, 6),
    deltaVoltText: trim(deltaVolt, 6),
    slopeText: trim(slope, 6),
    kText: trim(k, 6),
  };
}

// 直径读数：只忽略真正空白的格子，填了的内容必须是有限正数
function diameterAverage(values, label) {
  const list = cellsOf(values);
  const numbers = [];
  for (let i = 0; i < list.length; i += 1) {
    const text = list[i] === null || list[i] === undefined ? '' : String(list[i]).trim();
    if (!text) continue;
    const number = toNumber(text);
    if (!Number.isFinite(number)) return { error: `${label} 第 ${i + 1} 次测量要填数字（mm）` };
    if (!(number > 0)) return { error: `${label} 第 ${i + 1} 次测量必须大于 0（mm）` };
    numbers.push(number);
  }
  if (!numbers.length) return { error: `${label} 至少要填一次测量（mm）` };
  return { value: numbers.reduce((sum, value) => sum + value, 0) / numbers.length, count: numbers.length };
}

// 每行 U1、U2 成对填写；两个电压本身允许为负（拉脱后读数可能是小负数），但 ΔU 必须为正
function liquidRow(u1raw, u2raw, name, index) {
  const t1 = String(u1raw === null || u1raw === undefined ? '' : u1raw).trim();
  const t2 = String(u2raw === null || u2raw === undefined ? '' : u2raw).trim();
  if (!t1 && !t2) return { blank: true };
  if (!t1) return { error: `${name}第 ${index + 1} 次缺 U1：U1、U2 要成对填写（mV）` };
  if (!t2) return { error: `${name}第 ${index + 1} 次缺 U2：U1、U2 要成对填写（mV）` };
  const u1 = toNumber(t1);
  if (!Number.isFinite(u1)) return { error: `${name}第 ${index + 1} 次 U1 要填数字（mV）` };
  const u2 = toNumber(t2);
  if (!Number.isFinite(u2)) return { error: `${name}第 ${index + 1} 次 U2 要填数字（mV）` };
  const deltaU = u1 - u2;
  if (!(deltaU > 0)) {
    return { error: `${name}第 ${index + 1} 次 U1 − U2 ≤ 0，请检查两个电压是否填反（拉脱前 U1 应大于拉脱后 U2）` };
  }
  return { u1, u2, deltaU, u1Text: trim(u1, 6), u2Text: trim(u2, 6), dUText: trim(deltaU, 6) };
}

// U–m 定标图：散点为 8 组读数，参考线是过原点、斜率为逐差斜率（mV/g）的直线
function buildCalibrationPlot(massValues, voltageValues, slope) {
  const innerWidth = PLOT.width - PLOT.padLeft - PLOT.padRight;
  const innerHeight = PLOT.height - PLOT.padTop - PLOT.padBottom;
  const xMax = Math.max.apply(null, massValues) * 1.08;
  const yHigh = Math.max(slope * xMax, Math.max.apply(null, voltageValues)) * 1.08;

  const xOf = (x) => PLOT.padLeft + (x / xMax) * innerWidth;
  const yOf = (y) => PLOT.padTop + (1 - y / yHigh) * innerHeight;

  const points = massValues.map((mass, index) => ({
    index,
    left: round(xOf(mass) - DOT / 2, 1),
    top: round(yOf(voltageValues[index]) - DOT / 2, 1),
  }));

  // 参考线从原点画到 x 轴右端，超出绘图区上边界时裁掉
  const yAtXMax = slope * xMax;
  const xEnd = yAtXMax <= yHigh ? xMax : yHigh / slope;
  const screenStart = { x: xOf(0), y: yOf(0) };
  const screenEnd = { x: xOf(xEnd), y: yOf(slope * xEnd) };
  const dx = screenEnd.x - screenStart.x;
  const dy = screenEnd.y - screenStart.y;

  return {
    width: PLOT.width,
    height: PLOT.height,
    padLeft: PLOT.padLeft,
    padTop: PLOT.padTop,
    innerWidth,
    innerHeight,
    axisY: round(PLOT.padTop + innerHeight, 1),
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
      { index: 0, right: round(PLOT.width - PLOT.padLeft + TICK_GAP, 1), top: round(PLOT.padTop - 10, 1), text: yHigh.toFixed(1) },
      { index: 1, right: round(PLOT.width - PLOT.padLeft + TICK_GAP, 1), top: round(PLOT.padTop + innerHeight - 10, 1), text: '0' },
    ],
  };
}

function compute(input) {
  const source = input || {};

  const calibration = calibrationOf(source.calibration);
  if (calibration.error) return calibration;

  const d1 = diameterAverage((source.diameters || {}).d1, '内径 D1');
  if (d1.error) return d1;
  const d2 = diameterAverage((source.diameters || {}).d2, '外径 D2');
  if (d2.error) return d2;
  const loopLength = PI * (d1.value + d2.value); // mm，圆环周长 π(D1+D2)

  const liquidSources = Array.isArray(source.liquids) ? source.liquids : [];
  const liquids = [];
  for (let li = 0; li < liquidSources.length; li += 1) {
    const item = liquidSources[li] || {};
    const name = String(item.name || `液体${li + 1}`).trim() || `液体${li + 1}`;
    const u1List = cellsOf(item.u1);
    const u2List = cellsOf(item.u2);
    const rowCount = Math.max(u1List.length, u2List.length);
    const rows = [];
    for (let index = 0; index < rowCount; index += 1) {
      const row = liquidRow(u1List[index], u2List[index], name, index);
      if (row.error) return row;
      if (row.blank) continue;
      const force = row.deltaU / calibration.k; // 10⁻³ N
      const alpha = force / loopLength; // N/m
      rows.push({
        index: index + 1,
        u1Text: row.u1Text,
        u2Text: row.u2Text,
        dUText: row.dUText,
        fText: fixed(force, 4),
        aText: fixed(alpha, 5),
        _alpha: alpha,
      });
    }
    if (rows.length) {
      const meanAlpha = rows.reduce((sum, row) => sum + row._alpha, 0) / rows.length;
      rows.forEach((row) => { delete row._alpha; });
      liquids.push({
        name,
        count: rows.length,
        rows,
        meanAText: fixed(meanAlpha, 5),
      });
    }
  }
  if (!liquids.length) {
    return { error: '还没有填写液体测量数据：盐水或水至少要填一行 U1、U2' };
  }

  let verdict = '';
  if (liquids.length === 2) {
    const brineMean = Number(liquids[0].meanAText);
    const waterMean = Number(liquids[1].meanAText);
    verdict = brineMean > waterMean
      ? '盐水平均表面张力系数大于水，符合加盐使表面张力升高的规律。'
      : '盐水平均表面张力系数不大于水，与常见规律不符，请检查两组液体是否填反或读数有误。';
  }

  return {
    result: {
      calibration: {
        deltaMassText: calibration.deltaMassText,
        deltaVoltText: calibration.deltaVoltText,
        slopeText: calibration.slopeText,
        kText: calibration.kText,
        frontVoltText: trim(average(calibration.voltageValues.slice(0, HALF)), 6),
        backVoltText: trim(average(calibration.voltageValues.slice(HALF)), 6),
        plot: buildCalibrationPlot(calibration.massValues, calibration.voltageValues, calibration.slope),
      },
      diameters: {
        d1Text: trim(d1.value, 6),
        d2Text: trim(d2.value, 6),
        d1Count: d1.count,
        d2Count: d2.count,
        loopText: trim(loopLength, 6),
      },
      liquids,
      verdict,
      divisorText: String(CALIB_DIVISOR),
    },
  };
}

module.exports = {
  compute,
  average,
  toNumber,
  CALIB_ROWS,
  DIAMETER_ROWS,
  LIQUID_ROWS,
  CALIB_DIVISOR,
};
