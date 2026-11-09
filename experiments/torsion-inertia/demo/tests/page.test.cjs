const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'pages/torsion-inertia');

// 复刻 setData 对 "list[0]" 这种路径的支持
function setPath(target, key, value) {
  const match = key.match(/^([A-Za-z0-9_]+)\[(\d+)\](?:\.([A-Za-z0-9_]+))?$/);
  if (!match) {
    target[key] = value;
    return;
  }
  const [, list, index, field] = match;
  if (field) target[list][Number(index)][field] = value;
  else target[list][Number(index)] = value;
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
  vm.runInNewContext(fs.readFileSync(path.join(folder, 'torsion-inertia.js'), 'utf8'), {
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

test('载入示例后计算得到 K = 0.0416865 N·m 与圆筒 −3.96%', () => {
  const { page } = createPage();
  page.loadExample();
  assert.equal(page.data.periodEmpty[0], '0.667534');
  assert.equal(page.data.tubeOuter[2], '100.2');
  page.calculate();
  assert.equal(page.data.error, '');
  assert.equal(page.data.result.kText, '0.0416865');
  assert.equal(page.data.result.j0Text, '4.7097e-4');
  const [cylinder, tube, rod] = page.data.result.items;
  assert.equal(cylinder.theoryText, '9.0375e-4');
  assert.equal(cylinder.errorText, '0.00');
  assert.equal(tube.theoryText, '1.6720e-3');
  assert.equal(tube.measuredText, '1.6058e-3');
  assert.equal(tube.errorText, '-3.96');
  assert.equal(rod.theoryText, '4.0515e-3');
  assert.equal(rod.measuredText, '3.7306e-3');
  assert.equal(rod.errorText, '-7.92');
});

test('复制文案包含原始读数、周期均值与三项结果', () => {
  const { page, clipboard } = createPage();
  page.loadExample();
  page.calculate();
  page.copyResult();
  const text = clipboard();
  assert.match(text, /扭摆法测量转动惯量/);
  assert.match(text, /圆柱体：质量 m1 = 723 g，直径 D1 = 100 mm/);
  assert.match(text, /金属圆筒：质量 m2 = 715 g，外径 100\.167 mm，内径 93\.1367 mm/);
  assert.match(text, /周期 T1（放圆柱体）：1\.141298 \/ 1\.140715 \/ 1\.141011 s（均值 1\.14101，3 次）/);
  assert.match(text, /扭转常量 K：0\.0416865 N·m/);
  assert.match(text, /空载物盘转动惯量 J0：4\.7097e-4 kg·m²/);
  assert.match(text, /金属圆筒：1\.6720e-3 \/ 1\.6058e-3 kg·m²，E = -3\.96%/);
});

test('修改任一输入后旧结果立即失效', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  assert.ok(page.data.result);
  page.onInput({ currentTarget: { dataset: { list: 'periodTube', index: 0 } }, detail: { value: '1.5' } });
  assert.equal(page.data.result, null);
  assert.equal(page.data.periodTube[0], '1.5');
  page.calculate();
  assert.notEqual(page.data.result.items[1].measuredText, '1.6058e-3');
});

test('数组单元格输入走统一 onInput', () => {
  const { page } = createPage();
  page.onInput({ currentTarget: { dataset: { list: 'rodLength', index: '1' } }, detail: { value: '601.2' } });
  assert.equal(page.data.rodLength[1], '601.2');
  assert.equal(page.data.error, '');
});

test('空数据计算给出定位到量的提示', () => {
  const { page } = createPage();
  page.calculate();
  assert.match(page.data.error, /圆柱体质量 m1 至少要填一次测量/);
  page.loadExample();
  page.onInput({ currentTarget: { dataset: { list: 'tubeInner', index: 2 } }, detail: { value: '' } });
  page.onInput({ currentTarget: { dataset: { list: 'tubeInner', index: 1 } }, detail: { value: '' } });
  page.onInput({ currentTarget: { dataset: { list: 'tubeInner', index: 0 } }, detail: { value: '' } });
  page.calculate();
  assert.match(page.data.error, /圆筒内径 D内 至少要填一次测量/);
});

test('清空后回到空表单且不保留结果', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  page.resetForm();
  // 页面运行在独立的 vm 上下文里，数组原型不同，用拼接后的字符串比较
  assert.equal(Array.from(page.data.cylinderDiameter).join('|'), '||');
  assert.equal(Array.from(page.data.periodRod).join('|'), '||');
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
  assert.deepEqual(app.pages, ['pages/torsion-inertia/torsion-inertia']);
  for (const page of app.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      assert.ok(fs.existsSync(path.join(root, `${page}.${extension}`)), `${page}.${extension}`);
    }
  }
  const { page } = createPage();
  const wxml = fs.readFileSync(path.join(folder, 'torsion-inertia.wxml'), 'utf8');
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
  checkStyle(path.join(folder, 'torsion-inertia.wxss'));
});

test('载入示例前检查所有已填字段', () => {
  const clean = createPage();
  clean.page.loadExample();
  assert.equal(clean.modalCount(), 0, '空表单载入示例不应弹窗');

  const onePeriod = createPage();
  onePeriod.page.onInput({ currentTarget: { dataset: { list: 'periodRod', index: 2 } }, detail: { value: '1.99' } });
  onePeriod.page.loadExample();
  assert.equal(onePeriod.modalCount(), 1, '只填了一个周期也要弹窗');

  const oneLength = createPage();
  oneLength.page.onInput({ currentTarget: { dataset: { list: 'rodLength', index: 0 } }, detail: { value: '601' } });
  oneLength.page.loadExample();
  assert.equal(oneLength.modalCount(), 1, '只填一个长度也要弹窗');

  const oneMass = createPage();
  oneMass.page.onInput({ currentTarget: { dataset: { list: 'cylinderMass', index: 0 } }, detail: { value: '723' } });
  oneMass.page.loadExample();
  assert.equal(oneMass.modalCount(), 1, '只填一个质量也要弹窗');
});
