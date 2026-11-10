# 贡献实验页面

第一次使用 GitHub？先看 [VS Code / Git / PR 新手指南](docs/GITHUB-BEGINNER.md)，实验开发步骤和 AI 提示词在 [README](README.md)。

## 开始适配前

- 做任何实验的适配前，必须先检查本仓库 `experiments/` 和[校园小音主仓库的实验页面](https://github.com/LingY-Ciallo/campus-palu/tree/main/academic)。可以人工查阅，也可以请 AI 辅助搜索。对照实验编号、名称或别名、测量对象和方法，避免同一实验换名后重复开发。
- 已有同一实验时，跳过新增。如果目标是改进现有页面，请针对原页面提交，并在 PR 说明里写明改动范围。主仓库接入时也会再次比对并跳过重复项。
- 他人贡献的页面通常以 PR 作者的 GitHub 用户名署名。如果希望使用其他显示名，或更改已有页面的贡献署名，请在 PR 说明里明确写出希望展示的准确署名。

## 放在哪里

仓库根目录保留通用模板与可直接导入的示例，不要用个人工程覆盖根目录的 App、配置或模板文件。

新增实验放在 `experiments/<英文短横线名称>/`：

```text
experiments/ohms-law/
├─ README.md                 参数、单位、公式来源、输出与验算
└─ demo/                     独立可运行的微信小程序
   ├─ app.js / app.json / app.wxss
   ├─ project.config.json / sitemap.json
   ├─ pages/ohms-law/...
   ├─ styles/...
   ├─ package.json
   └─ tests/...
```

可复制根模板作为 demo 的起点，重命名页面并按实验需求改写。不要把 Git 仓库自己的 `.git/`、仓库级 `.github/`、根 `CONTRIBUTING.md` 或整套开发文档嵌套复制到 demo 中。微信开发者工具打开 `demo/`，VS Code 打开仓库根目录。

若只贡献页面模块，放在实验目录下并说明注册路径、依赖和启动方式，由维护者判断是否需要独立 demo。

## 审核与合并

- 所有正式更新通过功能分支和 PR 进入 `main`；不要直接在主分支提交或推送。
- 每个 PR 需要 `LingY-Ciallo` 或 `LaZYKING233` 任意一位维护者点击 **Approve**，普通评论不等于批准。
- 新增代码后旧批准会失效，需要重新审核。合并前需要解决讨论并通过 `Template tests`。
- `CODEOWNERS` 覆盖全部文件，主分支要求至少一次有效批准且必须通过 Code Owner 审核，确保审批来自两位维护者之一。
- GitHub 不允许作者批准自己的 PR：`LingY-Ciallo` 发起的 PR 由 `LaZYKING233` 审批，反之亦然；其他贡献者发起的 PR 由两人任选一人审。不通过临时绕过规则来合并。
- 贡献者 Fork 后自行开分支，不需要申请仓库写权限。不要在 PR 中提交 Key、Token、账号、校园会话或个人测试记录。

## 提交前核对

提供实验公式来源和至少一组已知答案，明确每个输入/输出的单位与精度。验证空值、零分母和边界；检查浅色、深色、莫奈、小音、窄屏和平板。微信编译、真机检查与浏览器预览要如实区分。

根目录运行 `npm test`。如果新增独立 demo，请同步提供它的测试、运行命令，并在仓库 CI 中增加对应步骤；现有根测试不会自动覆盖任意新增 demo。

使用 PR 模板说明实验名称、验算、主题检查和接入路径。后续反馈继续提交到原 PR 分支，原 PR 会自动更新。
