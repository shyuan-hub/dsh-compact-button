# dsh-compact-button

[**简体中文**](./README.md) | [English](./README.en.md)

<!-- Hero -->
<div align="center">
  <b style="font-size: 1.15em;">上下文快满了？点一下，把早期对话压缩成摘要</b><br /><br />
  <a href="https://www.npmjs.com/package/dsh-compact-button"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-compact-button" /></a>
  <a href="https://github.com/shyuan-hub/dsh-compact-button/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/shyuan-hub/dsh-compact-button" /></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <a href="https://www.npmjs.com/package/@deepseek-ai/dsh?activeTab=versions"><img alt="零补丁 · 官方槽位" src="https://img.shields.io/badge/DSH-zero--patch-4d6bfe" /></a><br /><br />
  <img alt="一键压缩上下文" src="https://img.shields.io/badge/-一键压缩上下文-4d6bfe" /> <img alt="一键新建会话" src="https://img.shields.io/badge/-一键新建会话-4d6bfe" /> <img alt="与 /compact 同通道" src="https://img.shields.io/badge/-%E4%B8%8E%20%2Fcompact%20同通道-4d6bfe" /> <img alt="中英文实时切换" src="https://img.shields.io/badge/-中英文实时切换-4d6bfe" /> <img alt="不修改平台文件" src="https://img.shields.io/badge/-不修改平台文件-3aa76d" /><br /><br />
  在输入框（composer）下方的官方 dock 行里加两个<b>图标按钮</b>，紧挨着上下文圆环：<br />
  「压缩上下文」点击即向当前会话提交 <code>/compact</code>，把较早的对话历史压缩成摘要；<br />
  「新建会话」点击即在<b>同一 workspace</b> 中开启一个新会话。<br />
</div>

<div align="center">
  <img alt="dsh-compact-button 在 composer dock 中的效果" src="https://raw.githubusercontent.com/shyuan-hub/dsh-compact-button/HEAD/doc/assets/screenshot.png" />
  <br />
  <i>输入框下方的 dock 行，两个图标紧挨着上下文圆环</i>
  <br /><br />
  <img alt="dsh-compact-button 动态演示：一键压缩上下文与新建会话" src="https://raw.githubusercontent.com/shyuan-hub/dsh-compact-button/HEAD/doc/assets/screencap.gif" />
  <br />
  <i>动态演示</i>
</div>

## 📑 目录

