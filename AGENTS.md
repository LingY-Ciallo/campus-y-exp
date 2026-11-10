# 实验模板维护约定

- 这是独立的微信小程序实验模板仓库 `https://github.com/LingY-Ciallo/campus-y-exp`，不是校园小音主项目。
- 模板参考校园小音个人中心显示版本 v4.3.3 - “Yutori Natsu”，不自动递增主项目版本。
- 用户于 2026-11-06 授权首次上传及配置主分支保护；此前“暂不推送”的要求已由本次授权替代。初始化完成后后续更新必须走功能分支和 PR，不直接推送 main、不临时关闭规则或添加绕过。
- 用户于 2026-11-06 将审核要求改为 LingY-Ciallo 或 LaZYKING233 任意一人批准，替代此前的两人同时批准。
- 主分支规则集 `Must PR`（ID 26662855）匹配 main 与默认分支：一次有效批准、Code Owner 审核、新提交清除旧批准、最近推送由他人批准、讨论解决、Template tests 通过、禁止删除与强推，bypass_actors 保持空。不为无法归属作者的自动 PR 另加一次批准。
- 全文件 CODEOWNERS 为 LingY-Ciallo 和 LaZYKING233；其中任意一位的有效批准可满足审核要求。保留 Code Owner 强制审核，不仅依靠审批次数限制用户。
- GitHub 作者不能自批：LingY-Ciallo 发起的 PR 由 LaZYKING233 审，反之亦然；其他贡献者发起的 PR 由两人任选一人审。不自动设置作者豁免。协作者须接受邀请才能有效审批。
- 新实验放在 experiments/<slug>/，遵循 CONTRIBUTING.md。CI 默认只读、官方 Action 固定 SHA，不使用高权限事件执行外部 PR 代码。
- 适配任何实验前，必须人工或用 AI 对照本仓库与校园小音主仓库的实验编号、名称、别名和测量方法；跳过重复实验，改进已有实验时针对原页面提交。主仓库导入前再次查重。
- 默认以 PR 作者 GitHub 用户名作为贡献署名。指定显示名或更改已有署名必须在 PR 说明中给出准确展示文本。
- 原生 JavaScript / WXML / WXSS，无后端或供应商 Key，不引入 npm 运行依赖。
- 保留 `appearanceTheme` / `appearanceAccent` 绑定及 `--theme-*` / `--accent*` 变量；适配 light、dark、monet、xiaoyin。
- 演示 App 和主题色板仅供独立项目；接回主项目时沿用其主题注入与权益系统，不覆盖 App 或全局主题。
- 实验计算放在页面目录的 `calculator.js`。换实验时同步表单、结果、公式说明、复制内容、示例数据、README 与测试。
- 中文文件按 UTF-8 读写。运行 `npm test`；微信编译/真机验证与浏览器布局检查应分别记录。
