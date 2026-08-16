# AGENTS.md

给 AI 协作者（及人类贡献者）的项目速览。人类可读的完整文档见 [README](./README.md)。

## 这是什么

**dsh-ballute** —— DeepSeek Harness（DSH）插件崩坏防护。DSH 对崩溃的插槽条目采取「安静退位」：摘除条目、tab 消失、错误只进浏览器 console。本项目把插件故障变成**可见 · 可归因 · 可恢复**。

## 代码地图

- `lib/index.js` — host 侧 cordis 插件：HTTP API（前缀 `/api/ballute/v1`，仅本机同源）+ 补丁层写入 + 安全模式跨 profile 恢复
- `lib/client.js` — client 侧 web 插槽：设置→插件→Ballute tab（体检 / 崩溃历史 / 安全模式恢复区）+ `shell.overlay` 崩卡
- `fixtures/fault-*` — 四类静态故障夹具（缺 client 文件 / 缺 `exports.apply` / 注册 id≠包名 / 缺 `exports.name`），供体检 API 自测，不是可运行插件
- `docs/issue-safe-boot.md` — 官方 `--safe-boot` 提案草稿
- `cordis.patch.yml` — 本包的 insert 行（id = 包名）

## API 一览（详见 README）

- `GET /v1/state` — 自检 + 可体检模块清单（安全模式下附 `recover` 跨 profile 清单）
- `GET /v1/inspect?module=X | fixture=Y | &profile=P` — 静态契约体检（8 项）
- `POST /v1/disable` `{module, profile?}` — 写补丁层停用（保护名单拦截基础设施行）
- `POST /v1/crash` — 崩溃遥测上报（client 自动调用）
- `GET /v1/crashes` — 崩溃历史（JSONL 黑匣子，重启不丢）

## 开发红线（违反必踩坑）

1. client bundle `__ModuleLoader__.load({ id })` 的 id **必须等于** package.json 的 `name`。
2. client bundle **必须导出 `name`**（= 包名）——cordis 的 fiber 名与崩溃归因 registrant 取自 `exports.name`，缺失则归因落到内部祖先 fiber。
3. 写 `cordis.patch.yml`：顶层数组、`- insert:` 起手；初始为 `[]`，追加前先剥掉空数组；写入必须原子 + 串行队列。
4. 本项目 client bundle 为手写格式（factory + require 风格），**无构建步骤**，`needs_build = false`。
5. `PROTECTED_MODULE_PATTERNS` 名单内的 `@deepseek-ai/` 基础设施行禁止停用（停了连带破坏运行链）。

## 验证

```
curl 'http://127.0.0.1:3080/api/ballute/v1/inspect?fixture=fault-mismatch'
curl 'http://127.0.0.1:3080/api/ballute/v1/inspect?module=crash-test-dummy'
```

四个夹具应逐一报出对应违例且归因正确；第二条需先装 [crash-test-dummy](https://github.com/Zlyraz/crash-test-dummy)（配套验收假人，独立仓库）。试装工作流（dev profile 隔离验证）见 README「开发」节。

## 维护状态

业余维护，响应可能较慢（hobby-maintained, no SLA）。issue/PR 欢迎。
