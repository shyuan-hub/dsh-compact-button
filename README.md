# dsh-compact-button

在 DSH Web 的对话界面里给「压缩上下文」一个一键入口：点击即向当前会话提交 `/compact`，把较早的对话历史压缩成摘要，为后续对话腾出上下文空间。

English: A one-click **Compact context** button for the DSH Web conversation UI. One click submits `/compact` to the current session, summarizing older history to free up context space.

## 效果 / Preview

![dsh-compact-button 在上下文计量面板中的效果](doc/assets/screenshot.png)

上图：DSH Web 中，输入框（composer）旁的上下文圆环展开后就是「上下文计量面板」，本插件在其中放了一个「压缩上下文」按钮。

## 解决什么问题 / Why

长对话会不断吃掉上下文窗口。以前想压缩，得手动在输入框敲 `/compact`。现在按钮就放在你随时能看到的上下文面板上——一眼看到上下文快满了，点一下即可。

- 不用记斜杠命令，也不用离开面板；
- 和手敲 `/compact` 走的是**同一条命令通道**，压缩结果照常以命令行形式出现在对话流里；
- 跟随 DSH 的语言设置，中文 / 英文实时切换。

## 按钮怎么用 / Using the button

按钮位于上下文计量面板（composer 旁的上下文圆环，点击展开）里，文案会随点击状态变化：

| 状态 | 中文 | English | 含义 |
| --- | --- | --- | --- |
| 待命 | 压缩上下文 | Compact context | 可点击，点击即提交 `/compact` |
| 提交中 | 压缩中… | Compacting… | 正在向会话提交命令 |
| 已提交 | 已提交压缩 | Compaction submitted | 命令已被接纳，压缩结果见对话流 |
| 未匹配 | 命令未匹配 | Command not matched | 当前 composer 没有可提交命令的会话 |
| 失败 | 提交失败 | Submission failed | 提交命令时出错 |

状态会在 4 秒后自动回到「待命」，面板保持清爽。

## 安装 / Install

```bash
# 1. 构建并打包
cd DSH-compact-button
pnpm install
pnpm build
pnpm pack            # 生成 dsh-compact-button-0.1.0.tgz

# 2. 装入 web profile（与 dsh-better-sidebar 相同的 file: 通道）
cd ~/.dsh/profiles/web
pnpm add "dsh-compact-button=file:/Users/shuai/parttime/DSH-compact-button/dsh-compact-button-0.1.0.tgz"
```

然后在 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 数组里追加 `"dsh-compact-button"`，重启 `dsh web` 即可。

> **依赖平台补丁**：上下文计量面板必须声明 `conversation.context.actions` 子槽位（本仓库随附的平台补丁已应用）。若该槽位不存在，按钮不会渲染，插件其余部分不受影响。

## 工作原理（面向开发者） / How it works

- **平台扩展点**：`@deepseek-ai/dsh-client-ui-conversation` 的 ContextMeter 面板声明子槽位 `conversation.context.actions`（`conversation.composer.bar` 的 children，kind: list，scope: session-maybe）。
- **client 半边**：通过 `slots.inject` 等待平台声明后，把 `CompactButton` 注册进该槽位；点击调用 `session.command('/compact')`——与手敲 `/compact` 完全同一条通道（接纳语义由 Host 的 command-compact 插件拥有，压缩结果以命令行形式出现在对话流中）。
- **Host 半边**：空 `apply`，无宿主行为。
- **i18n**：字典注册在 `compactButton` 命名空间（zh/en），跟随 DSH 语言设置实时切换。

### 构建产物 / Artifacts

| 文件 | 通道 |
| --- | --- |
| `lib/index.js` | Host 半边（空 apply，无宿主行为） |
| `lib/client.js` | 官方 profile 通道（bundle id = 包名 `dsh-compact-button`） |
| `lib/client-registry.js` | 插件注册表通道（bundle id = manifest id `dsh-external/dsh-compact-button`） |
