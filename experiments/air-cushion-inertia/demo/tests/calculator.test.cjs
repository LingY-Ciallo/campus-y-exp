const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compute,
  average,
  toNumber,
  positiveSingle,
  positiveAverage,
  angularAcceleration,
  torque,
  leastSquares,
  interceptTextOf,
  verdictOf,
  G,
  R,
} = require('../pages/air-cushion-inertia/calculator');

// 实验 4 原始数据：砝码 1 / 2 / 3 / 5 / 8 g，每组 t1、t2 各三次（单位 s）
const RAW = [
  { mass: '1', t1: ['2.49021', '2.47475', '2.49084'], t2: ['4.13579', '4.11533', '4.13952'] },
  { mass: '2', t1: ['2.34567', '2.22399', '2.21827'], t2: ['3.88888', '3.69096', '3.68289'] },
  { mass: '3', t1: ['2.18378', '2.08904', '2.07202'], t2: ['3.62535', '3.47217', '3.44796'] },
  { mass: '5', t1: ['1.95394', '1.96276', '1.95739'], t2: ['3.24778', '3.25945', '3.25232'] },
  { mass: '8', t1: ['1.73804', '1.74664', '1.74214'], t2: ['2.88871', '2.89908', '2.89512'] },
];

function cloneRaw() {
  return RAW.map((group) => ({ mass: group.mass, t1: group.t1.slice(), t2: group.t2.slice() }));
}

function withGroups(groups) {
  return compute({ groups });
}

test('例题：五组的 t̄、α、M 与拟合结果复现实验记录表', () => {
  const { result, error } = withGroups(cloneRaw());
  assert.equal(error, undefined);

  const [g1, g2, g3, g4, g5] = result.groups;
  assert.equal(g1.t1Text, '2.48527');
  assert.equal(g1.t2Text, '4.13021');
  assert.equal(g1.alphaText, '0.6254');
  assert.equal(g1.torqueText, '1.960e-4');

  assert.equal(g2.t1Text, '2.26264');
  assert.equal(g2.t2Text, '3.75424');
  assert.equal(g2.alphaText, '0.7647');
  assert.equal(g2.torqueText, '3.920e-4');

  assert.equal(g3.t1Text, '2.11495');
  assert.equal(g3.t2Text, '3.51516');
  assert.equal(g3.alphaText, '0.8628');
  assert.equal(g3.torqueText, '5.880e-4');

  assert.equal(g4.t1Text, '1.95803');
  assert.equal(g4.t2Text, '3.25318');
  assert.equal(g4.alphaText, '1.0097');
  assert.equal(g4.torqueText, '9.800e-4');

  assert.equal(g5.t1Text, '1.74227');
  assert.equal(g5.t2Text, '2.8943');
  assert.equal(g5.alphaText, '1.2768');
  assert.equal(g5.torqueText, '1.568e-3');

  assert.equal(result.groups.length, 5);
  assert.equal(g1.t1Count, 3);
  assert.equal(g1.t2Count, 3);
  assert.equal(result.fit.slopeText, '2.1715e-3');
  assert.equal(result.fit.interceptText, '-1.2267e-3');
  assert.equal(result.fit.rText, '0.9957');
  assert.equal(result.fit.count, 5);
  assert.match(result.fit.verdict, /0\.99 ≤ r < 0\.9999/);
  assert.match(result.fit.interceptNote, /截距为负/);
});

test('角加速度与记录表公式逐位一致（π 用双精度 Math.PI）', () => {
  // 记录表 B16：=4*3.1415926*(2/B15-1/B14)/(B15-B14)
  const mean = (list) => list.reduce((sum, value) => sum + Number(value), 0) / list.length;
  const expected = [
    0.6253991162399498,
    0.7647117393808054,
    0.8628100088307321,
    1.0097027247479147,
    1.2767822356977594,
  ];
  RAW.forEach((group, index) => {
    const t1 = mean(group.t1);
    const t2 = mean(group.t2);
    assert.ok(Math.abs(angularAcceleration(t1, t2) - expected[index]) < 1e-12);
  });
  // t2 不大于 t1 时不给结果
  assert.ok(Number.isNaN(angularAcceleration(2, 2)));
  assert.ok(Number.isNaN(angularAcceleration(3, 2)));
});

test('力矩常量固定为 g = 9.8、r = 2.00 cm', () => {
  assert.equal(G, 9.8);
  assert.equal(R, 0.02);
  assert.ok(Math.abs(torque(1) - 1.96e-4) < 1e-18);
  assert.ok(Math.abs(torque(8) - 1.568e-3) < 1e-18);
  assert.ok(Number.isNaN(torque(0)));
});

