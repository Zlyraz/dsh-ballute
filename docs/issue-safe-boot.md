# 提案：`dsh --safe-boot` 旗标——坏插件炸 boot 后的官方逃生门

> 状态：草稿（ballute M4 产出）。仓库：deepseek-harness。
> 背景：第三方插件生态起来后，"装了个坏插件导致 UI 起不来"会变成最常见的求助场景。

## 问题

装载器自身故障域没有逃生门。具体两类：

1. **client `apply` 抛错 / bundle 物化失败**：炸整个 boot，Web UI 白屏。
   复现：任何 client bundle 顶层 `throw`（[crash-test-dummy](https://github.com/Zlyraz/crash-test-dummy) 的 `?dummyCrash=load|apply` 档可一键复现）。
2. **坏 insert 行（bundle patch 层）**：第三方包的 `cordis.patch.yml` 声明了不存在的模块 id，合成期抛错。

共同后果：**host 进程还活着（`curl /` 返回 200），但页面永远起不来**。用户卡死循环：
- 想"卸载坏插件"→ 得进 UI → UI 起不来 → 没有入口。
- 用户层补丁（`cordis.patch.yml`）本可救（`- id: xxx\n  disabled: true`），但要求用户：
  a) 知道是哪个插件坏的；b) 知道 row id ≠ 包名的映射；c) 手改 YAML。对非作者用户不现实。

## 提议

`dsh web --safe-boot`（或 `DSH_SAFE_BOOT=1`）：

- **忽略所有 bundle 层 patch 的第三方 insert 行**（只保留官方 bundle 默认集 + cordis 核心行），用户 patch 层照常应用（用户明确的 disables 仍生效）。
- 起服务后 Web UI 可用，官方设置里可见插件清单与"上次崩溃来源"（若有遥测）。
- 理想形态：boot 失败时 host 在首页注入一条 banner："启动失败：N 个第三方插件行已跳过（--safe-boot 重试可进入安全模式）"。

## 为什么应该做在内核而不是插件层

第三方插件（如 ballute）只能用"独立最小 profile 目录"绕（ballute M4 即此方案）：能兜底，但有三点不如官方：

1. profile 是快照副本，需要同步维护（新装官方 bundle 后 safe profile 可能落后）。
2. 无法感知 boot 失败原因，只能全量跳过第三方，不能精确定位坏行。
3. 覆盖不了官方 bundle 自身 bug 与合成期错误（那不是"第三方行"）。

## 社区现状佐证

Claude Code 有等价物：`--safe-mode` / 干净配置启动是插件生态成熟期的标配逃生门。

## 复现材料

- 坏插件样本：[crash-test-dummy](https://github.com/Zlyraz/crash-test-dummy)（一键复现三档故障）+ [dsh-ballute](https://github.com/Zlyraz/dsh-ballute) `fixtures/` 下四类静态故障夹具
- 插件侧已实现的降级方案：https://github.com/Zlyraz/dsh-ballute（README「安全模式」节）
