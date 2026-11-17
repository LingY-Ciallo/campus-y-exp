const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compute,
  average,
  toNumber,
  CALIB_ROWS,
  DIAMETER_ROWS,
  LIQUID_ROWS,
  MASS_TO_FORCE_DIVISOR,
  SLOPE_DIVISOR,
} = require('../pages/surface-tension/calculator');

// 实验 8 原始数据：定标砝码 0～3.5 g 共 8 组；内、外径各 5 次；盐水、水各 6 次 U1、U2
const CALIBRATION = {
  masses: ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5'],
  voltages: ['0', '14.2', '28.1', '43.1', '56.2', '70.6', '84.2', '97.9'],
};
const DIAMETERS = {
  d1: ['32.92', '32.94', '32.88', '32.90', '32.92'],
  d2: ['34.80', '34.74', '34.78', '34.76', '34.84'],
};
const LIQUIDS = [
  { name: '盐水', u1: ['49.3', '48.8', '49.0', '48.9', '49.1', '49.0'], u2: ['0.1', '-0.3', '0.2', '-0.1', '-0.2', '0.1'] },
  { name: '水', u1: ['44.0', '42.9', '43.2', '42.7', '43.1', '42.8'], u2: ['-0.4', '-0.2', '-0.5', '-0.3', '-0.4', '-0.1'] },
];

function payload(overrides) {
  return Object.assign({
    calibration: { masses: CALIBRATION.masses.slice(), voltages: CALIBRATION.voltages.slice() },
    diameters: { d1: DIAMETERS.d1.slice(), d2: DIAMETERS.d2.slice() },
    liquids: LIQUIDS.map((liquid) => ({ name: liquid.name, u1: liquid.u1.slice(), u2: liquid.u2.slice() })),
  }, overrides);
}

test('定标：逐差法得到斜率 27.9375 mV/g、灵敏度 K = 2.79375 V/N', () => {
  const { result, error } = compute(payload());
  assert.equal(error, undefined);
  const { calibration } = result;
  assert.equal(calibration.frontVoltText, '21.35');
  assert.equal(calibration.backVoltText, '77.225');
  assert.equal(calibration.deltaVoltText, '55.875');
  assert.equal(calibration.deltaMassText, '2');
  assert.equal(calibration.slopeText, '27.9375');
  assert.equal(calibration.kText, '2.79375');
  assert.equal(result.massToForceDivisorText, String(MASS_TO_FORCE_DIVISOR));
  assert.equal(result.slopeDivisorText, String(SLOPE_DIVISOR));
  assert.equal(MASS_TO_FORCE_DIVISOR, 100, 'ΔF(N) = Δm(g) / 100（g 取 10）');
  assert.equal(SLOPE_DIVISOR, 10, '斜率 mV/g → K V/N 时除以 10');
});

test('圆环尺寸：内外径取其平均，周长 L = π(D̄1 + D̄2)', () => {
  const { result } = compute(payload());
  assert.equal(result.diameters.d1Text, '32.912');
  assert.equal(result.diameters.d2Text, '34.784');
  assert.equal(result.diameters.d1Count, 5);
  assert.equal(result.diameters.d2Count, 5);
  // π × (32.912 + 34.784) = 212.673 mm
  assert.equal(result.diameters.loopText, '212.673');
});

test('盐水 6 次的 ΔU、F、a 与平均值复现实验记录表', () => {
  const { result } = compute(payload());
  const brine = result.liquids[0];
  assert.equal(brine.name, '盐水');
  assert.equal(brine.count, 6);
  assert.deepEqual(brine.rows.map((row) => row.dUText), ['49.2', '49.1', '48.8', '49', '49.3', '48.9']);
  assert.deepEqual(brine.rows.map((row) => row.fText), ['17.6107', '17.5749', '17.4676', '17.5391', '17.6465', '17.5034']);
  assert.deepEqual(brine.rows.map((row) => row.aText), ['0.08281', '0.08264', '0.08213', '0.08247', '0.08297', '0.08230']);
  assert.equal(brine.meanAText, '0.08255');
});

