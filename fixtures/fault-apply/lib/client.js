window.__ModuleLoader__.load({
	id: "fault-apply",
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;
		// 违例：注册了 bundle 却没有 exports.apply——装载后 fiber 无法激活
		exports.name = "fault-apply";
		exports.inject = [];
		return module.exports;
	},
});