test('砝码质量是单值：空、非数字、0、负数都要报错并点明第几组', () => {
  const empty = cloneRaw();
  empty[2].mass = '';
  assert.match(withGroups(empty).error, /第 3 组砝码质量 m 不能为空（g）/);

  const text = cloneRaw();
  text[0].mass = 'abc';
  assert.match(withGroups(text).error, /第 1 组砝码质量 m 要填数字（g）/);

  const zero = cloneRaw();
  zero[4].mass = '0';
  assert.match(withGroups(zero).error, /第 5 组砝码质量 m 必须大于 0（g）/);

  const negative = cloneRaw();
  negative[1].mass = '-2';
  assert.match(withGroups(negative).error, /第 2 组砝码质量 m 必须大于 0（g）/);
});

test('时间逐项校验：指出第几组、第几次', () => {
  const first = cloneRaw();
  first[0].t1[1] = 'x';
  assert.match(withGroups(first).error, /第 1 组 t1 第 2 次测量要填数字（s）/);

  const second = cloneRaw();
  second[3].t2[2] = '0';
  assert.match(withGroups(second).error, /第 4 组 t2 第 3 次测量必须大于 0（s）/);

  const missing = cloneRaw();
  missing[2].t2 = ['', '', ''];
  assert.match(withGroups(missing).error, /第 3 组 t2 至少要填一次测量（s）/);

  // 只填空格不算错：第 5 组只填一次
  const once = cloneRaw();
  once[4].t1 = ['1.73804', '', '  '];
  once[4].t2 = ['2.88871', ''];
  const { result, error } = withGroups(once);
  assert.equal(error, undefined);
  assert.equal(result.groups[4].t2Count, 1);
  assert.equal(result.groups[4].t2Text, '2.88871');
});

test('t2 平均值必须大于 t1，否则定位到组并报错', () => {
  const swapped = cloneRaw();
  swapped[1].t1 = ['3.8', '3.8', '3.8'];
  swapped[1].t2 = ['3.6', '3.6', '3.6'];
  assert.match(withGroups(swapped).error, /第 2 组 的 t2 平均值必须大于 t1/);

  const equal = cloneRaw();
  equal[0].t2 = ['2.4', '2.4', '2.4'];
  equal[0].t1 = ['2.4', '2.4', '2.4'];
  assert.match(withGroups(equal).error, /第 1 组 的 t2 平均值必须大于 t1/);
});

test('整组留空的行自动跳过，有效组数如实统计', () => {
  const twoGroups = cloneRaw().slice(0, 2).concat([
    { mass: '', t1: ['', '', ''], t2: ['', '', ''] },
    { mass: '', t1: ['', '', ''], t2: ['', '', ''] },
    { mass: '', t1: ['', '', ''], t2: ['', '', ''] },
  ]);
  const { result, error } = withGroups(twoGroups);
  assert.equal(error, undefined);
  assert.equal(result.groups.length, 2);
  assert.equal(result.fit.count, 2);
  assert.equal(result.plot.points.length, 2);
});

test('有效组数不足 2 组时拒绝拟合', () => {
  const one = [
    cloneRaw()[0],
    { mass: '', t1: ['', '', ''], t2: ['', '', ''] },
  ];
  assert.match(withGroups(one).error, /只填写了 1 组有效数据，至少需要 2 组/);
  assert.match(withGroups([]).error, /还没有填写有效数据/);
});

test('各组角加速度相同时无法拟合，给出明确提示', () => {
  const same = [
    { mass: '1', t1: ['2.49', '2.49', '2.49'], t2: ['4.13', '4.13', '4.13'] },
    { mass: '5', t1: ['2.49', '2.49', '2.49'], t2: ['4.13', '4.13', '4.13'] },
  ];
  assert.match(withGroups(same).error, /各组角加速度完全相同/);
});

test('砝码质量全相同时斜率为 0，拒绝输出 J', () => {
  const flat = [
    { mass: '2', t1: ['2.49', '2.49', '2.49'], t2: ['4.13', '4.13', '4.13'] },
    { mass: '2', t1: ['2.18', '2.18', '2.18'], t2: ['3.62', '3.62', '3.62'] },
  ];
  assert.match(withGroups(flat).error, /拟合斜率不为正/);
});

test('最小二乘：完美共线的三点给出斜率、截距与 r = 1', () => {
  const fit = leastSquares([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]);
  assert.equal(fit.slope, 2);
  assert.equal(fit.intercept, 1);
  assert.equal(fit.r, 1);
  assert.equal(fit.n, 3);
  assert.equal(leastSquares([{ x: 1, y: 1 }]), null);
  assert.equal(leastSquares([{ x: 2, y: 1 }, { x: 2, y: 5 }]), null);
});