- [✨ 功能一览](#-功能一览)
- [🚀 安装](#-安装)
- [🖥️ Desktop 桌面版](#️-desktop-桌面版)
- [🖱️ 按钮怎么用](#️-按钮怎么用)
- [🔧 工作原理](#-工作原理)
- [🛠️ 开发与构建](#️-开发与构建)
- [⚠️ 已知限制](#️-已知限制)

## ✨ 功能一览

- **🔘 一键压缩**：长对话不断吃掉上下文窗口，以前得手动敲 `/compact`——现在图标就放在输入框下方随手可及的位置，点一下即可
- **🔁 同一条命令通道**：和手敲 `/compact` 走的是**完全相同的通道**（`session.command('/compact')`），压缩结果照常以命令行形式出现在对话流里，无特殊行为
- **🎯 图标式 + 悬停提示**：按钮只有图标，观感与上下文圆环一致；悬停 200ms 弹出平台原生 Tooltip 说明用途，点击后 Tooltip 会改报本次提交的结果
- **🎨 图标颜色承载状态**：提交中呼吸闪烁、已提交转业务蓝、失败转错误红——不用文字也一眼可辨，4 秒后自动复位
- **🌏 多语言**：跟随 DSH 的语言设置，中文 / 英文实时切换
- **🆕 新建会话**：点击即在**同一 workspace** 中开启一个新会话并跳转过去；agent 预设与权限设置沿用部署默认（与当前会话一致的前提见「已知限制」）
- **🪶 零补丁、零侵入**：注册在平台**官方声明并渲染**的 `conversation.composer.dock` 槽位上，**不修改任何平台文件**——既不改 npm 里的平台 bundle，也不改桌面版的 `app.asar`

## 🚀 安装

**前置**：已装好 DSH（`dsh web` 能正常运行），Node.js ≥ 20、pnpm ≥ 10。

**方式一：从 npm 安装（推荐）**

```sh
dsh plugin --profile web add dsh-compact-button@latest
```

<details>
<summary><b>方式二：从源码安装（调试本地改动时使用）</b></summary>

```sh
# 1. 构建并打包
git clone https://github.com/shyuan-hub/dsh-compact-button.git && cd dsh-compact-button
pnpm install && pnpm build
pnpm pack                                # 生成 dsh-compact-button-<版本号>.tgz

# 2. 通过 dsh plugin 一键安装（file: 通道）
dsh plugin --profile web add "file:<你的本地目录>/dsh-compact-button-<版本号>.tgz"
```

</details>

装完**重启 `dsh web`**，再硬刷新浏览器（Cmd/Ctrl+Shift+R）即可生效。

> ✅ 无需手动编辑 profile 的 `package.json`：本包声明了 `dsh.bundle.patch`，`dsh plugin add` 安装后会自动把它追加进 `dsh.profile.bundles`。
>
> 🔧 调试本地改动时，可改用 link 通道：`dsh plugin --profile web add "link:<克隆目录绝对路径>"`，之后每次 `pnpm build` + 重启 `dsh web` 即可生效。
>
> 🔄 更新：`dsh plugin --profile web add dsh-compact-button@latest`，然后重启 `dsh web` 并硬刷新。

> 📦 插件自带 bundle patch（[`cordis.patch.yml`](./cordis.patch.yml)）：装入 profile 后，启动时会由它自动插入本插件的挂载条目，无需手动编辑 profile 的 `cordis.patch.yml`；若聚合包已挂载本插件，该条目会自动退让，避免重复挂载。这里的 patch 只是 **cordis 的 bundle 挂载声明层**，不涉及任何对平台代码的改写。

<details>
<summary><b>常见问题</b></summary>

| 现象 | 原因与解决 |
|---|---|
| 面板里**看不到图标** | 确认 profile 的 `dsh.profile.bundles` 里有 `dsh-compact-button`，且已重启 `dsh web`。图标注册在 `conversation.composer.dock`，该槽位由平台自己声明与渲染，正常情况下必然存在。 |
| 点击后 Tooltip 显示「命令未匹配」 | 当前 composer 没有可提交命令的会话。切换到有活跃会话的页面再试。 |
| 安装 / 改动后没生效 | 本插件需要**重启 `dsh web`** 才能生效（仅硬刷新浏览器不够），重启后再硬刷新页面。 |

</details>

## 🖥️ Desktop 桌面版

桌面版和 web 版**走完全相同的路径**——把插件装进 desktop profile 即可，**不需要碰 `app.asar`**。

```sh
# 桌面版 profile 由桌面 app 独占管理，插件条目随 profile 生效
# 完全退出 DeepSeek Harness → 重新启动
```

> ⚠️ `dsh` CLI 不能管理 desktop profile（会报 `profile "desktop" is managed exclusively by the Electron application`）。桌面版的插件安装/卸载由桌面 app 自己的插件管理界面负责。

因为图标注册在平台官方槽位上，桌面版把平台 bundle 打进 `resources/app.asar` 这件事**不再构成障碍**：插件代码从 profile 读取，槽位由归档内的平台代码自己渲染，双方都不需要被修改。

> 🔄 **桌面版自更新后无需任何额外操作**。更新只替换 `app.asar`，而 `app.asar` 本来就没被动过；profile 里的插件也不受更新影响。

## 🖱️ 按钮怎么用

输入框下方的 dock 行里有**两个图标**，并排在上下文圆环左侧：左「压缩上下文」、右「新建会话」。图标本身不带文字，用途与状态由 **Tooltip + 图标颜色** 共同承载。

### 压缩上下文（左侧图标）

| 状态 | Tooltip（中 / EN） | 图标表现 |
| --- | --- | --- |
| 待命 | 压缩上下文 / Compact context | 常态（与圆环同色的三级标签色） |
| 提交中 | 压缩中… / Compacting… | 呼吸闪烁（1s 循环），按钮禁用防重复提交 |
| 已提交 | 已提交压缩 / Compaction submitted | 业务蓝 |
| 未匹配 | 命令未匹配 / Command not matched | 常态 |
| 失败 | 提交失败 / Submission failed | 错误红 |

状态会在 4 秒后自动回到「待命」。任何时候悬停都能看到上一次点击的结果。

### 新建会话（右侧图标）

点击即在**当前会话所在的 workspace** 中开启一个新会话并跳转过去（`uiWorkspace.startSession()`）。点击后会短暂锁定约 1.5 秒，防止误连点。新会话沿用部署默认的 agent 预设与权限设置——若当前会话用的是非默认预设，新会话不会自动沿用（见「已知限制」）。

## 🔧 工作原理

- **平台扩展点**：`@deepseek-ai/dsh-client-ui-conversation` 自己声明并渲染 `conversation.composer.dock`——一个 `list` 型官方槽位，位于 composer 下方与 `ContextMeter` 圆环同一行的居中 flex 容器（`justify-content:center`、`gap:12px`）。官方 `dsh-client-ui-chat` 的 `stats` 药丸就注册在这里。
- **client 半边**：通过 `slots.inject` 等待槽位声明后，把一个并排容器（`ContextActionRow`）以 `order: 1` 注册进去，排在官方 `stats`（`order: 0`）之后。容器内左为 `CompactButton`、右为 `NewSessionButton`：
  - `CompactButton` 点击调用 `session.command('/compact')`——与手敲 `/compact` 完全同一条通道（接纳语义由 Host 的 command-compact 插件拥有，压缩结果以命令行形式出现在对话流中）。
  - `NewSessionButton` 点击调用 `uiWorkspace.startSession()`——在当前会话所在 workspace 中开启新会话并跳转；点击后约 1.5 秒内锁定防止误连点。
  - 两个图标都用平台的 `Tooltip` primitive（`side="top"`、`delayMs={200}`），与上下文圆环的触发器行为一致。
- **Host 半边**：**惰性**。`apply()` 是空实现，只在 `cordis.patch.yml` 把本模块挂上 Node 树时被调用一次。功能完全在 client 侧，Node 侧无事可做。
- **i18n**：字典注册在 `compactButton` 命名空间（zh/en），跟随 DSH 语言设置实时切换。

### 构建产物 / Artifacts

| 文件 | 通道 |
| --- | --- |
| `lib/index.js` | Host 半边（惰性 `apply()`，维持 bundle 挂载契约） |
| `lib/client.js` | 官方 profile 通道（bundle id = 包名 `dsh-compact-button`） |
| `lib/client-registry.js` | 插件注册表通道（bundle id = manifest id `dsh-external/dsh-compact-button`） |

## 🛠️ 开发与构建

```sh
pnpm install
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm build        # rm -rf lib && tsdown → lib/index.js + lib/client.js + lib/client-registry.js
pnpm watch        # tsdown --watch
```

**架构**：单 npm 包、host/client 双半结构——host（`src/index.ts`）为惰性空 `apply`；client（`src/client/index.tsx`）把 `ContextActionRow` 注册进官方 dock 槽位并处理状态流转与 i18n。插件按 DSH 官方规范组织（无 default 导出、双 client bundle），运行期不依赖 npm / checkout。

### 版本兼容策略（为何不需要跟着 DSH 发版改代码）

1. **不声明 DSH peer 依赖**。插件运行期不 `import` 任何平台包的值——client bundle 只 `require("react")`、`require("react/jsx-runtime")` 和 `require("@deepseek-ai/dsh-client-ui-primitives")`（三者都是平台 module table 里的 external，见 `tsdown.config.ts` 的 `CLIENT_EXTERNALS`），服务全靠 cordis 注入。因此 `package.json` 里没有 `@deepseek-ai/dsh-*` 的 peer/dev 版本锁——包管理器也不会为了满足一个范围而拉出第二份 renderer（slot registry 双实例会直接破坏槽位注册）。
2. **`@deepseek-ai/dsh-client-ui-primitives` 用本地 ambient 声明代替依赖**。该包在 registry 上的发布版本与实际安装版本不同步，加 devDependency 会引入一个装不出来的版本范围；`src/client/primitives.d.ts` 照抄真实 `Tooltip.d.ts` 的签名，既拿到类型又不引入依赖。若真实签名将来变了，多出来的 prop 只是被忽略。
3. **兼容性由官方槽位决定，而不是由补丁锚点决定**。`conversation.composer.dock` 是平台自己声明、自己渲染的公开扩展点，插件不依赖 `ContextMeter` 的内部结构，也不需要容忍构建产物格式漂移。只要这个槽位还在，插件就照常工作。
4. **降级行为温和**。万一槽位被移除，`slots.inject` 等不到声明，结果只是「图标不渲染」，不会抛错、不会影响平台其余部分。

## ⚠️ 已知限制

- 依赖官方槽位 `conversation.composer.dock`：由平台声明与渲染。若上游把这个槽位移除或改语义，图标会停止渲染（`slots.inject` 等不到声明，静默降级）
- dock 行是居中 flex 容器，已有官方 `stats` 药丸占用 `order: 0`；本插件用 `order: 1` 排在其后。若将来有更多占用者，视觉顺序可能需要再调
- 压缩按钮只负责提交 `/compact`，压缩的接纳与执行语义由 Host 侧 command-compact 插件拥有
- 状态提示 4 秒后自动复位，不提供压缩进度展示
- 新建会话按钮在同一 workspace 中开启新会话，但**沿用部署默认的 agent 预设与权限设置**；若当前会话用的是非默认预设，新会话不会自动沿用（client 侧 `uiWorkspace.startSession` 不暴露预设/权限选择）

---

<div align="center">
  <sub>MIT License · Built for the <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> ecosystem</sub>
</div>
