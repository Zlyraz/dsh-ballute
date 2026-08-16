window.__ModuleLoader__.load({
	id: "fault-mismatch-wrong",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		// 违例：注册 id ≠ 包名——boot 侧按包名找不到工厂，装载必失败
		exports.name = "fault-mismatch";
		exports.apply = function apply() {};
		exports.inject = [];
		return module.exports;
	},
});
