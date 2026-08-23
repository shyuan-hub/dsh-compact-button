# dsh-compact-button

在 DSH Web 的**对话上下文计量面板**（composer 旁的上下文圆环，点击展开的 ContextMeter 面板）中增加一个**压缩上下文**按钮：点击即向当前会话提交 `/compact`，将较早的对话历史压缩为摘要。

English: Adds a one-click **Compact context** button to the conversation context meter panel. Clicking it submits `/compact` to the session, summarizing older history.

## 工作原理 / How it works

- **平台扩展点**：`@deepseek-ai/dsh-client-ui-conversation` 的 ContextMeter 面板声明了子槽位 `conversation.context.actions`（`conversation.composer.bar` 的 children，kind: list，scope: session-maybe）。
- **本插件（client 半边）**：通过 `slots.inject` 等待声明后，把 `CompactButton` 注册进该槽位。按钮点击调用 `session.command('/compact')` —— 与在输入框手敲 `/compact` 完全同一条命令通道（接纳语义由 Host 的 command-compact 插件拥有；压缩结果以命令行的形式出现在对话流中）。
- **按钮状态**：idle → pending（提交中）→ submitted / rejected / failed，4 秒后回到 idle。
- **i18n**：字典注册在 `compactButton` 命名空间（zh/en），跟随 DSH 语言设置实时切换。

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

然后在 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 数组中追加 `"dsh-compact-button"`，重启 `dsh web` 即可。

> 依赖平台补丁：ContextMeter 面板必须携带 `conversation.context.actions` 槽位声明（本仓库随附的平台补丁已应用）。若该槽位不存在，按钮不会渲染，插件其余部分不受影响。

## 构建产物 / Artifacts

| 文件 | 通道 |
| --- | --- |
| `lib/index.js` | Host 半边（空 apply，无宿主行为） |
| `lib/client.js` | 官方 profile 通道（bundle id = 包名 `dsh-compact-button`） |
| `lib/client-registry.js` | 插件注册表通道（bundle id = manifest id `dsh-external/dsh-compact-button`） |
