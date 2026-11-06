const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'pages/experiment-template');

function createPage(demoMode = false) {
  let options;
  let clipboard;
  let applyCount = 0;
  const wx = {
    showModal: options => options.success({ confirm: true }),
    showToast() {}, setClipboardData: options => { clipboard = options.data; },
    onThemeChange(listener) { this.listener = listener; },
    offThemeChange(listener) { assert.equal(this.listener, listener); this.listener = null; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(folder, 'experiment-template.js'), 'utf8'), {
    Page: value => { options = value; }, getApp: () => ({ globalData: { experimentTemplateDemo: demoMode } }), wx,
    require: name => name === './calculator' ? require(path.join(folder, 'calculator')) : {
      apply: () => { applyCount++; }, THEMES: [], ACCENTS: []
    }
  });
  const page = Object.assign({}, options, {
    data: JSON.parse(JSON.stringify(options.data)),
    setData(update) {
      for (const [key, value] of Object.entries(update)) {
        const match = key.match(/^rows\[(\d+)\]\.value$/);
        if (match) this.data.rows[Number(match[1])].value = value;
        else this.data[key] = value;
      }
    }
  });
  page.onLoad();
  page.onShow();
  return { page, wx, clipboard: () => clipboard, applyCount: () => applyCount };
}

test('填写示例、计算、复制和修改输入后的结果失效', () => {
  const { page, clipboard } = createPage();
  page.loadExample();
  page.calculate();
  assert.equal(page.data.result.mean, '10.124');
  page.copyResult();
  assert.match(clipboard(), /A 类标准不确定度 uA：0.00927362 mm/);
  assert.match(clipboard(), /10.15 mm/);
  page.onMeasurementInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: '10.20' } });
  assert.equal(page.data.result, null);
  assert.equal(page.data.rows[0].value, '10.20');
  page.calculate();
  assert.notEqual(page.data.result.mean, '10.124');
});

test('空值与空单位显示错误，清空操作移除所有结果', () => {
  const { page } = createPage();
  page.calculate();
  assert.match(page.data.error, /第 1 组/);
  page.loadExample();
  page.onFieldInput({ currentTarget: { dataset: { field: 'unit' } }, detail: { value: '' } });
  page.calculate();
  assert.match(page.data.error, /测量单位/);
  page.resetForm();
  assert.equal(page.data.rows.length, 5);
  assert.ok(page.data.rows.every(row => row.value === ''));
  assert.equal(page.data.result, null);
  assert.equal(page.data.error, '');
});

test('增删行受组数边界约束且行 ID 唯一', () => {
  const { page } = createPage();
  for (let i = 0; i < 30; i++) page.addRow();
  assert.equal(page.data.rows.length, 20);
  assert.equal(new Set(page.data.rows.map(row => row.id)).size, 20);
  for (let i = 0; i < 30; i++) page.removeRow({ currentTarget: { dataset: { id: page.data.rows[0].id } } });
  assert.equal(page.data.rows.length, 2);
  assert.equal(page.data.result, null);
});

test('主项目中不执行演示主题逻辑；独立模式清理系统主题监听', () => {
  const integrated = createPage(false);
  assert.equal(integrated.applyCount(), 0);
  assert.equal(integrated.page.data.demoMode, false);
  const demo = createPage(true);
  assert.equal(demo.applyCount(), 1);
  assert.equal(typeof demo.wx.listener, 'function');
  demo.wx.listener();
  assert.equal(demo.applyCount(), 2);
  demo.page.onUnload();
  assert.equal(demo.wx.listener, null);
});

test('主题预览支持所有主题/强调色及系统切换，导航栏与背景同步', () => {
  let systemTheme = 'dark';
  let saved = {};
  let nav;
  let background;
  const context = {
    module: { exports: {} },
    wx: {
      getStorageSync: () => saved, setStorageSync: (_, data) => { saved = data; },
      getSystemInfoSync: () => ({ theme: systemTheme }),
      setNavigationBarColor: data => { nav = data; }, setBackgroundColor: data => { background = data; }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(folder, 'demo-appearance.js'), 'utf8'), context);
  const demo = context.module.exports;
  const page = { data: {}, setData(update) { Object.assign(this.data, update); } };
  for (const theme of demo.THEMES) {
    for (const accent of demo.ACCENTS) {
      demo.apply(page, { theme: theme.id, accent: accent.id });
      assert.equal(page.data.appearanceTheme, theme.id === 'system' ? 'dark' : theme.id);
      assert.equal(page.data.appearanceAccent, accent.id);
      assert.equal(nav.frontColor, page.data.appearanceTheme === 'dark' ? '#ffffff' : '#000000');
      assert.equal(background.backgroundColor, background.backgroundColorTop);
    }
  }
  systemTheme = 'light';
  demo.apply(page, { theme: 'system' });
  assert.equal(page.data.appearanceTheme, 'light');
  demo.apply(page, { theme: 'unknown', accent: 'unknown' });
  assert.equal(page.data.appearanceTheme, 'light');
  assert.equal(page.data.appearanceAccent, 'sky');
});

test('注册路径、页面文件、事件与 WXSS 本地依赖完整', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  for (const page of app.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(path.join(root, `${page}.${extension}`)));
  }
  const { page } = createPage();
  const wxml = fs.readFileSync(path.join(folder, 'experiment-template.wxml'), 'utf8');
  for (const match of wxml.matchAll(/bind(?:input|tap|change)="([A-Za-z]+)"/g)) assert.equal(typeof page[match[1]], 'function', match[1]);
  function checkStyle(file) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/@import\s+"([^"]+)"/g)) {
      const imported = path.resolve(path.dirname(file), match[1]);
      assert.ok(fs.existsSync(imported), imported);
      checkStyle(imported);
    }
  }
  checkStyle(path.join(root, 'app.wxss'));
  checkStyle(path.join(folder, 'experiment-template.wxss'));
  assert.ok(wxml.includes('theme-{{appearanceTheme}} accent-{{appearanceAccent}}'));
});
