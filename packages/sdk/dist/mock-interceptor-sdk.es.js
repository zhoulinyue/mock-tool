//#region src/index.ts
var e = [], t = [];
function n(e, t, n) {
	let r = t.split("."), i = e;
	for (let e = 0; e < r.length - 1; e++) i[r[e]] || (i[r[e]] = {}), i = i[r[e]];
	i[r[r.length - 1]] = n;
}
function r(t, n) {
	return e.find((e) => {
		if (e.type !== "http" || e.method && e.method.toUpperCase() !== t.toUpperCase()) return !1;
		try {
			return new RegExp(e.url).test(n);
		} catch {
			return e.url === n;
		}
	});
}
function i() {
	let e = window.fetch;
	window.fetch = async function(t, i) {
		let a = new Request(t, i), o = a.url, s = a.method, c = r(s, o);
		if (c) if (c.mode === "proxy" && c.proxyTarget) try {
			let t = await e(c.proxyTarget, i), r = await t.json();
			if (c.proxyReplacements) for (let e of c.proxyReplacements) n(r, e.path, e.value);
			return new Response(JSON.stringify(r), {
				status: c.statusCode || t.status,
				headers: { "Content-Type": "application/json" }
			});
		} catch (e) {
			return console.error("[MockSDK] HTTP proxy error", e), new Response(JSON.stringify({ error: "Proxy failed" }), { status: 502 });
		}
		else {
			let e = typeof c.responseData == "object" ? JSON.stringify(c.responseData) : c.responseData;
			return new Response(e, {
				status: c.statusCode || 200,
				headers: { "Content-Type": "application/json" }
			});
		}
		return e.call(window, t, i);
	};
}
function a() {
	let e = window.XMLHttpRequest, t = e.prototype.open, i = e.prototype.send;
	e.prototype.open = function(e, n) {
		return this._mockMethod = e, this._mockUrl = n, t.apply(this, arguments);
	}, e.prototype.send = function(e) {
		let t = this, a = r(t._mockMethod, t._mockUrl);
		if (a) if (a.mode === "proxy" && a.proxyTarget) {
			let r = new XMLHttpRequest();
			r.open(t._mockMethod, a.proxyTarget, !0), r.onload = function() {
				let e = JSON.parse(r.responseText);
				if (a.proxyReplacements) for (let t of a.proxyReplacements) n(e, t.path, t.value);
				Object.defineProperty(t, "readyState", {
					value: 4,
					writable: !0
				}), Object.defineProperty(t, "status", {
					value: a.statusCode || r.status,
					writable: !0
				}), Object.defineProperty(t, "responseText", {
					value: JSON.stringify(e),
					writable: !0
				}), t.onreadystatechange && t.onreadystatechange(new Event("readystatechange")), t.onload && t.onload(new Event("load"));
			}, r.onerror = function() {
				console.error("[MockSDK] XHR proxy error");
			}, r.send(e);
			return;
		} else {
			let e = typeof a.responseData == "object" ? JSON.stringify(a.responseData) : a.responseData;
			setTimeout(() => {
				Object.defineProperty(t, "readyState", {
					value: 4,
					writable: !0
				}), Object.defineProperty(t, "status", {
					value: a.statusCode || 200,
					writable: !0
				}), Object.defineProperty(t, "responseText", {
					value: e,
					writable: !0
				}), t.onreadystatechange && t.onreadystatechange(new Event("readystatechange")), t.onload && t.onload(new Event("load"));
			}, 10);
			return;
		}
		return i.apply(t, arguments);
	};
}
var o = window.WebSocket, s = class {
	url;
	readyState = 0;
	onopen = null;
	onmessage = null;
	onclose = null;
	onerror = null;
	rules;
	realSocket;
	constructor(e, t, n = []) {
		this.url = e, this.rules = n, console.log("[MockSDK] FakeWebSocket - instance created for url:", e, "with", n.length, "matched rules"), setTimeout(() => {
			this.readyState = 1, this.onopen?.(new Event("open"));
		}, 10);
	}
	send(e) {
		console.log("[MockSDK] FakeWebSocket.send - received data:", e);
		let t;
		try {
			t = JSON.parse(e), console.log("[MockSDK] FakeWebSocket.send - parsed message method:", t.method);
		} catch {
			console.log("[MockSDK] FakeWebSocket.send - data is not JSON, passing to real socket"), this.ensureRealSocket(), this.realSocket?.send(e);
			return;
		}
		let n = this.rules.find((e) => (console.log("[MockSDK] FakeWebSocket.send - attempting to match rule.wsMethod:", e.wsMethod, "with msg.method:", t.method), e.wsMethod === t.method));
		if (n) if (console.log("[MockSDK] FakeWebSocket.send - rule matched!", n.id), n.mode === "static") {
			let e = {
				id: t.id,
				...JSON.parse(JSON.stringify(n.responseData))
			};
			setTimeout(() => {
				this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(e) }));
			}, 50);
		} else n.mode === "proxy" && n.proxyTarget && this.handleProxy(t, n);
		else console.log("[MockSDK] FakeWebSocket.send - no rule matched for method:", t.method, ", passing to real socket"), this.ensureRealSocket(), this.realSocket?.send(e);
	}
	handleProxy(e, t) {
		let r = new o(t.proxyTarget);
		r.onopen = () => r.send(JSON.stringify(e)), r.onmessage = (e) => {
			let i = JSON.parse(e.data);
			if (t.proxyReplacements) for (let e of t.proxyReplacements) n(i, e.path, e.value);
			this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(i) })), r.close();
		}, r.onerror = (e) => {
			console.error("[MockSDK] WebSocket proxy error", e);
		};
	}
	ensureRealSocket() {
		(!this.realSocket || this.realSocket.readyState > 1) && (this.realSocket = new o(this.url), this.realSocket.onmessage = (e) => {
			this.onmessage?.(new MessageEvent("message", { data: e.data }));
		}, this.realSocket.onclose = (e) => {
			this.readyState = 3, this.onclose?.(e);
		}, this.realSocket.onerror = (e) => this.onerror?.(e));
	}
	close(e, t) {
		this.readyState = 3, this.realSocket?.close(), this.onclose?.(new CloseEvent("close", {
			code: e,
			reason: t
		}));
	}
};
function c() {
	window.WebSocket = function(e, n) {
		console.log("[MockSDK] interceptWebSocket - new WebSocket called with url:", e), console.log("[MockSDK] interceptWebSocket - Available WS rules (urls):", t.map((e) => e.url));
		let r = t.filter((t) => t.url === e);
		return console.log("[MockSDK] interceptWebSocket - Matched rules count for url:", e, r.length), r.length > 0 ? new s(e, n, r) : new o(e, n);
	}, window.WebSocket.CONNECTING = o.CONNECTING, window.WebSocket.OPEN = o.OPEN, window.WebSocket.CLOSING = o.CLOSING, window.WebSocket.CLOSED = o.CLOSED;
}
async function l(n) {
	let r = `${n.baseURL || ""}/api/project/${n.projectKey}/rules`;
	try {
		let n = await fetch(r);
		if (!n.ok) throw Error(`HTTP ${n.status}`);
		let o = await n.json();
		e = o.filter((e) => e.type === "http" || !e.type), t = o.filter((e) => e.type === "ws"), i(), a(), c(), console.log(`[MockSDK] Loaded ${e.length} HTTP rules, ${t.length} WS rules`);
	} catch (e) {
		console.error("[MockSDK] Failed to load rules:", e);
	}
}
//#endregion
export { l as initMock };
