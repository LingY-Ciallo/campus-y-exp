# 安全与主分支管理

## 主分支规则

`main` 和默认分支由仓库规则集 **Must PR** 保护：

- 通过 PR 更新；不允许直接修改、强制推送或删除主分支。
- 至少两名具有写入权限的审核者批准，并要求 Code Owner 审核。
- 新提交使旧批准失效，最近一次推送需其他人批准，所有审核讨论需解决。
- `Template tests` 必须通过，并以最新目标分支进行检查。
- 规则集不设置绕过人员、角色、App 或部署密钥，管理员的普通代码推送同样受规则约束。

首次初始化在空仓库建立主分支和模板，随后绑定上述保护。后续更改全部走 PR。

## 指定审核者如何实现

全部文件的 CODEOWNERS 为 `@LingY-Ciallo @LaZYKING233`。仓库只向这两位维护者授予写入或管理员权限，其他贡献者通过 Fork 贡献；配合“两次有效批准”要求，实现两位指定维护者都审核。

**维护此权限边界是规则的一部分：** GitHub 的 CODEOWNERS 对同一规则中的多个用户采用任选一人批准的语义，本身不是“两人都必须批准”。个人仓库的两次审批计数也不会永久绑定用户名；以后如果增加第三位写入者，两次批准就可能由其他写入者满足。增加权限前必须重新设计审批规则，不能直接增加协作者后仍宣称固定双人审批。

`LaZYKING233` 接受协作者邀请后才能获得有效写入权限并作为 Code Owner 审核。等待接受期间，双人门槛仍保留，PR 会被阻止合并。

GitHub 禁止 PR 作者审批自己的 PR。严格双人规则下，两位维护者本人发起的 PR 也会被阻止，不设置作者豁免。Dependabot 等自动 PR 同样走审批；没有代替任何用户自动批准的工作流。

仓库所有者仍有管理仓库设置的能力，能够编辑规则；“没有代码推送绕过”不代表平台收回所有者的设置权限。

## GitHub Actions 与依赖

- CI 使用普通 `pull_request` 事件，不使用有高权限的 `pull_request_target` 执行外部 PR 代码。
- 工作流默认 `contents: read`，Checkout 不保留凭据，不注入供应商 Key 或仓库 Secret。
- 使用官方 GitHub Actions 并固定到完整提交 SHA；Dependabot 每月检查 Actions 更新，更新也需要正常 PR 审核。
- 根测试验证通用模板。新增实验必须补上它自己的验算与测试，不能只凭根测试通过就认为公式正确。
- 保持 GitHub Secret scanning 与 Push protection 开启；发现凭据泄露时立即撤销和更换，单纯删文件不能撤销已经泄露的凭据。

## 报告问题

一般功能问题可提交 Issue。若涉及凭据、隐私或可利用漏洞，请优先使用仓库 **Security → Advisories → Report a vulnerability** 的私密报告入口；不要把真实 Token、校园账号或会话发到公开 Issue / PR。

## 维护者检查入口

- [分支规则](https://github.com/LingY-Ciallo/campus-y-exp/settings/rules)
- [协作者权限](https://github.com/LingY-Ciallo/campus-y-exp/settings/access)
- [Actions 设置](https://github.com/LingY-Ciallo/campus-y-exp/settings/actions)
- [安全分析设置](https://github.com/LingY-Ciallo/campus-y-exp/settings/security_analysis)

GitHub 官方说明：[保护分支与审核权限](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)、[作者不能审批自己的 PR](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews)。
