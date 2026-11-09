// 扭摆法测量转动惯量 —— 纯计算，不依赖 wx
//
// 入参一律使用实验记录的原始单位：质量 g、长度尺寸 mm、周期 s
// 输出：转动惯量 kg·m²，扭转常量 K：N·m
//
// 方法链：
//   1) 几何理论值 J理：圆柱 mD²/8、圆筒 m(D外²+D内²)/8、细杆 mL²/12
//   2) 用圆柱体作标定体：K/(4π²) = J1理 / (T1² − T0²)
//   3) 空载物盘：J0 = (K/4π²)·T0²
//   4) 待测物：J实 = (K/4π²)·T² − J0
//   5) 相对误差：E = (J实 − J理) / J理

const FOUR_PI2 = 4 * Math.PI * Math.PI;
const MM = 1e-3;
const GRAM = 1e-3;

function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  const text = String(value).trim();
  if (!text) return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function average(values) {
  const numbers = (values || []).map(toNumber).filter(Number.isFinite);
  if (!numbers.length) return NaN;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

// 尺寸/质量/周期类字段：只忽略真正空白的格子，填了的内容必须是有限正数
function positiveAverage(values, label, unit) {
  const list = values || [];
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

// 转动惯量量级在 1e-4～1e-3，用科学计数法显示避免一长串零
function sci(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return value.toExponential(digits || 4);
}

// 实心圆柱绕自身轴：J = mR²/2 = mD²/8
function solidCylinderInertia(massKg, diameterM) {
  if (!(massKg > 0) || !(diameterM > 0)) return NaN;
  return (massKg * diameterM * diameterM) / 8;
}

// 空心圆筒绕中心轴：J = m(R外² + R内²)/2 = m(D外² + D内²)/8
function hollowCylinderInertia(massKg, outerM, innerM) {
  if (!(massKg > 0) || !(outerM > 0) || !(innerM > 0)) return NaN;
  if (!(outerM > innerM)) return NaN;
  return (massKg * (outerM * outerM + innerM * innerM)) / 8;
}

// 细长杆绕中点垂直轴：J = mL²/12
function rodInertia(massKg, lengthM) {
  if (!(massKg > 0) || !(lengthM > 0)) return NaN;
  return (massKg * lengthM * lengthM) / 12;
}

function compute(input) {
  const source = input || {};
  const cylinder = source.cylinder || {};
  const tube = source.tube || {};
  const rod = source.rod || {};
  const periods = source.periods || {};

  // 1. 逐项校验并取平均
  const cylinderMass = positiveAverage(cylinder.mass, '圆柱体质量 m1', 'g');
  if (cylinderMass.error) return { error: cylinderMass.error };
  const cylinderDiameter = positiveAverage(cylinder.diameter, '圆柱体直径 D1', 'mm');
  if (cylinderDiameter.error) return { error: cylinderDiameter.error };

  const tubeMass = positiveAverage(tube.mass, '圆筒质量 m2', 'g');
  if (tubeMass.error) return { error: tubeMass.error };
  const tubeOuter = positiveAverage(tube.outer, '圆筒外径 D外', 'mm');
  if (tubeOuter.error) return { error: tubeOuter.error };
  const tubeInner = positiveAverage(tube.inner, '圆筒内径 D内', 'mm');
  if (tubeInner.error) return { error: tubeInner.error };

  const rodMass = positiveAverage(rod.mass, '细杆质量 m3', 'g');
  if (rodMass.error) return { error: rodMass.error };
  const rodLength = positiveAverage(rod.length, '细杆长度 L', 'mm');
  if (rodLength.error) return { error: rodLength.error };

  const t0 = positiveAverage(periods.empty, '空载物盘周期 T0', 's');
  if (t0.error) return { error: t0.error };
  const t1 = positiveAverage(periods.cylinder, '放圆柱体后的周期 T1', 's');
  if (t1.error) return { error: t1.error };
  const t2 = positiveAverage(periods.tube, '放圆筒后的周期 T2', 's');
  if (t2.error) return { error: t2.error };
  const t3 = positiveAverage(periods.rod, '放细杆后的周期 T3', 's');
  if (t3.error) return { error: t3.error };

  // 2. 几何理论值
  if (!(tubeOuter.value > tubeInner.value)) {
    return { error: '圆筒外径必须大于内径（mm）' };
  }
  const j1Theory = solidCylinderInertia(cylinderMass.value * GRAM, cylinderDiameter.value * MM);
  const j2Theory = hollowCylinderInertia(tubeMass.value * GRAM, tubeOuter.value * MM, tubeInner.value * MM);
  const j3Theory = rodInertia(rodMass.value * GRAM, rodLength.value * MM);
  if (!Number.isFinite(j1Theory) || !(j1Theory > 0)) {
    return { error: '圆柱体理论转动惯量计算失败，请检查质量与直径' };
  }
  if (!Number.isFinite(j2Theory) || !(j2Theory > 0)) {
    return { error: '圆筒理论转动惯量计算失败，请检查质量与内外径' };
  }
  if (!Number.isFinite(j3Theory) || !(j3Theory > 0)) {
    return { error: '细杆理论转动惯量计算失败，请检查质量与长度' };
  }

  // 3. 标定：K/(4π²) = J1理 / (T1² − T0²)
  const periodDiff = t1.value * t1.value - t0.value * t0.value;
  if (!(periodDiff > 0)) {
    return { error: 'T1 必须大于 T0（放上圆柱体后周期应变长），请检查两组周期是否填反' };
  }
  const kOverFourPi2 = j1Theory / periodDiff;
  const k = FOUR_PI2 * kOverFourPi2;
  if (!(k > 0)) return { error: '扭转常量 K 计算失败，请检查标定数据' };

  // 4. 空载物盘与三个待测物
  const j0 = kOverFourPi2 * t0.value * t0.value;
  const j1 = kOverFourPi2 * t1.value * t1.value - j0;
  const j2 = kOverFourPi2 * t2.value * t2.value - j0;
  const j3 = kOverFourPi2 * t3.value * t3.value - j0;
  if (!(j2 > 0)) return { error: '圆筒的实验转动惯量不合理（≤0），请检查 T2 是否小于 T0' };
  if (!(j3 > 0)) return { error: '细杆的实验转动惯量不合理（≤0），请检查 T3 是否小于 T0' };

  const items = [
    { key: 'cylinder', name: '圆柱体', theory: j1Theory, measured: j1, periods: t1 },
    { key: 'tube', name: '金属圆筒', theory: j2Theory, measured: j2, periods: t2 },
    { key: 'rod', name: '细金属杆', theory: j3Theory, measured: j3, periods: t3 },
  ].map((item) => {
    const error = (item.measured - item.theory) / item.theory * 100;
    return {
      key: item.key,
      name: item.name,
      theory: item.theory,
      measured: item.measured,
      theoryText: sci(item.theory),
      measuredText: sci(item.measured),
      error,
      // 标定体的理论误差恒为 0，浮点运算可能得到 -1e-16，避免显示成 -0.00
      errorText: Number.isFinite(error) ? (Math.abs(error) < 0.005 ? 0 : error).toFixed(2) : '—',
      periodText: trim(item.periods.value, 6),
      periodCount: item.periods.count,
      // 圆柱体是标定体，J实 必然等于 J理，误差恒为 0，不能当作准确度指标
      calibrated: item.key === 'cylinder',
    };
  });

  return {
    result: {
      k,
      kText: trim(k, 6),
      kOverFourPi2,
      kOverFourPi2Text: sci(kOverFourPi2),
      j0,
      j0Text: sci(j0),
      cylinderMassText: trim(cylinderMass.value, 6),
      cylinderDiameterText: trim(cylinderDiameter.value, 6),
      tubeMassText: trim(tubeMass.value, 6),
      tubeOuterText: trim(tubeOuter.value, 6),
      tubeInnerText: trim(tubeInner.value, 6),
      rodMassText: trim(rodMass.value, 6),
      rodLengthText: trim(rodLength.value, 6),
      t0Text: trim(t0.value, 6),
      t1Text: trim(t1.value, 6),
      t2Text: trim(t2.value, 6),
      t3Text: trim(t3.value, 6),
      t0Count: t0.count,
      t1Count: t1.count,
      t2Count: t2.count,
      t3Count: t3.count,
      items,
    },
  };
}

module.exports = {
  compute,
  average,
  toNumber,
  positiveAverage,
  solidCylinderInertia,
  hollowCylinderInertia,
  rodInertia,
};