test('图表：散点落在绘图区内，拟合直线由左下指向右上', () => {
  const { result } = withGroups(cloneRaw());
  const plot = result.plot;
  plot.points.forEach((point) => {
    assert.ok(point.left >= plot.padLeft - 8);
    assert.ok(point.left <= plot.padLeft + plot.innerWidth);
    assert.ok(point.top >= plot.padTop - 8);
    assert.ok(point.top <= plot.padTop + plot.innerHeight);
  });
  assert.ok(plot.line.width > 100);
  assert.ok(plot.line.angle < 0, '斜率为正时屏幕坐标向左上，角度应为负');
  assert.ok(plot.line.angle > -90);
  assert.equal(typeof plot.zeroTop, 'number', '截距为负，零线应落在绘图区内');
  assert.equal(plot.xTicks[0].text, '0');
  assert.equal(plot.xTicks[1].text, '1.38');
});

test('刻度排版：纵轴留白放得下 e 记数标签，横轴刻度不与纵轴刻度叠在一起', () => {
  const { result } = withGroups(cloneRaw());
  const plot = result.plot;
  // 纵轴标签贴轴线右对齐、white-space:nowrap；e 记数最多 8 个字符（如 -1.47e-3）
  plot.yTicks.forEach((tick) => {
    assert.ok(tick.text.length <= 8, `纵轴刻度过长会挤出容器：${tick.text}`);
    assert.equal(typeof tick.right, 'number', '纵轴刻度用 right 定位，宽屏上才能贴着轴线');
    assert.ok(tick.right > 0 && tick.right < plot.width, '刻度距右边界应在图内');
  });
  assert.ok(plot.padLeft >= 106, 'padLeft 需 ≥ 106rpx：320px 屏上 112rpx ≈ 48px，才放得下 42px 的 e 记数标签');
  const yBottom = Math.max.apply(null, plot.yTicks.map((tick) => tick.top)) + 20; // 行高 20rpx
  plot.xTicks.forEach((tick) => {
    assert.ok(tick.top - yBottom >= 6, '横轴刻度与纵轴端点刻度之间至少留 6rpx，否则窄屏叠字');
  });
});

test('工具函数：数字解析与平均', () => {
  assert.ok(Number.isNaN(toNumber('  ')));
  assert.ok(Number.isNaN(toNumber('abc')));
  assert.equal(toNumber(' 1.5 '), 1.5);
  assert.equal(average(['1', '', '3']), 2);
  assert.ok(Number.isNaN(average([])));

  const single = positiveSingle(' 2 ', '质量', 'g');
  assert.equal(single.value, 2);
  assert.equal(single.count, 1);
  assert.match(positiveSingle('', '质量', 'g').error, /不能为空/);

  const multi = positiveAverage(['1.0', '', '3.0'], '时间', 's');
  assert.equal(multi.value, 2);
  assert.equal(multi.count, 2);
  assert.match(positiveAverage(['1', ' ', 'x'], '时间', 's').error, /第 3 次测量要填数字/);
});

test('截距格式化：小负值保留符号与数量级，不再抹成 0', () => {
  // 回归：旧实现 Math.abs(intercept) < 5e-7 时直接显示 0.0000e+0
  assert.equal(interceptTextOf(-2e-7), '-2.0000e-7');
  assert.equal(interceptTextOf(-2e-9), '-2.0000e-9');
  assert.equal(interceptTextOf(-1.2267e-3), '-1.2267e-3');
  assert.equal(interceptTextOf(0), '0.0000e+0');
  assert.equal(interceptTextOf(NaN), '—');
});

test('小负截距端到端：显示 -1.5428e-7，判读一致，r = 1 也不说正比', () => {
  // 数据由 α = 1 / 2 / 3、M = J·α + Mf（J = 2×10⁻³ kg·m²、Mf = −2×10⁻⁷ N·m）反推，
  // 截距落在旧实现会被抹成 0 的区间（−5×10⁻⁷ < Mf < 0）
  const groups = [
    { mass: '10.203061', t1: ['2.00000', '2.00000', '2.00000'], t2: ['3.30994', '3.30994', '3.30994'] },
    { mass: '20.407143', t1: ['2.00000', '2.00000', '2.00000'], t2: ['3.01977', '3.01977', '3.01977'] },
    { mass: '30.611224', t1: ['2.00000', '2.00000', '2.00000'], t2: ['2.84759', '2.84759', '2.84759'] },
  ];
  const { result, error } = compute({ groups });
  assert.equal(error, undefined);
  const fit = result.fit;
  assert.ok(fit.intercept < 0 && Math.abs(fit.intercept) < 5e-7);
  assert.equal(fit.interceptText, '-1.5428e-7');
  assert.match(fit.interceptNote, /截距为负/);
  assert.equal(fit.rText, '1.0000');
  assert.match(fit.verdict, /r ≥ 0\.9999/);
  assert.doesNotMatch(fit.verdict, /正比/);
});

test('r 判读只讲线性程度：r = 1 且截距非零时不得称正比', () => {
  const fit = leastSquares([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]);
  assert.equal(fit.r, 1);
  assert.equal(fit.intercept, 1);
  const text = verdictOf(fit);
  assert.match(text, /r ≥ 0\.9999/);
  assert.doesNotMatch(text, /正比/);
  assert.match(text, /截距/);
});
