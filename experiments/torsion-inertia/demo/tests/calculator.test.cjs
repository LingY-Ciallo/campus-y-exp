const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compute,
  average,
  toNumber,
  solidCylinderInertia,
  hollowCylinderInertia,
  rodInertia,
} = require('../pages/torsion-inertia/calculator');

// 实验 3 原始数据：质量 g、尺寸 mm、周期 s
const RAW = {
  cylinder: { mass: ['723', '723', '723'], diameter: ['100', '100', '100'] },
  tube: { mass: ['715', '715', '715'], outer: ['100.1', '100.2', '100.2'], inner: ['93.13', '93.14', '93.14'] },
  rod: { mass: ['134.6'], length: ['601'] },
  periods: {
    empty: ['0.667534', '0.668085', '0.667923'],
    cylinder: ['1.141298', '1.140715', '1.141011'],
    tube: ['1.402563', '1.402269', '1.402373'],
    rod: ['1.994677', '1.994867', '1.994723'],
  },
};

function withPatch(patch) {
  return {
    ...RAW,
    ...patch,
    cylinder: { ...RAW.cylinder, ...(patch.cylinder || {}) },
    tube: { ...RAW.tube, ...(patch.tube || {}) },
    rod: { ...RAW.rod, ...(patch.rod || {}) },
    periods: { ...RAW.periods, ...(patch.periods || {}) },
  };
}

test('例题：K、J0 与三项转动惯量复现实验记录', () => {
  const { result } = compute(RAW);
  assert.equal(result.kText, '0.0416865');
  assert.equal(result.j0Text, '4.7097e-4');
  assert.equal(result.t0Text, '0.667847');
  assert.equal(result.t1Text, '1.14101');
  assert.equal(result.t2Text, '1.4024');
  assert.equal(result.t3Text, '1.99476');
  assert.equal(result.cylinderMassCount, 3);
  assert.equal(result.cylinderDiameterCount, 3);
  assert.equal(result.tubeMassCount, 3);
  assert.equal(result.tubeOuterCount, 3);
  assert.equal(result.tubeInnerCount, 3);
  assert.equal(result.rodMassCount, 1);
  assert.equal(result.rodLengthCount, 1);
  assert.equal(result.t0Count, 3);

  const [cylinder, tube, rod] = result.items;
  assert.equal(cylinder.theoryText, '9.0375e-4');
  assert.equal(cylinder.measuredText, '9.0375e-4');
  assert.equal(cylinder.errorText, '0.00');
  assert.equal(tube.theoryText, '1.6720e-3');
  assert.equal(tube.measuredText, '1.6058e-3');
  assert.equal(tube.errorText, '-3.96');
  assert.equal(rod.theoryText, '4.0515e-3');
  assert.equal(rod.measuredText, '3.7306e-3');
  assert.equal(rod.errorText, '-7.92');
});

test('标定体误差恒为 0，是方法本身的性质而不是巧合', () => {
  // K/(4π²) = J1理/(T1²−T0²)，代回 J1实 = (K/4π²)T1² − J0 必然得到 J1理
  const { result } = compute(withPatch({ cylinder: { mass: ['500'], diameter: ['80', '80'] } }));
  const cylinder = result.items[0];
  assert.equal(Math.abs(cylinder.measured - cylinder.theory) < 1e-18, true);
  assert.equal(cylinder.errorText, '0.00');
  assert.equal(cylinder.calibrated, true);
});

test('质量与尺寸逐项校验：填了 0 或非数字要报错，空白才忽略', () => {
  assert.match(compute(withPatch({ cylinder: { mass: ['0'] } })).error, /圆柱体质量 m1 第 1 次测量必须大于 0（g）/);
  assert.match(compute(withPatch({ cylinder: { mass: ['abc'] } })).error, /圆柱体质量 m1 第 1 次测量要填数字（g）/);
  assert.match(compute(withPatch({ cylinder: { diameter: ['100', '-1', '100'] } })).error, /圆柱体直径 D1 第 2 次测量必须大于 0（mm）/);
  assert.match(compute(withPatch({ tube: { outer: ['100', 'x', '100'] } })).error, /圆筒外径 D外 第 2 次测量要填数字（mm）/);
  assert.match(compute(withPatch({ tube: { inner: ['93', '0', '93'] } })).error, /圆筒内径 D内 第 2 次测量必须大于 0（mm）/);
  assert.match(compute(withPatch({ rod: { length: ['601', '  ', 'abc'] } })).error, /细杆长度 L 第 3 次测量要填数字（mm）/);

  const spaced = compute(withPatch({
    cylinder: { mass: ['723', '  ', ''], diameter: ['100', '', ' 100 '] },
    rod: { mass: ['134.6', ''], length: ['601', '', ''] },
  }));
  assert.equal(spaced.error, undefined);
  assert.equal(spaced.result.cylinderDiameterText, '100');
});

