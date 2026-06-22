//#region src/index.ts
var e = [];
async function t(t) {
	let n = `${t.baseURL || ""}/api/project/${t.projectKey}/rules`, i = await fetch(n);
	if (!i.ok) {
		console.error(`[Mock SDK] 获取规则失败，Status: ${i.status}`);
		return;
	}
	e = await i.json(), r(), a();
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
		let a = new Request(t, r), o = a.url, s = a.method, c = n(s, o);
		if (c.mode === "proxy" && c.proxyTarget) try {
			let t = await e(c.proxyTarget, {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			}), n = await t.json();
			if (c.proxyReplacements) for (let e of c.proxyReplacements) i(n, e.path, e.value);
			return new Response(JSON.stringify(n), {
				status: c.statusCode || t.status,
				headers: { "Content-Type": "application/json" }
			});
		} catch (e) {
			return console.error("[MockSDK] Proxy error:", e), new Response(JSON.stringify({ error: "Proxy failed" }), { status: 502 });
		}
		else {
			let e = typeof c.responseData == "object" ? JSON.stringify(c.responseData) : c.responseData;
			return new Response(e, {
				status: c.statusCode || 200,
				headers: { "Content-Type": "application/json" }
			});
		}
		return e.call(window, t, r);
	};
}
function i(e, t, n) {
	let r = t.split("."), i = e;
	for (let e = 0; e < r.length - 1; e++) i[r[e]] || (i[r[e]] = {}), i = i[r[e]];
	i[r[r.length - 1]] = n;
}
function a() {
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
