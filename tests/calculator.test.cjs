const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, parseNumber, formatNumber } = require('../pages/experiment-template/calculator');

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
}

test('简单可手算数据：均值、样本标准差、平均值 A 类不确定度和相对误差', () => {
  const result = calculate(['1', '2', '3'], '2');
  close(result.mean, 2);
  close(result.standardDeviation, 1);
  close(result.uncertaintyA, 1 / Math.sqrt(3));
  close(result.relativeError, 0);
  assert.deepEqual(result.squaredDeviations, [1, 0, 1]);
});

test('README 示例答案可复核', () => {
  const result = calculate(['10.12', '10.15', '10.10', '10.14', '10.11'], '10.00');
  close(result.mean, 10.124);
  close(result.standardDeviation, Math.sqrt(0.00043));
  close(result.uncertaintyA, Math.sqrt(0.000086));
  close(result.relativeError, 1.24);
  assert.equal(formatNumber(result.uncertaintyA), '0.00927362');
});

test('支持负值、零、小数与科学计数法；负参考值的相对误差取绝对值', () => {
  assert.equal(parseNumber(' -1.2e-3 ', ''), -0.0012);
  assert.equal(parseNumber('.5', ''), 0.5);
  const result = calculate(['-2', '0'], '-2');
  close(result.mean, -1);
  close(result.relativeError, 50);
});

test('相同读数的不确定度为零；参考值留空不输出误差', () => {
  const result = calculate(['5', '5'], '  ');
  assert.equal(result.standardDeviation, 0);
  assert.equal(result.uncertaintyA, 0);
  assert.equal(result.relativeError, null);
});

test('空行不被当成 0；非法数字、零参考值与错误组数给出错误', () => {
  for (const value of ['', ' ', 'abc', '12mm', '1,2', '0x10', 'Infinity', 'NaN', '1e309']) {
    assert.throws(() => calculate(['1', value], ''));
  }
  assert.throws(() => calculate(['1', '2'], '0'), /不能为 0/);
  assert.throws(() => calculate(['1'], ''), /2～20/);
  assert.throws(() => calculate(Array(21).fill('1'), ''), /2～20/);
  assert.throws(() => calculate(['1', '2'], 'oops'), /参考值/);
});

test('中间运算溢出时不显示 Infinity 或 NaN', () => {
  assert.throws(() => calculate(['1e308', '-1e308'], ''), /量级过大/);
});

test('显示舍入不改变原始计算值', () => {
  const result = calculate(['1', '1', '2'], '');
  assert.equal(formatNumber(result.mean), '1.33333');
  close(result.mean, 4 / 3);
});
