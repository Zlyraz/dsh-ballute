window.__ModuleLoader__.load({
	id: "fault-no-name",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		// 违例：缺 exports.name——fiber 名继承内部祖先，崩溃归因失真（M1 实测 x6）
		exports.apply = function apply() {};
		exports.inject = [];
		return module.exports;
	},
});
