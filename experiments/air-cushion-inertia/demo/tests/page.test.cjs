const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'pages/air-cushion-inertia');
const PAGE = 'air-cushion-inertia';

// 复刻 setData 对 "groups[0].t1[1]" 这种路径的支持
function setPath(target, key, value) {
  const match = key.match(/^([A-Za-z0-9_]+)\[(\d+)\](?:\.([A-Za-z0-9_]+)(?:\[(\d+)\])?)?$/);
  if (!match) {
    target[key] = value;
    return;
  }
  const [, list, index, field, sub] = match;
  if (field === undefined) target[list][Number(index)] = value;
  else if (sub === undefined) target[list][Number(index)][field] = value;
  else target[list][Number(index)][field][Number(sub)] = value;
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
    offThemeChange(listener) { assert.equal(this.listener, listener); this.listener = null; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(folder, `${PAGE}.js`), 'utf8'), {
    Page: (value) => { options = value; },
    getApp: () => ({ globalData: { experimentTemplateDemo: demoMode } }),
    wx,
    require: (name) => (name === './calculator'
      ? require(path.join(folder, 'calculator'))
      : { apply: () => { applyCount += 1; }, THEMES: [], ACCENTS: [] })
  });
  const page = Object.assign({}, options, {
    data: JSON.parse(JSON.stringify(options.data)),
    setData(update) {
      for (const [key, value] of Object.entries(update)) setPath(this.data, key, value);
    }
  });
  page.onLoad();
  page.onShow();
  return { page, wx, clipboard: () => clipboard, applyCount: () => applyCount, modalCount: () => modalCount };
}

function type(page, group, field, index, value) {
  page.onInput({
    currentTarget: { dataset: { group, field, index } },
    detail: { value },
  });
}

test('载入示例后计算得到 J = 2.1715e-3、Mf = -1.2267e-3、r = 0.9957', () => {
  const { page } = createPage();
  page.loadExample();
  assert.equal(page.data.groups.length, 5);
  assert.equal(page.data.groups[0].mass, '1');
  assert.equal(page.data.groups[4].t2[2], '2.89512');
  page.calculate();
  assert.equal(page.data.error, '');
  const { groups, fit, plot } = page.data.result;
  assert.equal(groups.length, 5);
  assert.equal(groups[0].alphaText, '0.6254');
  assert.equal(groups[4].alphaText, '1.2768');
  assert.equal(groups[4].torqueText, '1.568e-3');
  assert.equal(fit.slopeText, '2.1715e-3');
  assert.equal(fit.interceptText, '-1.2267e-3');
  assert.equal(fit.rText, '0.9957');
  assert.equal(fit.count, 5);
  assert.equal(plot.points.length, 5);
  assert.ok(plot.line.width > 100);
});

test('复制文案逐组列出每次读数，再给汇总与拟合', () => {
  const { page, clipboard } = createPage();
  page.loadExample();
  page.calculate();
  page.copyResult();
  const text = clipboard();
  assert.match(text, /气垫法测刚体转动惯量/);
  assert.match(text, /实验常量：g = 9\.8 m\/s²，塔轮半径 r = 2\.00 cm/);
  assert.match(text, /第 1 组：砝码质量 m = 1 g/);
  assert.match(text, /第 1 组 t1：2\.49021 \/ 2\.47475 \/ 2\.49084 s（均值 2\.48527，3 次）/);
  assert.match(text, /第 1 组 t2：4\.13579 \/ 4\.11533 \/ 4\.13952 s（均值 4\.13021，3 次）/);
  assert.match(text, /第 5 组 t1：1\.73804 \/ 1\.74664 \/ 1\.74214 s（均值 1\.74227，3 次）/);
  assert.match(text, /第 5 组：t̄1 = 1\.74227 s，t̄2 = 2\.8943 s，α = 1\.2768 rad\/s²，M = 1\.568e-3 N·m/);
  assert.match(text, /最小二乘拟合（M = J·α \+ Mf，有效 5 组）：/);
  assert.match(text, /转动惯量 J：2\.1715e-3 kg·m²/);
  assert.match(text, /拟合截距 Mf：-1\.2267e-3 N·m/);
  assert.match(text, /相关系数 r：0\.9957/);
  assert.match(text, /判读：0\.99 ≤ r < 0\.9999/);
  assert.match(text, /截距说明：截距为负/);
});

