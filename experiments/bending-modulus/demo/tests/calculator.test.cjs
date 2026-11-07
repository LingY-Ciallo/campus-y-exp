const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, linearFit, average, toNumber, youngsModulus } = require('../pages/bending-modulus/calculator');

// 定标点：Z/mm 与 U/mV，等间隔加 20 g 砝码
const CALIBRATION = [
  { z: '3.245', u: '13' },
  { z: '3.56', u: '-81' },
  { z: '3.89', u: '-179' },
  { z: '4.21', u: '-276' },
  { z: '4.53', u: '-371' },
  { z: '4.86', u: '-470' }
];

function ironInput(overrides) {
  return Object.assign({
    material: '铸铁',
    calibration: CALIBRATION,
    thickness: ['0.875', '0.868', '0.867'],
    width: ['20.8', '20.9', '20.96'],
    span: ['23.2', '22.8', '23'],
    massG: '60',
    deflection: [{ dz: '', du: '200' }, { dz: '', du: '203' }, { dz: '', du: '201' }],
    referenceY: '1.815e11'
  }, overrides || {});
}

function copperInput(overrides) {
  return Object.assign({
    material: '黄铜',
    calibration: CALIBRATION,
    thickness: ['0.95', '0.92', '0.905'],
    width: ['21.0', '21.1', '21.08'],
    span: ['23.2', '22.8', '23'],
    massG: '60',
    deflection: [{ dz: '0.965' }, { dz: '0.970' }, { dz: '0.970' }],
    referenceY: '1.055e11'
  }, overrides || {});
}

function relative(actual, expected) {
  assert.ok(Math.abs(actual - expected) / Math.abs(expected) < 1e-4, `${actual} 与 ${expected} 偏差过大`);
}

test('铸铁例题：灵敏度、平均挠度与杨氏模量', () => {
  const outcome = compute(ironInput());
  assert.equal(outcome.error, undefined);
  const { result } = outcome;
  relative(result.k, 299.159);
  assert.equal(result.kText, '299.16');
  assert.equal(result.r2Text, '1');
  assert.equal(result.pointCount, 6);
  relative(result.deltaZAvg, 0.672997);
  assert.equal(result.deltaZAvgText, '0.672997');
  relative(result.y, 1.9322e11);
  assert.equal(result.yGpaText, '193.22');
  assert.equal(result.errorText, '6.46');
  assert.equal(result.higher, true);
});

test('黄铜例题：直接给 ΔZ 时不再除以 K', () => {
  const { result } = compute(copperInput());
  relative(result.deltaZAvg, 0.9683333333);
  assert.equal(result.deltaZAvgText, '0.968333');
  relative(result.y, 1.1081e11);
  assert.equal(result.yGpaText, '110.81');
  assert.equal(result.errorText, '5.04');
  assert.equal(result.details[0].from, 'ΔZ 直测');
});

test('同时填 ΔZ 与 ΔU 时以 ΔZ 为准，来源标记为直测', () => {
  const { result } = compute(ironInput({ deflection: [{ dz: '0.5', du: '200' }] }));
  assert.equal(result.deltaZAvgText, '0.5');
  assert.equal(result.details[0].from, 'ΔZ 直测');
});

test('留空的三次测量被忽略，只按填写的次数取平均', () => {
  const { result } = compute(ironInput({ thickness: ['0.875', '', ' '] }));
  relative(result.thickness, 0.875);
  assert.equal(result.thicknessText, '0.875');
});

test('定标点不足、Z 全部相同、灵敏度为零都给出错误', () => {
  assert.match(compute(ironInput({ calibration: [{ z: '1', u: '1' }] })).error, /至少/);
  const flat = CALIBRATION.map((row) => ({ z: '4', u: row.u }));
  assert.match(compute(ironInput({ calibration: flat })).error, /无法拟合/);
});

test('定标缺值定位到具体组号', () => {
  const rows = CALIBRATION.slice();
  rows[3] = { z: '4.21', u: '' };
  assert.match(compute(ironInput({ calibration: rows })).error, /第 4 组/);
});

test('梁参数、负荷、挠度的空值与零值都拦得住', () => {
  assert.match(compute(ironInput({ thickness: [] })).error, /厚度 a/);
  assert.match(compute(ironInput({ width: ['', ''] })).error, /宽度 b/);
  assert.match(compute(ironInput({ span: ['0'] })).error, /刀口间距 d/);
  assert.match(compute(ironInput({ massG: '0' })).error, /负荷 M/);
  assert.match(compute(ironInput({ massG: 'abc' })).error, /负荷 M/);
  assert.match(compute(ironInput({ deflection: [] })).error, /至少需要 1 组/);
  assert.match(compute(ironInput({ deflection: [{ dz: '', du: '' }] })).error, /第 1 组/);
  assert.match(compute(ironInput({ deflection: [{ dz: '', du: '-200' }] })).error, /必须大于 0/);
});

test('参考值留空时不输出相对误差，也不判高低', () => {
  const { result } = compute(ironInput({ referenceY: '' }));
  assert.equal(result.hasReference, false);
  assert.equal(result.errorText, '');
  assert.equal(result.higher, false);
});

test('工具函数：数字解析、平均与最小二乘', () => {
  assert.ok(Number.isNaN(toNumber('')));
  assert.ok(Number.isNaN(toNumber('12mm')));
  assert.equal(toNumber(' -1.2e-3 '), -0.0012);
  assert.equal(average(['1', '', '3']), 2);
  assert.ok(Number.isNaN(average([])));
  const fit = linearFit([1, 2, 3], [2, 4, 6]);
  relative(fit.slope, 2);
  assert.ok(Math.abs(fit.intercept) < 1e-12);
  assert.equal(fit.r2, 1);
  assert.equal(linearFit([1, 1], [1, 2]), null);
});

test('杨氏模量随厚度三次方变化，零挠度返回 NaN', () => {
  const base = { thicknessMm: 1, widthMm: 20, spanCm: 23, massG: 60, deflectionMm: 0.5 };
  const one = youngsModulus(base);
  const two = youngsModulus(Object.assign({}, base, { thicknessMm: 2 }));
  relative(one / two, 8);
  assert.ok(Number.isNaN(youngsModulus(Object.assign({}, base, { deflectionMm: 0 }))));
});