test('水 6 次的 ΔU、F、a 与平均值复现实验记录表', () => {
  const { result } = compute(payload());
  const water = result.liquids[1];
  assert.equal(water.name, '水');
  assert.equal(water.count, 6);
  assert.deepEqual(water.rows.map((row) => row.dUText), ['44.4', '43.1', '43.7', '43', '43.5', '42.9']);
  assert.deepEqual(water.rows.map((row) => row.fText), ['15.8926', '15.4273', '15.6421', '15.3915', '15.5705', '15.3557']);
  assert.deepEqual(water.rows.map((row) => row.aText), ['0.07473', '0.07254', '0.07355', '0.07237', '0.07321', '0.07220']);
  assert.equal(water.meanAText, '0.07310');
});

test('拉脱后电压允许为负，ΔU 按 U1 − U2 计算', () => {
  const { result } = compute(payload());
  const row = result.liquids[0].rows[1];
  assert.equal(row.u1Text, '48.8');
  assert.equal(row.u2Text, '-0.3');
  assert.equal(row.dUText, '49.1');
});

test('判读：盐水表面张力系数大于水，符合加盐使表面张力升高的规律', () => {
  const { result } = compute(payload());
  assert.match(result.verdict, /盐水.*大于水/);
  assert.match(result.verdict, /加盐/);
});

test('只填一种液体时也能算，且不输出两种液体的比较结论', () => {
  const { result, error } = compute(payload({ liquids: [{ name: '水', u1: ['44.0'], u2: ['-0.4'] }] }));
  assert.equal(error, undefined);
  assert.equal(result.liquids.length, 1);
  assert.equal(result.liquids[0].count, 1);
  assert.equal(result.liquids[0].meanAText, '0.07473');
  assert.equal(result.verdict, '');
});

test('液体行整行留空跳过，只填一半要点名缺哪一项', () => {
  const onlyOne = payload();
  onlyOne.liquids[0].u1 = ['49.3', '', '', '', '', ''];
  onlyOne.liquids[0].u2 = ['0.1', '', '', '', '', ''];
  const { result } = compute(onlyOne);
  assert.equal(result.liquids[0].count, 1);

  const halfRow = payload();
  halfRow.liquids[0].u2[3] = '';
  assert.match(compute(halfRow).error, /盐水第 4 次缺 U2/);

  const halfRow2 = payload();
  halfRow2.liquids[1].u1[0] = '';
  assert.match(compute(halfRow2).error, /水第 1 次缺 U1/);
});

test('U1 − U2 ≤ 0 报错并提示可能填反', () => {
  const flipped = payload();
  flipped.liquids[0].u1[2] = '0.2';
  flipped.liquids[0].u2[2] = '49.0';
  assert.match(compute(flipped).error, /盐水第 3 次 U1 − U2 ≤ 0/);
  assert.match(compute(flipped).error, /填反/);
});

test('定标砝码必须非空且不能为负，报错定位到组号', () => {
  const blank = payload();
  blank.calibration.masses[4] = '';
  assert.match(compute(blank).error, /定标第 5 组砝码质量 m 不能为空（g）/);

  const negative = payload();
  negative.calibration.voltages[1] = '-14.2';
  assert.match(compute(negative).error, /定标第 2 组电压 U 不能为负（mV）/);

  const notNumber = payload();
  notNumber.calibration.voltages[7] = '97.9mV';
  assert.match(compute(notNumber).error, /定标第 8 组电压 U 要填数字（mV）/);
});

test('电压不随砝码增大时给出定向提示，而不是算出负 K', () => {
  const reversed = payload();
  reversed.calibration.voltages = ['97.9', '84.2', '70.6', '56.2', '43.1', '28.1', '14.2', '0'];
  assert.match(compute(reversed).error, /后 4 组的平均值必须大于前 4 组/);

  const sameMass = payload();
  sameMass.calibration.masses = ['1', '1', '1', '1', '1', '1', '1', '1'];
  assert.match(compute(sameMass).error, /砝码质量后 4 组/);
});

