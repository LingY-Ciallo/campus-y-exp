# 校园小音 · 实验页面开发模板

不会从零写小程序，也可以贡献一个实验工具：**先创建自己的微信小程序（测试号即可），导入这份页面，把实验需要输入的参数、计算公式和最终输出告诉 AI，让 AI 在模板上完成开发；核对结果后，再向 [campus-y-exp](https://github.com/LingY-Ciallo/campus-y-exp) 提交 Pull Request。**

本目录是可独立导入微信开发者工具的原生小程序示例，使用 JavaScript、WXML、WXSS，不需要后端、校园登录、AI API Key 或 npm 依赖。这里的“让 AI 写”指在 VS Code 等编程工具中请 AI 修改源码，页面本身没有在线 AI 功能。

界面基于校园小音 **v4.3.3 - “Yutori Natsu”** 的现有实验页：相同的标题层级、20px 圆角卡片、44px 输入框与主题变量。版本来自主项目个人中心展示，模板不更改主项目版本。

## 1. 先运行起来

### 方式 A：直接导入完整模板（推荐）

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，用微信扫码登录。
2. 解压模板，找到包含 `app.json` 和 `project.config.json` 的这一层目录。
3. 在开发者工具中选择“导入项目”，目录选这一层。选择你自己的小程序 AppID，也可以选择工具提供的测试号；不使用云服务。
4. 模板配置中的 `touristappid` 是本地演示占位值。如果工具提示 AppID 无效，请在导入界面换成自己的测试号或已注册的小程序 AppID，不需要借用校园小音的 AppID。
5. 编译后会打开“重复测量数据处理”。点“载入示例”，再点“计算实验结果”。

工具不同版本的按钮名称可能略有不同；测试号用于开发调试，能否真机预览、上传或发布以你当前账号及工具提供的权限为准。本地示例计算不依赖这些权限。

### 方式 B：已经创建了自己的空白小程序，只导入 page

1. 创建一个原生 JavaScript 空白小程序。若工程有 `miniprogram/`，以下文件应放在该小程序源码目录内。
2. 把模板的 `pages/experiment-template/` **整个文件夹**复制到自己的 `pages/` 下。里面除了页面四件套，还有计算模块、主题预览模块及页面基础样式，不能只复制 `.wxml`。
3. 把模板的 `styles/demo-themes.wxss` 复制到自己的 `styles/` 下。
4. 在自己的 `app.wxss` 中添加：

   ```css
   @import "./styles/demo-themes.wxss";
   ```

5. 在自己的 `app.json` 的 `pages` 数组里添加 `pages/experiment-template/experiment-template`；把它放在首位可作为启动页。保留已有页面和其他配置，不要直接覆盖整个文件。
6. 在自己的 `App({...})` 中合并这项演示标记，不要另写第二个 `App()`：

   ```js
   globalData: {
     // 保留你已有的其他字段
     experimentTemplateDemo: true
   }
   ```

7. 要测试系统深浅色切换，在 `app.json` 中合并 `"darkmode": true`。重新编译。

**这套复制方法用于自己的独立测试项目。接回校园小音时，不复制演示 App、色板或演示标记，详见 [主项目接入与主题说明](docs/INTEGRATION.md)。**

## 2. 模板里面有什么

```text
campus-y-exp-template/
├─ app.js / app.json / app.wxss       独立演示壳
├─ project.config.json               微信开发者工具配置
├─ pages/experiment-template/
│  ├─ experiment-template.js          表单、校验提示、结果展示
│  ├─ experiment-template.wxml        页面结构
│  ├─ experiment-template.wxss        页面样式
│  ├─ experiment-template.json        页面标题等配置
│  ├─ calculator.js                   纯计算逻辑，AI 修改的重点
│  ├─ demo-appearance.js              独立示例的主题预览
│  └─ page-foundation.wxss            与现有实验页一致的基础布局
├─ styles/demo-themes.wxss            独立示例的主题色板
├─ tests/                            计算和页面行为回归
├─ docs/GITHUB-BEGINNER.md            GitHub / VS Code / Git 入门
├─ docs/INTEGRATION.md                主项目接入、主题适配
└─ .github/PULL_REQUEST_TEMPLATE.md   可参考的 PR 描述模板
```

示例支持 2～20 组重复测量，可增删行、填写单位、选填参考值、计算明细和复制结果。输入改动会隐藏旧结果，避免把旧结果当成新计算。实验数据不联网、不自动持久保存，离开页面前可复制留存。

这里的单位栏只标注单位，不换算单位；真实实验需要先统一量纲。示例中的“载入示例”用于开发验算，不能当作实际实验测量。

## 3. 怎样把需求告诉 AI

先把整个模板目录交给 AI，并准备实验指导书中的公式、参数表及一组能手算或用老师例题核对的数据。不能只说“帮我写某某实验”，否则 AI 可能猜错公式、单位或不确定度定义。

把下面这段复制给 AI，再填入方括号内容：

```text
请基于这份微信原生小程序实验模板，实现 [实验名称]。

一、输入参数
- [名称、符号、单位、是否必填、取值范围]
- [常量及其来源；哪些可改，哪些应固定]
- [测量数据：几组、每组几列、是否允许增删行、能否为负数或零]

二、计算要求
- [按实验指导书提供逐步公式，明确单位换算、常数、前置条件]
- [若需要拟合：自变量、因变量、是否强制过原点]
- [若需要不确定度：A/B 类、分布假设、仪器精度、合成公式、覆盖因子]
- 公式缺失或存在歧义时先问我，不要自行编造。

三、最终输出
- [需要计算出的每个数据、符号、单位、有效数字或小数位数]
- [需要展示的中间数据表、图表、误差或报告表达式]
- 中间计算保留精度，只在展示时舍入。

四、界面与实现
- 保留模板的标题、卡片、输入框、按钮风格和响应式布局。
- 适配 light / dark / monet / xiaoyin，保留 appearanceTheme / appearanceAccent。
- 颜色引用 --theme-* / --accent* 变量；输入框和占位符也要适配。
- 不把颜色固定成白底黑字，不添加外部字体、远程图片或新依赖。
- 计算尽量放在 calculator.js，表单与展示放在页面文件。
- 校验空值、非法数字、分母为零、范围和组数；修改输入后清除旧结果。
- 页面改名为 [英文短横线命名]，同步文件名、require、样式导入与 app.json 路径。
- 一并更新结果复制文案、页面公式说明、README 示例和测试，不保留旧实验公式。
- 未明确要求时不联网、不添加 AI Key，不修改校园小音主项目的登录和权益系统。

五、验算
- 输入：[真实例题数据]
- 期望输出：[已知答案及容许误差]
- 请实现后运行测试，列出更改文件、公式与核对结果。
```

比如你要做电阻测量，就明确电压单位是 V 还是 mV，电流单位是 A 还是 mA，输出需要每组电阻、平均电阻还是 U-I 拟合斜率，以及是否需要不确定度；让 AI 按你的指导书实现。

## 4. 示例计算怎么核对

模板默认处理的是**同一条件下、相互独立的重复测量**：

| 结果 | 公式 | 单位 |
| --- | --- | --- |
| 平均值 | x̄ = Σxi / n | 与输入相同 |
| 样本标准差 | s = √[Σ(xi − x̄)² / (n − 1)] | 与输入相同 |
| 平均值的 A 类标准不确定度 | uA = s / √n | 与输入相同 |
| 相对误差（参考值非空且非零时） | \| (x̄ − xref) / xref \| × 100% | % |

输入 `10.12、10.15、10.10、10.14、10.11 mm`，参考值 `10.00 mm`：平均值为 `10.124 mm`，样本标准差约 `0.0207364 mm`，uA 约 `0.00927362 mm`，相对误差为 `1.24%`。未填写参考值时不展示相对误差。

uA 不是合成不确定度，也不是扩展不确定度；本示例没有加入仪器精度、B 类分量、覆盖因子。真实实验若需要这些结果，请明确告诉 AI 公式和参数。

安装 [Node.js](https://nodejs.org/) 后，在模板根目录终端运行：

```powershell
npm test
```

无需先运行 `npm install`。这条命令只检查计算和页面交互逻辑，不能替代微信开发者工具编译和真机检查。

## 5. 不同主题都要能用

- 独立示例顶部可以切换跟随系统、浅色、深色、莫奈和小音主题。浅色/深色还支持天空蓝、蓝、灰、青、橙五种强调色。
- 莫奈沿用画纸、水绿、宋体标题及不规则圆角；小音沿用雾蓝、海军蓝和折角卡片。独立示例提取了无图片的基础视觉，没有打包主项目角色动画和完整纹理。
- 主题预览只影响这份独立模板。校园小音内的主题使用仍由主项目权益系统控制。
- 提交前每个主题都检查输入、占位符、错误提示、禁用按钮、结果、表格和导航栏。320px 窄屏与平板也要检查：页面不横向溢出，宽表格在自己的区域横向滚动。

详见 [主题变量与接入说明](docs/INTEGRATION.md)。

## 6. 做完以后如何贡献到 campus-y-exp

推荐路径：**Fork 原仓库 → 用 VS Code 克隆自己的 Fork → 新建分支 → 放入实验页面 → 测试 → Commit → Push → 向原仓库提交 PR。**

完整图形操作、Git 名词、可复制命令、同步更新、冲突处理与常见问题都在 [GitHub 新手指南](docs/GITHUB-BEGINNER.md)。只下载 ZIP 可以运行模板，但要贡献代码，推荐使用 Fork + Clone。

通用模板位于仓库根目录；新实验放在 `experiments/<英文短横线名称>/`，详见 [贡献约定](CONTRIBUTING.md)。主分支通过 PR 更新，需要 `LingY-Ciallo` 或 `LaZYKING233` 任意一位维护者审批，CI 通过且讨论解决后才能合并；新提交后需重新审批。GitHub 不允许作者自批，因此维护者自己发起的 PR 由另一位维护者审。安全规则及权限边界见 [SECURITY.md](SECURITY.md)。

## 本次内容（2026-11-06）

- 新增可独立运行、可交给 AI 改写的实验页模板；与校园小音 v4.3.3 的现有实验页视觉对齐。
- 提供多主题预览、参数与测量表单、纯计算模块、校验、结果明细及复制。
- 提供测试项目导入、AI 需求描述、主项目接入与 GitHub / VS Code / Git 贡献教程。
- 首次上传至 campus-y-exp；新增贡献约定、CODEOWNERS、只读 CI、固定 SHA 的官方 Actions 和 Dependabot 配置，配置两位指定维护者任选一人审核与禁止直推/强推/删除主分支规则。
- 验证记录见 [VALIDATION.md](docs/VALIDATION.md)。

## 官方参考

- [微信小程序开发起步](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)
- [VS Code 源代码管理](https://code.visualstudio.com/docs/sourcecontrol/overview)
- [VS Code 中的仓库与远程](https://code.visualstudio.com/docs/sourcecontrol/repos-remotes)
- [从 Fork 创建 Pull Request](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork)