test('复制文案不丢任何一次读数', () => {
  const { page, clipboard } = createPage();
  const rows = [
    ['1', ['2.49021', '2.47475', '2.49084'], ['4.13579', '4.11533', '4.13952']],
    ['2', ['2.34567', '2.22399', '2.21827'], ['3.88888', '3.69096', '3.68289']],
  ];
  rows.forEach(([mass, t1, t2], index) => {
    type(page, index, 'mass', undefined, mass);
    t1.forEach((value, i) => type(page, index, 't1', i, value));
    t2.forEach((value, i) => type(page, index, 't2', i, value));
  });
  page.calculate();
  page.copyResult();
  const text = clipboard();
  assert.match(text, /第 2 组 t1：2\.34567 \/ 2\.22399 \/ 2\.21827 s（均值 2\.26264，3 次）/);
  assert.match(text, /第 2 组 t2：3\.88888 \/ 3\.69096 \/ 3\.68289 s（均值 3\.75424，3 次）/);
  // 只填一行时另一组整组留空，不会出现在文案里
  assert.equal(/第 3 组/.test(text), false);
});

test('未填完的组：整组空着跳过，填了一半要点名缺哪项', () => {
  const { page } = createPage();
  page.loadExample();
  ['', '', ''].forEach((value, i) => type(page, 4, 't2', i, value));
  page.calculate();
  assert.match(page.data.error, /第 5 组 t2 至少要填一次测量（s）/);

  // 只剩 t1 也不行的：整组要清干净才会被跳过
  type(page, 4, 'mass', undefined, '');
  page.calculate();
  assert.match(page.data.error, /第 5 组砝码质量 m 不能为空（g）/);

  ['', '', ''].forEach((value, i) => type(page, 4, 't1', i, value));
  page.calculate();
  assert.equal(page.data.error, '');
  assert.equal(page.data.result.fit.count, 4);
  assert.equal(page.data.result.plot.points.length, 4);
});

test('修改任一输入后旧结果立即失效', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  assert.ok(page.data.result);
  type(page, 0, 't2', 0, '4.2');
  assert.equal(page.data.result, null);
  assert.equal(page.data.groups[0].t2[0], '4.2');
  page.calculate();
  assert.notEqual(page.data.result.groups[0].t1Text, undefined);
});

test('空表单计算给出先填数据的提示', () => {
  const { page } = createPage();
  page.calculate();
  assert.match(page.data.error, /还没有填写有效数据/);
  assert.equal(page.data.result, null);
});

test('清空后回到空表单且不保留结果', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  page.resetForm();
  assert.equal(page.data.groups.length, 5);
  assert.equal(page.data.groups[2].mass, '');
  assert.equal(Array.from(page.data.groups[2].t1).join('|'), '||');
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

test('载入示例前检查所有已填字段', () => {
  const clean = createPage();
  clean.page.loadExample();
  assert.equal(clean.modalCount(), 0, '空表单载入示例不应弹窗');

  const oneTime = createPage();
  type(oneTime.page, 2, 't1', 1, '2.07');
  oneTime.page.loadExample();
  assert.equal(oneTime.modalCount(), 1, '只填一个时间也要弹窗');

  const oneMass = createPage();
  type(oneMass.page, 4, 'mass', undefined, '8');
  oneMass.page.loadExample();
  assert.equal(oneMass.modalCount(), 1, '只填一个质量也要弹窗');
});
