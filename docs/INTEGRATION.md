# 页面接入与主题适配

## 独立小程序与校园小音主项目的区别

| 内容 | 自己创建的独立小程序 | 校园小音主项目 |
| --- | --- | --- |
| `app.js` | 使用本模板演示壳或合并演示标记 | 保留主项目原文件 |
| `styles/demo-themes.wxss` | 在全局 `app.wxss` 引入 | 不引入；沿用主项目主题 |
| 页面外观状态 | `demo-appearance.js` 负责预览 | 主项目 `app.js` 的 Page 包装器注入 |
| 演示主题开关 | 显示，可自由预览 | 自动隐藏，不改主题权益 |
| 账号、接口 | 不需要 | 本页仍不访问校园接口 |

接回校园小音时只迁移页面文件夹，不能为了适配一个页面覆盖 App、全局色板、项目配置或权益逻辑。

## 接入校园小音的操作示例（由维护者执行）

1. 复制整个 `pages/experiment-template/` 为 `academic/<实验英文名>/`。将四件套重命名为 `<实验英文名>.js/.json/.wxml/.wxss`。`calculator.js`、`demo-appearance.js`、`page-foundation.wxss` 继续放在同一目录。
2. 本页 `require('./calculator')`、`require('./demo-appearance')` 和 `@import "./page-foundation.wxss"` 均使用本目录相对路径；如重命名这些模块，必须一起更新引用。
3. 把页面注册进 `app.json` 中 `root: "academic"` 的 `pages` 数组，例如 `"my-experiment/my-experiment"`，不重复增加 academic 分包。
4. 在 `academic/experiments/experiments.wxml` 与 `.js` 中增加入口，跳转到 `/academic/my-experiment/my-experiment`。不要只注册页面却留下旧跳转路径。
5. 主项目已在 `app.js` 的 Page 包装器中处理 `onLoad` / `onShow` 外观注入、主题切换和权益恢复。保留页面的 `appearanceTheme`、`appearanceAccent` 根节点绑定；不设置 `globalData.experimentTemplateDemo`。
6. 本模板的预览模块在未启用演示标记时不执行。正式合入时可同时删除预览模块、相关 import、预览 UI / 数据和三个主题生命周期分支；不能只删文件留下 require。
7. 从主项目已有入口实测跳转、返回、主题切换与账号切换。不要在页面里直接改 `Page`、`App` 或解锁主题。
8. 运行 `npm run check:packages`，检查 academic 分包体积与跨包依赖；按主项目约定更新 README，版本取个人中心 `version-text`，不自动递增。

当前交付**没有执行以上主项目修改**，以便先在独立项目开发和提交审核。

## 颜色与组件约定

根节点沿用：

```xml
<view class="app-theme theme-{{appearanceTheme}} accent-{{appearanceAccent}}">
  <view class="container ui-page experiment-page">
    <!-- 页面内容 -->
  </view>
</view>
```

| 用途 | 变量 |
| --- | --- |
| 页面、卡片背景 | `--theme-page`、`--theme-surface` |
| 输入框、辅助区 | `--theme-input`、`--theme-surface-muted` |
| 正文、次级文字、占位符 | `--theme-text`、`--theme-text-secondary`、`--theme-text-muted` |
| 边框 | `--theme-border` |
| 主按钮、按钮文字 | `--accent`、`--accent-contrast` |
| 次按钮、结果摘要底色 | `--accent-soft` |

页面自定义规则使用变量；仅演示色板集中保存颜色常量。不要在某个主题下只改背景、遗漏文字、占位符、禁用态或图表标签。

主项目中 `monet`、`xiaoyin` 本身代表完整主题，包含独立强调色；无需将它们与“深色”叠加成不存在的组合。小音的普通/升级版沿用 `appearanceVariant` 的主项目行为，本实验页没有角色动画，不单独模拟升级权益。

## 布局与行为检查

- 输入和可点击按钮至少 44px 高；标签与单位明确，错误提示说明具体字段。
- 小屏字段可换行，测量输入仍可操作；单位及长结果允许换行。
- 宽数据表用 `scroll-view scroll-x` 包裹，不让整个页面左右滚动。
- 无额外动画；新加动画时支持减少动态偏好，不能阻碍输入与计算。
- 点击计算时严格检查输入；数据更改、增删行、载入示例后旧结果失效。
- 导航栏和原生 picker 也需在微信开发者工具/真机查看。浏览器截图只能补充布局检查。

## AI 改写后经常漏改的地方

1. `.json` 导航标题、页面标题和实验简介。
2. 输入名称、符号、单位换算和初始行数。
3. `calculator.js` 的导出及页面读取结果字段。
4. 明细表、公式说明、复制内容和“载入示例”的数字。
5. 示例手算答案、测试数据与 README。
6. 文件名、`app.json` 注册与页面跳转。

提交时说明公式来源、计算适用条件和验证数据，让维护者能够复核。
