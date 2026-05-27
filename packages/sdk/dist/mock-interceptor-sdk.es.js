//#region src/index.ts
var e = [];
async function t(t) {
	let n = `${t.baseURL || ""}/api/project/${t.projectKey}/rules`, a = await fetch(n);
	if (!a.ok) {
		console.error(`[Mock SDK] 获取规则失败，Status: ${a.status}`);
		return;
	}
	e = await a.json(), r(), i();
}
function n(t, n) {
	return e.find((e) => {
		let r = e.method.toUpperCase() === t.toUpperCase(), i = !1;
		try {
			i = new RegExp(e.url).test(n);
		} catch {
			i = e.url === n;
		}
		return r && i;
	});
}
function r() {
	let { fetch: e } = window;
	window.fetch = async function(t, r) {
		let i = new Request(t, r), a = i.url, o = i.method, s = n(o, a);
		if (s) {
			let e = typeof s.responseData == "object" ? JSON.stringify(s.responseData) : s.responseData;
			return new Response(e, {
				status: s.statusCode || 200,
				headers: { "Content-Type": "application/json" }
			});
		}
		return e.call(window, t, r);
	};
}
function i() {
	let e = window.XMLHttpRequest, t = e.prototype.open, r = e.prototype.send;
	e.prototype.open = function(e, n) {
		return this._mockMethod = e, this._mockUrl = n, t.apply(this, arguments);
	}, e.prototype.send = function(e) {
		let t = this, i = n(t._mockMethod, t._mockUrl);
		if (i) {
			setTimeout(() => {
				Object.defineProperty(t, "readyState", {
					value: 4,
					writable: !0
				}), Object.defineProperty(t, "status", {
					value: i.statusCode || 200,
					writable: !0
				}), Object.defineProperty(t, "responseText", {
					value: typeof i.responseData == "object" ? JSON.stringify(i.responseData) : i.responseData,
					writable: !0
				}), t.onreadystatechange && t.onreadystatechange(new Event("readystatechange")), t.onload && t.onload(new Event("load"));
			}, 10);
			return;
		}
		return r.apply(t, arguments);
	};
}
//#endregion
export { t as initMock };
