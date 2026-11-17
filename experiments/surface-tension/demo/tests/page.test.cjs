const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'pages/surface-tension');
const PAGE = 'surface-tension';

// 复刻 setData 对 "liquids[0].rows[1].u1"、"diameters.d1[2].value" 这类路径的支持
function setPath(target, key, value) {
  const tokens = [];
  key.replace(/\[(\d+)\]|([A-Za-z0-9_]+)/g, (whole, index, name) => {
    tokens.push(index === undefined ? name : Number(index));
    return whole;
  });
  let node = target;
  for (let i = 0; i < tokens.length - 1; i += 1) node = node[tokens[i]];
  node[tokens[tokens.length - 1]] = value;
}

function createPage(demoMode = false) {
  let options;
  let clipboard;
  let applyCount = 0;
  let modalCount = 0;
  const wx = {
    showModal: (config) => { modalCount += 1; config.success({ confirm: true }); },
    showToast() {},
    setClipboardData: (config) => { clipboard = config.data; },
    onThemeChange(listener) { this.listener = listener; },
    offThemeChange(listener) { assert.equal(this.listener, listener); this.listener = null; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(folder, `${PAGE}.js`), 'utf8'), {
    Page: (value) => { options = value; },
    getApp: () => ({ globalData: { experimentTemplateDemo: demoMode } }),
    wx,
    require: (name) => (name === './calculator'
      ? require(path.join(folder, 'calculator'))
      : { apply: () => { applyCount += 1; }, THEMES: [], ACCENTS: [] }),
  });
  const page = Object.assign({}, options, {
    data: JSON.parse(JSON.stringify(options.data)),
    setData(update) {
      for (const [key, value] of Object.entries(update)) setPath(this.data, key, value);
    },
  });
  page.onLoad();
  page.onShow();
  return {
    page,
    wx,
    clipboard: () => clipboard,
    applyCount: () => applyCount,
    modalCount: () => modalCount,
  };
}

function typeCalibration(page, index, field, value) {
  page.onCalibrationInput({
    currentTarget: { dataset: { index, field } },
    detail: { value },
  });
}

function typeDiameter(page, field, index, value) {
  page.onDiameterInput({
    currentTarget: { dataset: { field, index } },
    detail: { value },
  });
}

function typeLiquid(page, liquid, index, field, value) {
  page.onLiquidInput({
    currentTarget: { dataset: { liquid, index, field } },
    detail: { value },
  });
}

test('载入示例后计算得到 K = 2.79375、盐水 0.08255、水 0.07310', () => {
  const { page } = createPage();
  page.loadExample();
  assert.equal(page.data.calibration.length, 8);
  assert.equal(page.data.calibration[7].voltage, '97.9');
  assert.equal(page.data.diameters.d1.length, 5);
  assert.equal(page.data.liquids.length, 2);
  assert.equal(page.data.liquids[1].rows[5].u2, '-0.1');

  page.calculate();
  assert.equal(page.data.error, '');
  const { calibration, diameters, liquids, verdict } = page.data.result;
  assert.equal(calibration.kText, '2.79375');
  assert.equal(calibration.slopeText, '27.9375');
  assert.equal(diameters.loopText, '212.673');
  assert.equal(liquids[0].name, '盐水');
  assert.equal(liquids[0].meanAText, '0.08255');
  assert.equal(liquids[1].meanAText, '0.07310');
  assert.match(verdict, /盐水.*大于水/);
});

test('复制文案逐次列出直径与每次电压，再给定标与平均结果', () => {
  const { page, clipboard } = createPage();
  page.loadExample();
  page.calculate();
  page.copyResult();
  const text = clipboard();
  assert.match(text, /拉脱法测液体表面张力系数/);
  assert.match(text, /定标砝码 m：0 \/ 0\.5 \/ 1 \/ 1\.5 \/ 2 \/ 2\.5 \/ 3 \/ 3\.5 g/);
  assert.match(text, /定标电压 U：0 \/ 14\.2 \/ 28\.1 \/ 43\.1 \/ 56\.2 \/ 70\.6 \/ 84\.2 \/ 97\.9 mV（与砝码一一对应）/);
  // 直径 5 次读数逐个列出，不只给均值
  assert.match(text, /圆环内径 D1：32\.92 \/ 32\.94 \/ 32\.88 \/ 32\.90 \/ 32\.92 mm（均值 32\.912，5 次）/);
  assert.match(text, /圆环外径 D2：34\.80 \/ 34\.74 \/ 34\.78 \/ 34\.76 \/ 34\.84 mm（均值 34\.784，5 次）/);
  assert.match(text, /盐水 U1：49\.3 \/ 48\.8 \/ 49\.0 \/ 48\.9 \/ 49\.1 \/ 49\.0 mV/);
  assert.match(text, /水 U2：-0\.4 \/ -0\.2 \/ -0\.5 \/ -0\.3 \/ -0\.4 \/ -0\.1 mV/);
  assert.match(text, /ΔU = 55\.875 mV，Δm = 2 g，斜率 = 27\.9375 mV\/g/);
  assert.match(text, /灵敏度 K = 2\.79375 V\/N/);
  assert.match(text, /D̄1 = 32\.912 mm，D̄2 = 34\.784 mm，L = π\(D̄1 \+ D̄2\) = 212\.673 mm/);
  assert.match(text, /第 1 次：U1 = 49\.3 mV，U2 = 0\.1 mV，ΔU = 49\.2 mV，F = 17\.6107 mN，a = 0\.08281 N\/m/);
  assert.match(text, /平均 a = 0\.08255 N\/m/);
  assert.match(text, /平均 a = 0\.07310 N\/m/);
  assert.match(text, /判读：盐水平均表面张力系数大于水/);
  assert.match(text, /定标分两步——ΔF\(N\) = Δm\(g\) \/ 100（g 取 10 m\/s²）/);
  assert.match(text, /斜率 ΔU\/Δm（mV\/g）换成 K（V\/N）时除以 10/);
});

