window.__ModuleLoader__.load({
	id: "dsh-ballute",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const el = react.createElement;
		const { useState, useEffect, useCallback, useSyncExternalStore } = react;
		//#region styles
		const css = ".bt_section{width:100%;max-width:820px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}.bt_head{flex-direction:column;gap:4px;display:flex}.bt_title{margin:0;font-size:14px;font-weight:600;line-height:22px}.bt_sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;word-break:break-all}.bt_messageRow{display:flex;align-items:center;gap:10px}.bt_spinner{width:14px;height:14px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);border-radius:50%;animation:btspin 1s linear infinite;flex:none}@keyframes btspin{to{transform:rotate(360deg)}}.bt_message{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;margin:0}.bt_message[data-error=true]{color:var(--dsw-alias-state-error-primary)}.bt_btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:0 0;font:inherit;font-size:12px;cursor:pointer;border-radius:6px;padding:3px 12px}.bt_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}.bt_btn:disabled{opacity:.5;cursor:default}.bt_foot{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;margin:0}.bt_inspect{flex-direction:column;gap:8px;display:flex}.bt_inspectTitle{margin:0;font-size:13px;font-weight:600;line-height:20px}.bt_inspectBar{gap:8px;display:flex;align-items:center;flex-wrap:wrap}.bt_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:32px;min-width:200px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;border-radius:8px;outline:none;padding:0 8px}.bt_select:focus-visible{border-color:var(--dsw-alias-state-business-primary)}.bt_summary{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:0;word-break:break-all}.bt_results{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.bt_resultRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:8px 10px;flex-direction:column;gap:3px;display:flex}.bt_resultTop{align-items:center;gap:8px;display:flex}.bt_resultDot{width:8px;height:8px;border-radius:50%;flex:none}.bt_resultDot[data-status=pass]{background:var(--dsw-alias-state-success-primary)}.bt_resultDot[data-status=warn]{background:var(--dsw-alias-state-warn-primary,#d9812b)}.bt_resultDot[data-status=fail]{background:var(--dsw-alias-state-error-primary)}.bt_resultLabel{font-size:12px;font-weight:600;flex:1}.bt_resultCount{color:var(--dsw-alias-label-tertiary);font-size:11px;flex:none;font-family:ui-monospace,Menlo,Consolas,monospace}.bt_resultDetail{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;word-break:break-all;margin:0}.bt_layer{position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;max-width:380px;z-index:1000;pointer-events:none}.bt_card{pointer-events:auto;border:1px solid var(--dsw-alias-state-error-primary,#e5484d);background:var(--dsw-alias-bg-layer-3,#1e1e22);border-radius:10px;padding:10px 12px;flex-direction:column;gap:6px;display:flex;box-shadow:0 6px 24px rgba(0,0,0,.35)}.bt_cardTitle{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-state-error-primary,#e5484d);font-size:12px;font-weight:600;line-height:18px}.bt_cardDot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-error-primary,#e5484d);flex:none}.bt_cardMeta{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:17px;color:var(--dsw-alias-label-primary);word-break:break-all;margin:0}.bt_cardMsg{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;margin:0;word-break:break-all}.bt_cardActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.bt_cardNote{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;margin:0}.bt_histPlugin{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt_histTime{color:var(--dsw-alias-label-tertiary);font-size:11px;flex:none}";
		const tagId = "dsh-ballute/BalluteTab.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-ballute";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		const NS = "ballute.panel";
			const zh = {
				tab: "Ballute 气囊",
				sub: "插件崩坏防护 · 可见 · 可归因 · 可恢复",
				loading: "自检中…",
				loadFail: "自检失败",
				retry: "重试",
				foot: "M1 崩溃接管 + M2 静态体检 + M3 黑匣子已上线。安全模式（M4）随后。",
				crashTitle: "插件崩溃",
				unknown: "未知来源",
				disableBtn: "关闭插件",
				dismissBtn: "知道了",
				copyBtn: "复制详情",
				copied: "已复制",
				disabling: "已写入停用，HMR 重组中…",
				disableFail: "关闭失败",
				inspectTitle: "体检（L1 预检 · 装载前发现结构故障）",
				inspectBtn: "开始体检",
				inspecting: "体检中…",
				noModules: "没有可体检的第三方/本地插件",
				histTitle: "崩溃历史（L3 黑匣子 · 重启不丢）",
				histEmpty: "暂无崩溃记录——气囊至今未被触发",
				histRefresh: "刷新",
				histAll: "全部插件",
				histCopy: "复制栈",
				histChain: "chain",
				safeTitle: "安全模式（L5 兜底）",
				safeNote: "当前以最小 profile（safe）运行。下面列出目标 profile 的第三方插件——体检可静态预检，禁用会写目标补丁层并在其下次启动时生效。恢复后请重开正常模式。",
				safeDisable: "禁用",
				safeDisabledTag: "已停用",
				safeInspect: "体检",
				safeWorking: "处理中…",
				safeFail: "操作失败",
			};
			const en = {
				tab: "Ballute",
				sub: "Plugin crash protection · visible · attributable · recoverable",
				loading: "Self-checking…",
				loadFail: "Self-check failed",
				retry: "Retry",
				foot: "M1 crash takeover + M2 preflight inspect + M3 black box live. Safe mode (M4) to follow.",
				crashTitle: "Plugin crashed",
				unknown: "unknown source",
				disableBtn: "Disable plugin",
				dismissBtn: "Dismiss",
				copyBtn: "Copy details",
				copied: "Copied",
				disabling: "Disable written, HMR recomposing…",
				disableFail: "Disable failed",
				inspectTitle: "Preflight inspect (L1 · catch structural faults before load)",
				inspectBtn: "Inspect",
				inspecting: "Inspecting…",
				noModules: "No third-party/local plugins to inspect",
				histTitle: "Crash history (L3 black box · survives restart)",
				histEmpty: "No crash records — airbag never triggered",
				histRefresh: "Refresh",
				histAll: "All plugins",
				histCopy: "Copy stack",
				histChain: "chain",
				safeTitle: "Safe mode (L5 fallback)",
				safeNote: "Running the minimal profile (safe). Third-party plugins of the target profile are listed below — inspect runs statically, disable writes the target patch layer and takes effect on its next boot. Reopen normal mode after recovery.",
				safeDisable: "Disable",
				safeDisabledTag: "disabled",
				safeInspect: "Inspect",
				safeWorking: "Working…",
				safeFail: "Operation failed",
			};

		//#region crash store（onEntryError 在 React 提交期外触发，用外部存储广播）
		let crashes = [];
		let version = 0;
		const listeners = new Set();
		function notify() { version += 1; listeners.forEach((l) => l()); }
		function subscribe(l) { listeners.add(l); return () => { listeners.delete(l); }; }
		function getSnapshot() { return version; }

		function firstLine(err) {
			const m = err instanceof Error ? err.message : String(err);
			return String(m).split("\n")[0].slice(0, 200);
		}

		// M3 黑匣子遥测：rev 取自注入 index.html 的启动图（window.__DSH_BOOT__ = { rev, entries }）
		function bootRev() {
			try {
				const b = window.__DSH_BOOT__;
				return (b && typeof b.rev === "string" && b.rev) || null;
			} catch { return null; }
		}

		function reportCrash(rec) {
			try {
				fetch("/api/ballute/v1/crash", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						registrant: rec.registrant,
						slotKey: rec.slotKey,
						entryId: rec.entryId,
						message: rec.message,
						stack: rec.stack,
						abdicated: rec.abdicated,
						at: rec.at,
						count: rec.count || 1,
						rev: bootRev(),
					}),
					keepalive: true,
				}).catch(() => {});
			} catch {}
		}

		function recordCrash(key, entry, error, info) {
			const rec = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				slotKey: String(key),
				registrant: (entry && typeof entry.registrant === "string" && entry.registrant) || null,
				entryId: (entry && entry.options && entry.options.id) || null,
				message: firstLine(error),
				stack: error instanceof Error ? String(error.stack ?? error.message) : String(error),
				abdicated: Boolean(info && info.abdicated),
				at: Date.now(),
				dismissed: false,
				handled: false,
				handledNote: "",
			};
			// 同源崩溃 60 秒内去重（避免刷屏）
			const dup = crashes.find((c) => !c.dismissed && c.registrant === rec.registrant && c.slotKey === rec.slotKey && c.message === rec.message && rec.at - c.at < 60000);
			if (dup) { dup.at = rec.at; dup.count = (dup.count || 1) + 1; reportCrash(dup); notify(); return; }
			crashes.unshift(rec);
			crashes = crashes.slice(0, 10);
			reportCrash(rec);
			notify();
		}
		//#endregion

		//#region crash card（shell.overlay 席位：提前注册，空态渲染 null）
		function CrashCard({ rec, lang }) {
			const [busy, setBusy] = useState(false);
			const [copied, setCopied] = useState(false);

			const dismiss = useCallback(() => { rec.dismissed = true; notify(); }, [rec]);

			const copy = useCallback(async () => {
				try {
					await navigator.clipboard.writeText(`[ballute crash]\nplugin: ${rec.registrant ?? lang.unknown}\nslot: ${rec.slotKey}\nentry: ${rec.entryId ?? "?"}\nabdicated: ${rec.abdicated}\nat: ${new Date(rec.at).toISOString()}\nstack:\n${rec.stack}`);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {}
			}, [rec, lang]);

			const disable = useCallback(async () => {
				if (!rec.registrant) return;
				setBusy(true);
				try {
					const res = await fetch("/api/ballute/v1/disable", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ module: rec.registrant }),
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
					rec.handled = true;
					rec.handledNote = lang.disabling;
					notify();
				} catch (e) {
					rec.handled = true;
					rec.handledNote = `${lang.disableFail}: ${e instanceof Error ? e.message : String(e)}`;
					notify();
				} finally {
					setBusy(false);
				}
			}, [rec, lang]);

			return el("div", { className: "bt_card" },
				el("p", { className: "bt_cardTitle" }, el("span", { className: "bt_cardDot" }), `${lang.crashTitle}${rec.count > 1 ? ` ×${rec.count}` : ""}${rec.abdicated ? "" : " (chain)"}`),
				el("p", { className: "bt_cardMeta" }, `${rec.registrant ?? lang.unknown} · ${rec.slotKey}`),
				el("p", { className: "bt_cardMsg" }, rec.message),
				rec.handled ? el("p", { className: "bt_cardNote" }, rec.handledNote) : null,
				el("div", { className: "bt_cardActions" },
					rec.registrant && !rec.handled ? el("button", { type: "button", className: "bt_btn", disabled: busy, onClick: disable }, busy ? "…" : lang.disableBtn) : null,
					el("button", { type: "button", className: "bt_btn", onClick: dismiss }, lang.dismissBtn),
					el("button", { type: "button", className: "bt_btn", onClick: copy }, copied ? lang.copied : lang.copyBtn)));
		}

		function CrashBar() {
			const ver = useSyncExternalStore(subscribe, getSnapshot);
			const [lang] = useState(() => (navigator.language || "zh").toLowerCase().startsWith("zh") ? zh : en);
			const live = crashes.filter((c) => !c.dismissed);
			if (live.length === 0) return null;
			return el("div", { className: "bt_layer" }, live.map((rec) => el(CrashCard, { key: rec.id, rec, lang })));
		}
		//#endregion

		function BalluteTab() {
			const [state, setState] = useState(null);
			const [error, setError] = useState(null);
			const [target, setTarget] = useState("");
			const [report, setReport] = useState(null);
			const [busy, setBusy] = useState(false);
			const [history, setHistory] = useState(null);
			const [histFilter, setHistFilter] = useState("");
			const [histBusy, setHistBusy] = useState(false);
			const [copiedId, setCopiedId] = useState("");
			const [lang] = useState(() => (navigator.language || "zh").toLowerCase().startsWith("zh") ? zh : en);

			const load = useCallback(async () => {
				setError(null);
				try {
					const res = await fetch("/api/ballute/v1/state");
					const data = await res.json();
					if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
					setState(data);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, []);

			const loadHistory = useCallback(async (filter) => {
				setHistBusy(true);
				try {
					const q = filter ? `?plugin=${encodeURIComponent(filter)}` : "";
					const res = await fetch(`/api/ballute/v1/crashes${q}`);
					const data = await res.json();
					if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
					setHistory(data);
				} catch (e) {
					setHistory({ error: e instanceof Error ? e.message : String(e) });
				} finally {
					setHistBusy(false);
				}
			}, []);

			useEffect(() => { load(); loadHistory(""); }, [load, loadHistory]);

			useEffect(() => {
				if (!state || target || state.modules.length === 0) return;
				const preferred = state.modules.find((m) => m.name === "crash-test-dummy") ?? state.modules[0];
				setTarget(preferred.name);
			}, [state, target]);

			const runInspect = useCallback(async () => {
				if (!target) return;
				setBusy(true);
				setReport(null);
				try {
					const res = await fetch(`/api/ballute/v1/inspect?module=${encodeURIComponent(target)}`);
					const data = await res.json();
					if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
					setReport(data);
				} catch (e) {
					setReport({ error: e instanceof Error ? e.message : String(e) });
				} finally {
					setBusy(false);
				}
			}, [target]);

			const copyStack = useCallback(async (row) => {
				try {
					await navigator.clipboard.writeText(`[ballute crash]\nplugin: ${row.registrant ?? lang.unknown}\nslot: ${row.slotKey ?? "?"}\nentry: ${row.entryId ?? "?"}\nabdicated: ${row.abdicated}\nrev: ${row.rev ?? "?"}\nat: ${new Date(row.at).toISOString()}\ncount: ${row.count}\nstack:\n${row.stack}`);
					setCopiedId(String(row.at));
					setTimeout(() => setCopiedId(""), 1500);
				} catch {}
			}, [lang]);

			const fmtTime = (ms) => new Date(ms).toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

			// M4 安全模式：跨 profile 静态恢复（体检/禁用写目标 profile 补丁层，下次启动生效）
			const [safeBusy, setSafeBusy] = useState("");
			const [safeMsg, setSafeMsg] = useState(null);
			const disableRecover = useCallback(async (moduleName, profile) => {
				setSafeBusy(moduleName);
				setSafeMsg(null);
				try {
					const res = await fetch("/api/ballute/v1/disable", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ module: moduleName, profile }),
					});
					const data = await res.json();
					if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
					setSafeMsg(`${moduleName}: ${data.note}`);
					await load();
				} catch (e) {
					setSafeMsg({ error: `${moduleName}: ${e instanceof Error ? e.message : String(e)}` });
				} finally {
					setSafeBusy("");
				}
			}, [load]);

			const inspectRecover = useCallback(async (moduleName, profile) => {
				setSafeBusy(moduleName);
				setReport(null);
				try {
					const res = await fetch(`/api/ballute/v1/inspect?module=${encodeURIComponent(moduleName)}&profile=${encodeURIComponent(profile)}`);
					const data = await res.json();
					if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
					setReport(data);
				} catch (e) {
					setReport({ error: e instanceof Error ? e.message : String(e) });
				} finally {
					setSafeBusy("");
				}
			}, []);

			if (error) return el("div", { className: "bt_section" },
				el("p", { className: "bt_message", "data-error": "true" }, `${lang.loadFail}: ${error}`),
				el("button", { className: "bt_btn", type: "button", onClick: load }, lang.retry));
			if (!state) return el("div", { className: "bt_section" },
				el("div", { className: "bt_messageRow" }, el("span", { className: "bt_spinner" }), el("p", { className: "bt_message" }, lang.loading)));

			return el("section", { className: "bt_section" },
				el("div", { className: "bt_head" },
					el("h3", { className: "bt_title" }, `${lang.tab} — ${lang.sub}`),
					el("p", { className: "bt_sub" }, `v${state.version} · ${state.patchPath}`)),
				state && state.safeMode && state.recover
					? el("div", { className: "bt_inspect" },
						el("p", { className: "bt_inspectTitle" }, `${lang.safeTitle} — ${state.recover.target}`),
						el("p", { className: "bt_sub" }, lang.safeNote),
						safeMsg
							? el("p", { className: "bt_message", "data-error": safeMsg.error ? "true" : undefined }, safeMsg.error ?? safeMsg)
							: null,
						state.recover.modules.length === 0
							? el("p", { className: "bt_message" }, lang.noModules)
							: el("ul", { className: "bt_results" },
								state.recover.modules.map((m) => el("li", { key: m.name, className: "bt_resultRow", "data-off": m.disabled ? "true" : undefined },
									el("div", { className: "bt_resultTop" },
										el("span", { className: "bt_resultDot", "data-status": m.disabled ? "warn" : "pass" }),
										el("span", { className: "bt_histPlugin" }, `${m.name}${m.version ? ` @${m.version}` : ""}${m.rowId ? ` #${m.rowId}` : ""}${m.disabled ? ` — ${lang.safeDisabledTag}` : ""}`),
										el("button", { type: "button", className: "bt_btn", disabled: safeBusy !== "" || m.disabled, onClick: () => inspectRecover(m.name, state.recover.target) }, safeBusy === m.name ? lang.safeWorking : lang.safeInspect),
										el("button", { type: "button", className: "bt_btn", disabled: safeBusy !== "" || m.disabled, onClick: () => disableRecover(m.name, state.recover.target) }, lang.safeDisable))))))
					: null,
				el("div", { className: "bt_inspect" },
					el("p", { className: "bt_inspectTitle" }, lang.inspectTitle),
					state.modules.length === 0
						? el("p", { className: "bt_message" }, lang.noModules)
						: el("div", { className: "bt_inspectBar" },
							el("select", { className: "bt_select", value: target, onChange: (e) => setTarget(e.target.value) },
								state.modules.map((m) => el("option", { key: m.name, value: m.name }, m.enabled ? m.name : `${m.name} (off)`))),
							el("button", { type: "button", className: "bt_btn", disabled: busy || !target, onClick: runInspect },
								busy ? lang.inspecting : lang.inspectBtn)),
					report && report.error
						? el("p", { className: "bt_message", "data-error": "true" }, `${lang.loadFail}: ${report.error}`)
						: null,
					report && report.checks
						? el("div", null,
							el("p", { className: "bt_summary" }, `${report.target.name} — ${report.summary.pass} pass · ${report.summary.warn} warn · ${report.summary.fail} fail`),
							el("ul", { className: "bt_results" },
								report.checks.map((c) => el("li", { key: c.id, className: "bt_resultRow" },
									el("div", { className: "bt_resultTop" },
										el("span", { className: "bt_resultDot", "data-status": c.status }),
										el("span", { className: "bt_resultLabel" }, c.label),
										el("span", { className: "bt_resultCount" }, c.status)),
									el("p", { className: "bt_resultDetail" }, c.detail)))))
						: null),
				el("div", { className: "bt_inspect" },
					el("p", { className: "bt_inspectTitle" }, lang.histTitle),
					el("div", { className: "bt_inspectBar" },
						el("select", { className: "bt_select", value: histFilter,
							onChange: (e) => { setHistFilter(e.target.value); loadHistory(e.target.value); } },
							el("option", { key: "", value: "" }, lang.histAll),
							[...new Set(((history && history.entries) || []).map((r) => r.registrant).filter(Boolean))].map((p) =>
								el("option", { key: p, value: p }, p))),
						el("button", { type: "button", className: "bt_btn", disabled: histBusy,
							onClick: () => loadHistory(histFilter) }, histBusy ? "…" : lang.histRefresh),
						history && history.total !== undefined
							? el("span", { className: "bt_summary" }, `${history.count}/${history.total}`)
							: null),
					history && history.error
						? el("p", { className: "bt_message", "data-error": "true" }, `${lang.loadFail}: ${history.error}`)
						: null,
					history && Array.isArray(history.entries)
						? history.entries.length === 0
							? el("p", { className: "bt_message" }, lang.histEmpty)
							: el("ul", { className: "bt_results" },
								history.entries.map((r, i) => el("li", { key: `${r.at}-${i}`, className: "bt_resultRow" },
									el("div", { className: "bt_resultTop" },
										el("span", { className: "bt_resultDot", "data-status": "fail" }),
										el("span", { className: "bt_histPlugin" }, `${r.registrant ?? lang.unknown} · ${r.slotKey ?? "?"}${r.count > 1 ? ` ×${r.count}` : ""}${r.abdicated ? "" : ` (${lang.histChain})`}`),
										el("span", { className: "bt_histTime" }, fmtTime(r.at)),
										el("button", { type: "button", className: "bt_btn", onClick: () => copyStack(r) },
											copiedId === String(r.at) ? lang.copied : lang.histCopy)),
									el("p", { className: "bt_resultDetail" }, r.message))))
						: null),
					el("p", { className: "bt_foot" }, lang.foot));
		}

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ballute: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "ballute",
				order: 26,
				label: () => t("tab"),
				locale: NS,
				inject: () => ({}),
			}, BalluteTab));

			// 崩溃接管：官方监督缝隙（ctx.slots.onEntryError）
			ctx.effect(() => {
				const off = ctx.slots.onEntryError((key, entry, error, info) => {
					try {
						recordCrash(key, entry, error, info);
					} catch (e) {
						console.error("[ballute] recordCrash failed:", e);
					}
				});
				return off;
			}, "ballute: onEntryError");

			// 崩卡席位：提前注册（空态渲染 null），避开错误分发期的重入风险
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "ballute-crashbar",
				order: 1000,
			}, CrashBar));
		}
		// cordis 从 exports.name 取 fiber 名；不导出则归因会落到内部祖先 fiber（spike 实测教训）
		exports.name = "dsh-ballute";
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = ["slots", "locale"];
		return module.exports;
	}
});