test('直径：空白格子忽略、0 与负数报错、全空报错', () => {
  const sparse = payload();
  sparse.diameters.d1 = ['32.92', '', '32.88', '', '32.92'];
  const { result } = compute(sparse);
  assert.equal(result.diameters.d1Count, 3);
  assert.equal(result.diameters.d1Text, '32.9067');

  const zero = payload();
  zero.diameters.d1[0] = '0';
  assert.match(compute(zero).error, /内径 D1 第 1 次测量必须大于 0（mm）/);

  const text = payload();
  text.diameters.d2[4] = '34.8mm';
  assert.match(compute(text).error, /外径 D2 第 5 次测量要填数字（mm）/);

  const empty = payload();
  empty.diameters.d2 = ['', '', '', '', ''];
  assert.match(compute(empty).error, /外径 D2 至少要填一次测量（mm）/);
});

test('两种液体全空时提示先填数据', () => {
  const blank = payload();
  blank.liquids = [
    { name: '盐水', u1: ['', ''], u2: ['', ''] },
    { name: '水', u1: ['', ''], u2: ['', ''] },
  ];
  assert.match(compute(blank).error, /还没有填写液体测量数据/);
});

test('定标图：8 个散点，参考线斜率为逐差斜率，刻度各自成行', () => {
  const { result } = compute(payload());
  const plot = result.calibration.plot;
  assert.equal(plot.points.length, 8);
  assert.ok(plot.line.width > 300);
  assert.ok(plot.line.angle < 0, '纵轴向上，直线在屏幕上向右下倾斜');
  assert.equal(plot.points[0].left < plot.points[7].left, true);
  assert.equal(plot.points[0].top > plot.points[7].top, true);
  assert.deepEqual(plot.yTicks.map((tick) => tick.text), ['114.1', '0']);
  assert.deepEqual(plot.xTicks.map((tick) => tick.text), ['0', '3.78']);
  assert.equal(plot.axisY, plot.padTop + plot.innerHeight);
});

test('行数与数据表约定一致，平均与数值解析不吞 0', () => {
  assert.equal(CALIB_ROWS, 8);
  assert.equal(DIAMETER_ROWS, 5);
  assert.equal(LIQUID_ROWS, 6);
  assert.equal(MASS_TO_FORCE_DIVISOR, 100);
  assert.equal(SLOPE_DIVISOR, 10);
  assert.equal(average(['0', '2']), 1);
  assert.equal(toNumber('0'), 0);
  assert.equal(Number.isNaN(toNumber(' ')), true);
  assert.equal(Number.isNaN(toNumber('1.2.3')), true);
});

test('内外径填反：外径均值不大于内径均值时直接报错，不给出周长', () => {
  // 回归：周长只依赖 D̄1 + D̄2，填反了照样能算出 213.628 mm，用户发现不了
  const flipped = payload();
  flipped.diameters.d1 = ['35', '35', '35', '35', '35'];
  flipped.diameters.d2 = ['33', '33', '33', '33', '33'];
  const outcome = compute(flipped);
  assert.equal(outcome.error, '外径 D2 平均值（33 mm）必须大于内径 D1 平均值（35 mm），请检查内外径是否填反');
  assert.equal(outcome.result, undefined);

  // 内外径相等同样拦下
  const equal = payload();
  equal.diameters.d1 = ['34', '34', '34', '34', '34'];
  equal.diameters.d2 = ['34', '34', '34', '34', '34'];
  assert.match(compute(equal).error, /必须大于内径 D1 平均值（34 mm）/);

  // 正常数据不受影响
  const ok = compute(payload());
  assert.equal(ok.error, undefined);
  assert.equal(ok.result.diameters.d2Text, '34.784');
});