test('复制文案里每种液体 6 次读数一次不落', () => {
  const { page, clipboard } = createPage();
  page.loadExample();
  page.calculate();
  page.copyResult();
  const text = clipboard();
  const count = (text.match(/第 \d 次：U1 = /g) || []).length;
  assert.equal(count, 12, '两种液体各 6 次共 12 行');
});

test('三类输入都会写进对应格子，并让旧结果立即失效', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  assert.ok(page.data.result);

  typeCalibration(page, 3, 'voltage', '44.4');
  assert.equal(page.data.calibration[3].voltage, '44.4');
  assert.equal(page.data.result, null);

  page.calculate();
  typeDiameter(page, 'd1', 2, '32.90');
  assert.equal(page.data.diameters.d1[2].value, '32.90');
  assert.equal(page.data.result, null);

  page.calculate();
  typeLiquid(page, 1, 0, 'u2', '-0.5');
  assert.equal(page.data.liquids[1].rows[0].u2, '-0.5');
  assert.equal(page.data.result, null);

  page.calculate();
  assert.equal(page.data.result.liquids[1].rows[0].u2Text, '-0.5');
});

test('空表单计算提示先补定标，U1、U2 填反会点名到第几次', () => {
  const empty = createPage();
  empty.page.calculate();
  assert.match(empty.page.data.error, /定标第 1 组砝码质量 m 不能为空（g）/);
  assert.equal(empty.page.data.result, null);

  const flipped = createPage();
  flipped.page.loadExample();
  typeLiquid(flipped.page, 0, 1, 'u1', '0.2');
  typeLiquid(flipped.page, 0, 1, 'u2', '49.0');
  flipped.page.calculate();
  assert.match(flipped.page.data.error, /盐水第 2 次 U1 − U2 ≤ 0/);
  assert.equal(flipped.page.data.result, null);
});

test('内外径填反时页面拦下并提示，不出结果', () => {
  const { page } = createPage();
  page.loadExample();
  const inner = page.data.diameters.d1.map((cell) => cell.value);
  const outer = page.data.diameters.d2.map((cell) => cell.value);
  page.data.diameters.d1 = outer.map((value, id) => ({ id, value }));
  page.data.diameters.d2 = inner.map((value, id) => ({ id, value }));
  page.calculate();
  assert.match(page.data.error, /外径 D2 平均值（32\.912 mm）必须大于内径 D1 平均值（34\.784 mm）/);
  assert.equal(page.data.result, null);
});

test('清空后回到空表单且不保留结果', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  page.resetForm();
  assert.equal(page.data.calibration[0].mass, '');
  assert.equal(page.data.diameters.d1[0].value, '');
  assert.equal(page.data.liquids[0].rows[0].u1, '');
  assert.equal(page.data.liquids.length, 2);
  assert.equal(page.data.result, null);
  assert.equal(page.data.error, '');
});

test('演示主题逻辑只在独立模式下执行', () => {
  const integrated = createPage(false);
  assert.equal(integrated.page.data.demoMode, false);
  assert.equal(integrated.applyCount(), 0);

  const demo = createPage(true);
  assert.equal(demo.page.data.demoMode, true);
  assert.equal(demo.applyCount(), 1);
  assert.equal(typeof demo.wx.listener, 'function');
  demo.page.onUnload();
  assert.equal(demo.wx.listener, null);
});

test('载入示例前检查所有已填字段', () => {
  const clean = createPage();
  clean.page.loadExample();
  assert.equal(clean.modalCount(), 0, '空表单载入示例不应弹窗');

  const calibration = createPage();
  typeCalibration(calibration.page, 0, 'mass', '0');
  calibration.page.loadExample();
  assert.equal(calibration.modalCount(), 1, '只填一个砝码也要弹窗');

  const diameter = createPage();
  typeDiameter(diameter.page, 'd2', 4, '34.84');
  diameter.page.loadExample();
  assert.equal(diameter.modalCount(), 1, '只填一个直径也要弹窗');

  const liquid = createPage();
  typeLiquid(liquid.page, 1, 5, 'u2', '-0.1');
  liquid.page.loadExample();
  assert.equal(liquid.modalCount(), 1, '只填一个 U2 也要弹窗');
});

test('注册路径、页面文件、事件绑定与样式依赖完整', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  assert.deepEqual(app.pages, [`pages/${PAGE}/${PAGE}`]);
  for (const page of app.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      assert.ok(fs.existsSync(path.join(root, `${page}.${extension}`)), `${page}.${extension}`);
    }
  }
  const { page } = createPage();
  const wxml = fs.readFileSync(path.join(folder, `${PAGE}.wxml`), 'utf8');
  for (const match of wxml.matchAll(/bind(?:input|tap|change)="([A-Za-z]+)"/g)) {
    assert.equal(typeof page[match[1]], 'function', match[1]);
  }
  assert.ok(wxml.includes('theme-{{appearanceTheme}} accent-{{appearanceAccent}}'));
  assert.equal(wxml.includes('&lt;'), false);

  function checkStyle(file) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/@import\s+"([^"]+)"/g)) {
      const imported = path.resolve(path.dirname(file), match[1]);
      assert.ok(fs.existsSync(imported), imported);
      checkStyle(imported);
    }
  }
  checkStyle(path.join(root, 'app.wxss'));
  checkStyle(path.join(folder, `${PAGE}.wxss`));
});
