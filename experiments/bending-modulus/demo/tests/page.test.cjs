const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'pages/bending-modulus');

// 复刻 setData 对 "list[0].key" 这种路径的支持
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
  const wx = {
    showModal: (config) => config.success({ confirm: true }),
    showToast() {},
    setClipboardData: (config) => { clipboard = config.data; },
    onThemeChange(listener) { this.listener = listener; },
    offThemeChange(listener) { assert.equal(this.listener, listener); this.listener = null; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(folder, 'bending-modulus.js'), 'utf8'), {
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
  return { page, wx, clipboard: () => clipboard, applyCount: () => applyCount };
}

test('载入示例后计算得到 193.22 GPa 与 6.46%', () => {
  const { page } = createPage();
  page.loadExample();
  assert.equal(page.data.calibration.length, 6);
  assert.equal(page.data.calibration[0].z, '3.245');
  page.calculate();
  assert.equal(page.data.error, '');
  assert.equal(page.data.result.yGpaText, '193.22');
  assert.equal(page.data.result.kText, '299.16');
  assert.equal(page.data.result.deltaZAvgText, '0.672997');
  assert.equal(page.data.result.errorText, '6.46');
});

test('复制文案包含材料、灵敏度、挠度明细', () => {
  const { page, clipboard } = createPage();
  page.loadExample();
  page.calculate();
  page.copyResult();
  const text = clipboard();
  assert.match(text, /材料：铸铁/);
  assert.match(text, /灵敏度 K：299.16 V\/m/);
  assert.match(text, /杨氏模量 Y：193.22 GPa/);
  assert.match(text, /0\.66854 mm（ΔU\/K）/);
  assert.match(text, /与公认值 1\.8150e\+11 Pa 相比：6\.46%/);
});

test('修改任一输入后旧结果立即失效', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  assert.ok(page.data.result);
  page.onInput({ currentTarget: { dataset: { list: 'calibration', index: 0, key: 'u' } }, detail: { value: '20' } });
  assert.equal(page.data.result, null);
  assert.equal(page.data.calibration[0].u, '20');
  page.calculate();
  assert.notEqual(page.data.result.deltaZAvgText, '0.672997');
});

test('单字段输入与数组单元格输入都走同一个 onInput', () => {
  const { page } = createPage();
  page.onInput({ currentTarget: { dataset: { field: 'massG' } }, detail: { value: '80' } });
  assert.equal(page.data.massG, '80');
  page.onInput({ currentTarget: { dataset: { list: 'thickness', index: '1' } }, detail: { value: '0.87' } });
  assert.equal(page.data.thickness[1], '0.87');
});

test('空数据计算给出定位到组号的提示', () => {
  const { page } = createPage();
  page.calculate();
  assert.match(page.data.error, /定标第 1 组/);
  page.loadExample();
  page.onInput({ currentTarget: { dataset: { list: 'calibration', index: 2, key: 'z' } }, detail: { value: '' } });
  page.calculate();
  assert.match(page.data.error, /定标第 3 组/);
});

test('定标 4～12 点、挠度 1～6 组的增删边界', () => {
  const { page } = createPage();
  for (let i = 0; i < 20; i += 1) page.addRow({ currentTarget: { dataset: { list: 'calibration' } } });
  assert.equal(page.data.calibration.length, 12);
  assert.equal(new Set(page.data.calibration.map((row) => row.id)).size, 12);
  for (let i = 0; i < 20; i += 1) {
    page.removeRow({ currentTarget: { dataset: { list: 'calibration', id: page.data.calibration[0].id } } });
  }
  assert.equal(page.data.calibration.length, 4);

  for (let i = 0; i < 20; i += 1) page.addRow({ currentTarget: { dataset: { list: 'deflection' } } });
  assert.equal(page.data.deflection.length, 6);
  for (let i = 0; i < 20; i += 1) {
    page.removeRow({ currentTarget: { dataset: { list: 'deflection', id: page.data.deflection[0].id } } });
  }
  assert.equal(page.data.deflection.length, 1);
});

test('清空后回到初始组数且不保留结果', () => {
  const { page } = createPage();
  page.loadExample();
  page.calculate();
  page.resetForm();
  assert.equal(page.data.calibration.length, 6);
  assert.equal(page.data.deflection.length, 3);
  assert.equal(page.data.material, '');
  assert.equal(page.data.massG, '60');
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
  assert.deepEqual(app.pages, ['pages/bending-modulus/bending-modulus']);
  for (const page of app.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      assert.ok(fs.existsSync(path.join(root, `${page}.${extension}`)), `${page}.${extension}`);
    }
  }
  const { page } = createPage();
  const wxml = fs.readFileSync(path.join(folder, 'bending-modulus.wxml'), 'utf8');
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
  checkStyle(path.join(folder, 'bending-modulus.wxss'));
});
