// 仅独立模板的主题预览。接回主项目后不调用、不修改会员或主题权益。
const THEMES = [
  { id: 'system', name: '跟随系统' }, { id: 'light', name: '浅色' },
  { id: 'dark', name: '深色' }, { id: 'monet', name: '莫奈 · 睡莲' },
  { id: 'xiaoyin', name: '小音 · 乘风同行' }
];
const ACCENTS = [
  { id: 'sky', name: '天空蓝' }, { id: 'blue', name: '蓝色' },
  { id: 'gray', name: '灰色' }, { id: 'teal', name: '青色' }, { id: 'orange', name: '橙色' }
];
const STORAGE_KEY = 'campus-y-exp-template:appearance';
const CHROME = {
  light: { navigation: '#ffffff', page: '#f8f9fa' },
  dark: { navigation: '#17191f', page: '#17191f' },
  monet: { navigation: '#edf4ed', page: '#eaf0ed' },
  xiaoyin: { navigation: '#f4f8fc', page: '#f1f7fc' }
};

function apply(page, change) {
  let saved = {};
  try { saved = wx.getStorageSync(STORAGE_KEY) || {}; } catch (_) { /* 缓存不可用时仍可预览 */ }
  const next = Object.assign({}, saved, change);
  const themeIndex = Math.max(0, THEMES.findIndex(item => item.id === next.theme));
  const accentIndex = Math.max(0, ACCENTS.findIndex(item => item.id === next.accent));
  const theme = THEMES[themeIndex].id;
  const accent = ACCENTS[accentIndex].id;
  const resolved = theme === 'system'
    ? (wx.getSystemInfoSync().theme === 'dark' ? 'dark' : 'light') : theme;
  page.setData({
    appearanceTheme: resolved, appearanceAccent: accent, themeIndex, accentIndex,
    themeNames: THEMES.map(item => item.name), accentNames: ACCENTS.map(item => item.name)
  });
  try { wx.setStorageSync(STORAGE_KEY, { theme, accent }); } catch (_) { /* 不阻断计算 */ }
  const colors = CHROME[resolved];
  wx.setNavigationBarColor({ frontColor: resolved === 'dark' ? '#ffffff' : '#000000', backgroundColor: colors.navigation });
  wx.setBackgroundColor({ backgroundColor: colors.page, backgroundColorTop: colors.page, backgroundColorBottom: colors.page });
}

module.exports = { apply, THEMES, ACCENTS };