test('周期逐项校验并定位到具体次数', () => {
  assert.match(compute(withPatch({ periods: { empty: ['0.667', '', 'abc'] } })).error, /空载物盘周期 T0 第 3 次测量要填数字（s）/);
  assert.match(compute(withPatch({ periods: { cylinder: ['-1'] } })).error, /放圆柱体后的周期 T1 第 1 次测量必须大于 0（s）/);
  assert.match(compute(withPatch({ periods: { tube: ['', '', ''] } })).error, /放圆筒后的周期 T2 至少要填一次测量（s）/);
});

test('T1 不大于 T0 直接报错，不给出无意义的结果', () => {
  const { error } = compute(withPatch({ periods: { empty: ['1.2'], cylinder: ['1.1'] } }));
  assert.match(error, /T1 必须大于 T0/);
  const same = compute(withPatch({ periods: { empty: ['1.1'], cylinder: ['1.1'] } }));
  assert.match(same.error, /T1 必须大于 T0/);
});

test('圆筒外径必须大于内径', () => {
  const { error } = compute(withPatch({ tube: { outer: ['90'], inner: ['93'] } }));
  assert.match(error, /圆筒外径必须大于内径（mm）/);
  const equal = compute(withPatch({ tube: { outer: ['93'], inner: ['93'] } }));
  assert.match(equal.error, /圆筒外径必须大于内径（mm）/);
});

test('待测周期小于空盘周期时，转动惯量为负要报错', () => {
  assert.match(compute(withPatch({ periods: { tube: ['0.5'] } })).error, /圆筒的实验转动惯量不合理/);
  assert.match(compute(withPatch({ periods: { rod: ['0.5'] } })).error, /细杆的实验转动惯量不合理/);
});

test('只填一次测量也能算，次数如实记录', () => {
  const { result } = compute(withPatch({
    cylinder: { mass: ['723'], diameter: ['100'] },
    tube: { mass: ['715'], outer: ['100.1'], inner: ['93.13'] },
    rod: { mass: ['134.6'], length: ['601'] },
    periods: {
      empty: ['0.667534'],
      cylinder: ['1.141298'],
      tube: ['1.402563'],
      rod: ['1.994677'],
    },
  }));
  assert.equal(result.t0Count, 1);
  assert.equal(result.t3Count, 1);
  assert.equal(result.items[0].periodCount, 1);
  // 单次读数与三次均值不同，K 应随之一致变化
  assert.notEqual(result.kText, '0.0416865');
  assert.ok(Number(result.kText) > 0);
});

test('三个刚体理论值公式', () => {
  // 0.723 kg、0.1 m
  assert.equal(solidCylinderInertia(0.723, 0.1), 0.00090375);
  // 0.715 kg，外径 0.1001666667 m、内径 0.0931366667 m
  const tube = hollowCylinderInertia(0.715, 0.10016666666666667, 0.09313666666666666);
  assert.ok(Math.abs(tube - 0.0016720096) < 1e-9);
  // 0.1346 kg、0.601 m
  const rod = rodInertia(0.1346, 0.601);
  assert.ok(Math.abs(rod - 0.0040514712) < 1e-9);
  // 非法输入返回 NaN，不抛异常
  assert.ok(Number.isNaN(solidCylinderInertia(0, 0.1)));
  assert.ok(Number.isNaN(hollowCylinderInertia(0.7, 0.09, 0.093)));
  assert.ok(Number.isNaN(rodInertia(0.13, 0)));
});

test('工具函数：数字解析与平均', () => {
  assert.ok(Number.isNaN(toNumber('  ')));
  assert.ok(Number.isNaN(toNumber('abc')));
  assert.equal(toNumber(' 1.5 '), 1.5);
  assert.equal(average(['1', '', '3']), 2);
  assert.ok(Number.isNaN(average([])));
});
