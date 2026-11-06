# GitHub 新手指南：把你的实验页面贡献出去

目标仓库：[LingY-Ciallo/campus-y-exp](https://github.com/LingY-Ciallo/campus-y-exp)。建议先用 **VS Code 自带的源代码管理**，熟悉以后再使用命令行。VS Code 调用电脑上的 Git，需要先安装 Git。

## 1. 先认识几个词

| 名词 | 可以怎样理解 |
| --- | --- |
| Git | 电脑上记录代码版本的工具 |
| GitHub | 托管仓库、讨论和审核代码的平台 |
| Repository / 仓库 | 项目文件及其历史记录 |
| Fork | 在 GitHub 上复制一份别人的仓库到自己账号 |
| Clone / 克隆 | 将仓库及历史下载到电脑，保留与远程的关联 |
| Branch / 分支 | 独立开发线；为每个实验单独建一条 |
| Stage / 暂存 | 选择哪些改动放进下一次提交 |
| Commit / 提交 | 在本机记录一次改动，附上说明 |
| Push / 推送 | 把本机提交上传到远程分支 |
| Fetch / 获取 | 下载远程更新信息，不直接合并进当前代码 |
| Pull / 拉取 | 获取更新并合入当前分支 |
| Pull Request / PR | 向原仓库提出“请审核并合入我的改动” |
| origin / upstream | 通常分别指自己的 Fork 和原仓库的远程别名 |

保存文件、Commit、Push、创建 PR 是四件不同的事。只点保存没有提交；只 Commit 没有上传；只 Push 到自己的 Fork 还没有向原仓库提交 PR。

## 2. 准备工具

1. 注册或登录 [GitHub](https://github.com/)。
2. 安装 [Git](https://git-scm.com/downloads) 和 [VS Code](https://code.visualstudio.com/)。Windows 安装 Git 时一般使用默认选项即可。
3. 安装后重新打开 VS Code。通过“终端 → 新建终端”运行 `git --version`，能显示版本说明 Git 可用。
4. 第一次提交前设置提交者信息，下面两项需要换成你自己的内容：

   ```powershell
   git config --global user.name "你的显示名称"
   git config --global user.email "你的提交邮箱"
   ```

   邮箱可使用 GitHub“Settings → Emails”里提供的 `noreply` 邮箱。`--global` 会影响这台电脑上所有仓库；只想对当前仓库设置时，进入该仓库后去掉 `--global`。

5. VS Code 推送时按提示通过浏览器登录 GitHub。GitHub 的 Git HTTPS 操作不能直接使用账号密码；通常交给 VS Code / Git Credential Manager 登录即可，不必把令牌写进源码或远程 URL。

## 3. 推荐：用 VS Code 完成第一次贡献

### 第一步：Fork 原仓库

打开 [campus-y-exp](https://github.com/LingY-Ciallo/campus-y-exp)，点右上角 **Fork → Create fork**，得到 `你的用户名/campus-y-exp`。

如果没有 Fork 按钮或提示无权限，需要先确认能访问原仓库，或请维护者说明贡献方式。本文默认你没有原仓库直接写入权限，采用 Fork 流程。

### 第二步：克隆自己的 Fork

1. 在**自己 Fork 的仓库**点 **Code → HTTPS**，复制地址。
2. 在 VS Code 按 `Ctrl+Shift+P`，输入 **Git: Clone / Git: 克隆**。
3. 粘贴自己的 Fork 地址，选择保存位置，再点“打开”。
4. 确认 VS Code 打开的是克隆出来的仓库根目录。左侧源代码管理图标快捷键为 `Ctrl+Shift+G`。

下载 ZIP 可以运行代码，但 ZIP 不含 Git 历史和远程关联，不适合直接接着做这套贡献流程。

### 第三步：新建开发分支

点击 VS Code 左下角的当前分支名，选 **Create new branch / 创建新分支**，例如：

```text
feat/ohms-law-experiment
```

普通贡献者可以使用这个分支名；如果由 Codex 创建分支，则可以使用 `codex/ohms-law-experiment`。一条分支只处理一个实验，后续修改和 PR 反馈都放在这条分支。

### 第四步：把实验文件放进仓库

先读目标仓库最新的 README、[CONTRIBUTING](../CONTRIBUTING.md) 和目录结构，按已有约定放置代码。当前仓库根目录为通用模板，新实验放入 `experiments/<英文短横线名称>/`，不要覆盖根模板。

当前新增实验采用以下结构：

```text
experiments/ohms-law/
├─ README.md                 实验说明、公式来源、输入输出与验算
└─ demo/                     可在微信开发者工具导入的独立项目
   ├─ app.js / app.json / app.wxss
   ├─ project.config.json
   ├─ sitemap.json
   ├─ pages/ohms-law/...
   ├─ styles/...
   └─ tests/...
```

不要把自己测试工程的 `app.json`、`project.config.json` 或模板根 README 直接覆盖到仓库根目录。若只贡献页面模块，提交页面及必要依赖、实验说明和测试，并说明接入路径，由维护者审核。

微信开发者工具打开实验 `demo/` 目录，VS Code 打开 Git 仓库根目录，两者可以同时编辑同一批源码。

### 第五步：请 AI 改写并核对

使用 [主 README 的提示词](../README.md#3-怎样把需求告诉-ai)，提供实验参数、公式和目标结果。AI 完成后：

- 编译，检查启动页面和导航标题。
- 使用指导书或手算结果核对至少一组正常数据。
- 检查空白、零、负数、非法输入、极大值及实验限定范围。
- 切换浅色、深色、莫奈、小音主题，检查输入、按钮、错误和结果；检查窄屏和平板。
- 在相应示例目录运行测试；更新实验说明及必要截图。

### 第六步：查看差异并 Commit

1. 按 `Ctrl+Shift+G` 打开“源代码管理”。
2. 逐个点文件查看差异，确认只有本次实验需要的改动。
3. 在需要提交的文件旁点 **+**，将其暂存。不确定的文件先打开看内容，不必把所有改动一起暂存。
4. 提交说明填写如 `feat: 新增欧姆定律实验计算页面`，再点 **Commit / 提交**。

示例不需要提交 `node_modules`、`project.private.config.json`、账号信息或个人测试数据。模板已提供基本 `.gitignore`，复制页面到已有仓库时需要检查该仓库自己的忽略规则。

### 第七步：Push 到自己的 Fork

新分支第一次使用 **Publish Branch / 发布分支**；后续使用 **Push / 推送**。这里是把分支上传到已有 Fork，不是选择“Publish to GitHub”再建一个无关的新仓库。

如果提示选择远程，选择自己的 `origin`。可在终端运行 `git remote -v` 确认地址是否为自己的 Fork。`Sync Changes / 同步更改` 可能同时拉取和推送，第一次建议先分别理解 Pull 和 Push。

### 第八步：向原仓库创建 PR

1. 打开 GitHub 上自己的 Fork，通常会看到 **Compare & pull request**；也可以在原仓库 **Pull requests → New pull request → compare across forks**。
2. 确认目标是原仓库 `LingY-Ciallo/campus-y-exp` 的默认分支；来源是自己 Fork 中的实验分支。默认分支若不是 `main`，以页面显示为准。
3. 标题写清实验名称；描述写明功能、公式来源、输入输出、验算数据及主题检查情况，可参考 [PR 描述模板](../.github/PULL_REQUEST_TEMPLATE.md)。
4. 在 **Files changed** 里最后核对文件，确认没有覆盖仓库其他页面。再点 **Create pull request**。

PR 是发起审核，是否合并由维护者决定。如果维护者提出修改，回到**同一分支**继续改、Commit、Push，原 PR 会自动更新，不用每次新开 PR。

本仓库要求 `LingY-Ciallo` 或 `LaZYKING233` 任意一人批准，且 CI 通过、讨论解决；追加提交后需重新审批。不能直接向 main 推送，管理员也没有规则集绕过名单。GitHub 作者不能审批自己的 PR，所以你发起的 PR 由另一位维护者审，其他人发起的由两位任选一人审。完整边界见 [安全说明](../SECURITY.md)。

## 4. 命令行版本（可与 VS Code 混用）

以下示例将 `main` 作为原仓库默认分支；若不同，请替换。先在 GitHub 完成 Fork，把 `YOUR_USERNAME` 替换成你自己的用户名。实验目录和分支名也按实际情况替换。

```powershell
# 克隆自己的 Fork，然后进入仓库
git clone https://github.com/YOUR_USERNAME/campus-y-exp.git
cd campus-y-exp

# 看当前分支、改动与远程地址
git status
git remote -v

# 添加原仓库，方便以后获取维护者更新（只需一次）
git remote add upstream https://github.com/LingY-Ciallo/campus-y-exp.git
git fetch upstream

# 从原仓库当前默认分支创建实验分支
git switch -c feat/ohms-law-experiment upstream/main

# 此时在 VS Code / AI 中新增、修改并测试实验页面
git status
git diff

# 下列路径是建议结构，请替换成仓库中实际新增的实验目录
git add experiments/ohms-law/
git diff --cached
git commit -m "feat: add Ohm's law experiment page"

# 仅推送到自己的 Fork，-u 设置以后推送的默认目标
git push -u origin feat/ohms-law-experiment
```

完成后在 GitHub 创建 PR，操作同上。若 `upstream` 已存在，先用 `git remote -v` 确认它指向原仓库，无需重复添加。

`git diff` 只展示未暂存的已跟踪文件差异；新文件要先暂存，再用 `git diff --cached` 检查。`git status` 可以看到未跟踪文件。

## 5. 保持自己的分支与原仓库同步

开始新的实验前，先保存或提交现有工作，再执行：

```powershell
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
git switch -c feat/another-experiment
```

如果 `--ff-only` 失败，说明你的 main 与原仓库历史分叉了，应先查看差异，不要照着教程执行 `reset --hard` 或强推来“修复”。

已有 PR 需要合入上游新改动时，在自己的实验分支执行：

```powershell
git switch feat/ohms-law-experiment
git fetch upstream
git merge upstream/main
```

若产生冲突，VS Code 会标出冲突文件。使用合并编辑器逐段核对两个版本，保留正确代码，移除冲突标记后重新测试，再暂存、Commit、Push。只在你确实理解含义时使用“全部接受当前”或“全部接受传入”。

如果暂时无法处理本次合并冲突，且合并前工作区干净，可以使用 `git merge --abort` 返回合并前状态，再请维护者帮助。不要用删除整个文件或强制推送来消除提示。

## 6. 常见问题

| 问题 | 处理方法 |
| --- | --- |
| VS Code 找不到 Git | 安装 Git 后重启 VS Code，运行 `git --version` |
| 提示不是 Git 仓库 | 打开 Clone 出来的目录；不要在解压模板或其他目录直接 Push |
| 提示没有用户名或邮箱 | 设置 `git config user.name` / `user.email` |
| Push 显示权限不足 | 检查 origin 是否为自己的 Fork，并重新确认 GitHub 登录账号 |
| GitHub 不接受账号密码 | 按 VS Code / Git Credential Manager 浏览器流程登录 |
| Publish Branch 与 Publish to GitHub 怎么选 | 已经克隆 Fork 时用 Publish Branch，不要另建无关仓库 |
| “Everything up-to-date” 但网页没变化 | 确认已 Commit、正在正确分支，并在 GitHub 切换到对应分支查看 |
| PR 提示没有差异 | 检查改动是否推送，以及 base / compare 分支方向 |
| Commit 选错文件但还没提交 | 用 `git restore --staged 文件路径` 取消暂存，文件改动仍保留 |
| AI 写错了但还没提交 | 先看差异；VS Code 的 Discard Changes 会丢弃改动，不要随手全选丢弃 |
| 提交之后还要改 | 在同一分支继续修改、Commit、Push，PR 自动更新 |
| 克隆/推送失败 | 检查网络、GitHub 登录和 Git 代理配置，保留报错再排查 |

## 7. PR 描述可以这样写

```markdown
## 新增实验
欧姆定律测量与电阻计算。

## 输入与输出
输入电压 U（V）和电流 I（mA）；内部先换算为 A。
输出每组 R（Ω）和平均电阻。

## 公式与来源
R = U / I；指导书名称、版本、章节或页码：……
本次是否包含拟合、不确定度及其假设：……

## 验算
U = 2 V、I = 10 mA，预期 R = 200 Ω，实际：……
其他例题或边界数据：……

## 主题与设备
填写实际检查过的主题、宽度、基础库和设备；附截图。
未检查项明确写“未检查”，不要把浏览器预览写成真机验证。

## 接入
页面路径、需要复制的依赖、入口注册方式：……
```

## 官方资料

- [VS Code 源代码管理](https://code.visualstudio.com/docs/sourcecontrol/overview)
- [VS Code 仓库与远程操作](https://code.visualstudio.com/docs/sourcecontrol/repos-remotes)
- [VS Code 与 GitHub](https://code.visualstudio.com/docs/sourcecontrol/github)
- [GitHub：从 Fork 创建 PR](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork)

本指南于 2026-11-06 编写，按钮名称以你的界面语言与版本为准。
