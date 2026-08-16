# dsh-ballute（Ballute 气囊）

> DeepSeek Harness 插件崩坏防护：把插件故障从「安静退位」变成 **可见 · 可归因 · 可恢复**。
> ballute = balloon + parachute（气球伞，减速缓冲之意）。

## English quickstart

**dsh-ballute** is a crash-protection plugin for [DeepSeek Harness](https://github.com/deepseek-ai) (DSH). DSH silently removes crashing slot entries — you get a blank panel and the tab quietly disappears, errors only land in the console. Ballute turns that into something you can see, attribute and recover from:

| Line of defense | What it does |
|---|---|
| L1 Pre-flight | Static contract inspection (`GET /api/ballute/v1/inspect`) — catch structural faults before load |
| L2 Isolation | Bottom-right crash card via official `ctx.slots.onEntryError` hook (plugin · slot · error) |
| L3 Black box | Crash telemetry JSONL log + history list, survives restarts, `rev` pinpoints the code version |
| L4 Recovery | One-click "disable" on the crash card → writes patch layer → HMR unload without restart |
| L5 Safe mode | Minimal `safe` profile + cross-profile static inspect/disable to rescue a broken main profile |

Install:

```
dsh plugin add github:Zlyraz/dsh-ballute
```

Honest limits: covers runtime slot-entry crashes (L2 domain). Loader-level faults — client `apply` throwing, or a missing bundle file — kill client/host boot before any UI exists; those are only rescuable from the M4 safe mode. See 诚实边界 below for the full boundary, including the `SlotAssemblyError` whole-page blank case.

**Maintenance**: hobby-maintained in spare time — issues and PRs are welcome, but responses may be slow. AI collaborators start with [AGENTS.md](./AGENTS.md).

## 能力（随里程碑生长）

| 防线 | 状态 | 说明 |
|---|---|---|
| L2 隔离 | ✅ M1 | 订阅官方 `ctx.slots.onEntryError` 缝隙 → 右下角崩卡（插件名 · 槽 key · 错误）|
| L4 恢复 | ✅ M1 | 崩卡「关闭插件」→ 写补丁层 `disabled: true` → HMR 免重启卸载 |
| L1 预检 | ✅ M2 | `GET /api/ballute/v1/inspect` 静态契约体检（装载前发现结构故障）|
| L3 观测 | ✅ M3 | 崩溃遥测 JSONL 黑匣子 + 历史列表（重启不丢，rev 号可对时）|
| L5 兜底 | ✅ M4 | 安全模式：`safe` 最小 profile + 跨 profile 静态体检/禁用恢复坏 profile |

**诚实边界**：M1-M3 只覆盖 L2 域（运行时条目崩溃）。**装载器自身故障域**分两级——client `apply` 抛错炸 client boot（host 还活着）；bundle 文件缺失（load 档）炸 **host 进程本身**（curl 都不通）。两者都进不了 UI，只能靠 M4 安全模式从外部救（复现：装验收假人 [crash-test-dummy](https://github.com/Zlyraz/crash-test-dummy) 后开 `?dummyCrash=apply`，或把 `fixtures/fault-load` 真实装进 profile）。

另一个崩卡管不到的缝隙（实测过）：**插槽组装错误会穿透错误边界卸载整树**。DSH 的 `SlotErrorBoundary` 只吃普通渲染错误（条目退位 → 面板空白）；`SlotAssemblyError` 家族（locale face 未就绪 / 缺 hookContext / session binding provider 外渲染，见 `@deepseek-ai/dsh-client-web-react`）会被**重新抛出**，前端无顶层兜底 → React 卸载整棵树 → **整页纯色无内容**，偶发于 AI 子代理打开（session-aware 插槽重组装竞态）。此时 Ballute UI 一起没了，取证看 console 的未捕获 `SlotAssemblyError`，刷新即恢复；根治需官方加顶层错误页（已列入 issue 素材）。

## 安全模式（L5 兜底）

官方 CLI 暂无 `--safe-boot` 旗标（已探测，issue 草稿见 `docs/issue-safe-boot.md`），所以安全模式靠自建一个最小 profile：官方 bundle + 仅 dsh-ballute。主 profile 的 UI 坏死时，用它起一个能打开的实例，从外部救回坏 profile。

一次性搭建——在 `$DSH_HOME/profiles/safe/` 下放四个文件：

`package.json`：

```json
{
  "name": "dsh-profile-safe",
  "private": true,
  "dependencies": {
    "dsh-ballute": "github:Zlyraz/dsh-ballute"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-ballute"
      ]
    }
  }
}
```

`cordis.yml`（空树即可，插件树由补丁层组装）：

```yaml
[]
```

`cordis.patch.yml`（保持空数组，别加别的插件进来）：

```yaml
[]
```

`pnpm-workspace.yaml`：

```yaml
packages:
  - .
nodeLinker: hoisted
autoInstallPeers: false
```

然后在该目录 `pnpm install`。

用法：先停掉坏死的实例——注意 host 进程还活着时会照常响应探测，看起来“没死”，别被骗，确认端口释放后再起：

```
dsh --profile safe
```

profile 名为 `safe` 时 Ballute 自动进入安全模式：tab 顶部多出恢复区，列出目标 profile（默认 web）的全部第三方插件（包名 @版本 #rowId），每行可「体检」（静态 8 项）可「禁用」（写目标 profile 的用户补丁层，下次启动生效）。救完用正常方式重启主 profile 即可。

跨 profile API（safe 实例上）：

- `GET /v1/state` 多返回 `safeMode: true` + `recover: { target: "web", modules: [...] }`
- `GET /v1/inspect?module=<包名>&profile=web` — 静态体检目标 profile 里的插件
- `POST /v1/disable { "module": ..., "profile": "web" }` — 跨 profile 禁用（`runtimeEffect: "next-boot"`）；守卫照常（基础设施/ballute 自身/名字格式全拦）

## API（仅限本机同源）

- `GET /api/ballute/v1/state` — 自检状态 + 可体检的第三方模块清单
- `GET /api/ballute/v1/inspect?module=<包名>` — 体检已装插件（8 项检查：bundle 注册 id=包名 / exports.apply / exports.name / inject 服务键 / host 半边 / 补丁 name 守卫…）
- `GET /api/ballute/v1/inspect?fixture=<名>` — 体检自带夹具：`fault-load` / `fault-apply` / `fault-mismatch` / `fault-no-name`
- `POST /api/ballute/v1/disable` `{ "module": "<包名>" }` — 写用户补丁层停用（保护名单拦截基础设施行）
- `POST /api/ballute/v1/crash` — 崩溃遥测上报（client 自动调用）：`{ registrant, slotKey, entryId, message, stack, abdicated, at, count, rev }` → 追加到 `$DSH_HOME/ballute/crash-log.jsonl`
- `GET /api/ballute/v1/crashes?limit=20&plugin=<包名>` — 崩溃历史（最新在前，每请求重读磁盘；超 600 条自动压实到最近 500）

**黑匣子事件格式**（`schemaVersion: 1`，字段版本化，供可视化插件等第三方消费）：

```json
{ "schemaVersion": 1, "at": 1786814000000, "receivedAt": 1786815667828,
  "registrant": "crash-test-dummy", "slotKey": "shell.overlay", "entryId": null,
  "message": "受控 render 崩溃…", "stack": "Error: …", "abdicated": true,
  "count": 1, "rev": "a436f2444edf" }
```

`rev` = 崩溃时启动图内容哈希（`window.__DSH_BOOT__.rev`），可定位「哪个代码版本崩的」；`abdicated: false` 表示 chain 型（只上报不摘除）。

## 安装

```
dsh plugin add github:Zlyraz/dsh-ballute
```

**维护状态**：业余维护，响应可能较慢——欢迎 issue/PR，不承诺时效（AI 协作入口见 [AGENTS.md](./AGENTS.md)）。

## 与 dsh-workshop 的配合

两个插件写同一份 `cordis.patch.yml`，不会互相踩——补丁写入工艺（原子写、串行队列、基础设施保护名单）本来就复用自 workshop。日常增删插件走 workshop；装完新插件可以用 ballute 体检一遍，真崩了就崩卡一键关闭，救不回来再进安全模式。

## 开发

### dev profile 试装工作流（先隔离验证，再扶正）

1. **装进一次性 dev profile**（与日常 web profile 隔离，炸了不影响主环境）：
   ```
   dsh plugin --profile dev add /path/to/dsh-ballute
   ```
2. **起独立实例验证**（不同端口避免冲突；具体旗标以 `dsh web --help` 为准）：
   ```
   dsh web --profile dev --port 3081
   ```
   打开 `http://127.0.0.1:3081`，检查：设置→插件 出现 Ballute tab；再装验收假人 [crash-test-dummy](https://github.com/Zlyraz/crash-test-dummy) 跑一遍崩卡流程。
3. **扶正**：验过后再装进日常 profile：
   ```
   dsh plugin --profile web add /path/to/dsh-ballute
   ```
4. **手动 link 方式**（开发期改代码即生效，推荐）：在 `profiles/web/package.json` 的 `dependencies` 加 `"dsh-ballute": "link:/abs/path/to/dsh-ballute"`，`dsh.profile.bundles` 数组加 `"dsh-ballute"`，然后 profile 目录内 `pnpm install`，重启 `dsh web`。

### 自测

```
curl 'http://127.0.0.1:3080/api/ballute/v1/inspect?fixture=fault-mismatch'
curl 'http://127.0.0.1:3080/api/ballute/v1/inspect?module=crash-test-dummy'
```

第二条需要先装验收假人：`dsh plugin add github:Zlyraz/crash-test-dummy`。

四个夹具各含一种契约违例（缺 client 文件 / 缺 exports.apply / 注册 id≠包名 / 缺 exports.name），体检应逐一报出且归因正确。

### 踩过的坑

- client bundle 一定要导出 `name`（= 包名）。cordis 的 fiber 名取自 `exports.name`，缺了的话崩溃归因会落到内部 fiber 上（面板里只会看到 `x6` 这种名字，看不出是谁崩的）。
- 手写 bundle 的话，`__ModuleLoader__.load({ id })` 的 id 必须等于包名。
- `cordis.patch.yml` 初始是 `[]`，直接追加会得到非法结构，先剥掉空数组再写；写入走原子写 + 串行队列。

## 许可

MIT（见 [LICENSE](./LICENSE)）
