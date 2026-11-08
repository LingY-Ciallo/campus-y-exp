// 弯曲法测量杨氏模量（霍尔位置传感器）—— 纯计算，不依赖 wx

const G = 9.8;
const MM = 1e-3;
const CM = 1e-2;
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

// 尺寸类字段：只忽略真正空白的格子，填了的内容必须是有限正数
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
  if (!count) return { error: `${label}至少要填一次测量（${unit}）` };
  return { value: sum / count, count };
}

function trim(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return String(Number(value.toPrecision(digits || 6)));
}

// U 对 Z 的最小二乘拟合，返回斜率、截距与决定系数
function linearFit(xs, ys) {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = xs.reduce((sum, v) => sum + v, 0) / n;
  const my = ys.reduce((sum, v) => sum + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r2: (sxy * sxy) / (sxx * syy) };
}

// Y = d³·M·g / (4·a³·b·ΔZ)，入参保持实验原始单位
function youngsModulus({ thicknessMm, widthMm, spanCm, massG, deflectionMm }) {
  const a = thicknessMm * MM;
  const b = widthMm * MM;
  const d = spanCm * CM;
  const m = massG * GRAM;
  const dz = deflectionMm * MM;
  if (!(a > 0 && b > 0 && d > 0 && m > 0 && dz > 0)) return NaN;
  return (d ** 3 * m * G) / (4 * a ** 3 * b * dz);
}

function compute(input) {
  const source = input || {};

  // 定标：U(mV) 对 Z(mm) 的斜率，数值上就等于 V/m
  const calibration = source.calibration || [];
  const points = [];
  for (let i = 0; i < calibration.length; i += 1) {
    const z = toNumber(calibration[i].z);
    const u = toNumber(calibration[i].u);
    if (!Number.isFinite(z) || !Number.isFinite(u)) {
      return { error: `定标第 ${i + 1} 组的 Z 与 U 都要填数字` };
    }
    points.push({ z, u });
  }
  if (points.length < 2) return { error: '定标至少要 2 组数据' };

  const fit = linearFit(points.map((p) => p.z), points.map((p) => p.u));
  if (!fit) return { error: '定标数据无法拟合，请检查 Z 是否全部相同' };
  const k = Math.abs(fit.slope);
  if (!(k > 0)) return { error: '灵敏度 K 为 0，请检查定标数据' };

  const thickness = positiveAverage(source.thickness, '厚度 a', 'mm');
  if (thickness.error) return { error: thickness.error };
  const width = positiveAverage(source.width, '宽度 b', 'mm');
  if (width.error) return { error: width.error };
  const span = positiveAverage(source.span, '刀口间距 d', 'cm');
  if (span.error) return { error: span.error };


  const massG = toNumber(source.massG);
  if (!(massG > 0)) return { error: '负荷 M 必须是正数（单位 g）' };

  // 挠度：填了 ΔZ 就以 ΔZ 为准（并校验），只有 ΔZ 留空时才用 ΔU / K
  const rows = source.deflection || [];
  const details = [];
  for (let i = 0; i < rows.length; i += 1) {
    const dzText = rows[i].dz === null || rows[i].dz === undefined ? '' : String(rows[i].dz).trim();
    const duText = rows[i].du === null || rows[i].du === undefined ? '' : String(rows[i].du).trim();
    let deltaZ = NaN;
    let from = '';
    let deltaUText = '';
    if (dzText) {
      const dz = toNumber(dzText);
      if (!Number.isFinite(dz)) return { error: `挠度第 ${i + 1} 组的 ΔZ 要填数字（mm）` };
      if (!(dz > 0)) return { error: `挠度第 ${i + 1} 组的 ΔZ 必须大于 0（mm）` };
      deltaZ = dz;
      from = 'ΔZ 直测';
    } else if (duText) {
      const du = toNumber(duText);
      if (!Number.isFinite(du)) return { error: `挠度第 ${i + 1} 组的 ΔU 要填数字（mV）` };
      if (!(du > 0)) return { error: `挠度第 ${i + 1} 组的 ΔU 必须大于 0（mV）` };
      deltaZ = du / k;
      from = 'ΔU/K';
      deltaUText = trim(du, 6);
    } else {
      return { error: `挠度第 ${i + 1} 组要填 ΔZ 或 ΔU` };
    }
    details.push({
      index: i + 1,
      from,
      deltaZ,
      deltaZText: trim(deltaZ, 6),
      deltaUText,
    });
  }

  if (!details.length) return { error: '至少需要 1 组挠度数据' };

  const deltaZAvg = details.reduce((sum, item) => sum + item.deltaZ, 0) / details.length;

  const y = youngsModulus({
    thicknessMm: thickness.value,
    widthMm: width.value,
    spanCm: span.value,
    massG,
    deflectionMm: deltaZAvg,
  });
  if (!Number.isFinite(y) || !(y > 0)) return { error: '杨氏模量计算失败，请检查挠度是否过小' };

  const referenceRaw = source.referenceY === null || source.referenceY === undefined
    ? ''
    : String(source.referenceY).trim();
  let reference = NaN;
  let hasReference = false;
  if (referenceRaw) {
    reference = toNumber(referenceRaw);
    if (!Number.isFinite(reference)) return { error: '公认值 Y 要填数字（Pa），不填请留空' };
    if (!(reference > 0)) return { error: '公认值 Y 必须大于 0（Pa），不填请留空' };
    hasReference = true;
  }
  const signedError = hasReference ? ((y - reference) / reference) * 100 : null;

  return {
    result: {
      material: String(source.material || '').trim() || '未命名材料',
      k,
      kText: trim(k, 6),
      r2Text: Number.isFinite(fit.r2) ? fit.r2.toFixed(4) : '—',
      pointCount: points.length,
      thickness: thickness.value,
      width: width.value,
      span: span.value,
      thicknessCount: thickness.count,
      widthCount: width.count,
      spanCount: span.count,
      thicknessText: trim(thickness.value, 6),
      widthText: trim(width.value, 6),
      spanText: trim(span.value, 6),
      massText: trim(massG, 6),
      deltaZAvg,
      deltaZAvgText: trim(deltaZAvg, 6),
      details,
      y,
      yGpaText: (y / 1e9).toFixed(2),
      yExponential: y.toExponential(4),
      hasReference,
      errorText: hasReference ? signedError.toFixed(2) : '',
      referenceText: hasReference ? reference.toExponential(4) : '',
      higher: hasReference ? y > reference : false,
    },
  };
}

module.exports = { compute, linearFit, average, toNumber, youngsModulus };
