interface MockRule {
  id: string;
  type: 'http' | 'ws';
  method?: string;
  url: string;
  wsMethod?: string;
  mode: 'static' | 'proxy';
  responseData?: any;
  statusCode: number;
  proxyTarget?: string;
  proxyReplacements?: { path: string; value: any }[];
}

let httpRules: MockRule[] = [];
let wsRules: MockRule[] = [];

// 工具：按点分隔路径设置对象值
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// HTTP 拦截部分
function matchHttpRule(method: string, requestUrl: string): MockRule | undefined {
  return httpRules.find(rule => {
    if (rule.type !== 'http') return false;
    if (rule.method && rule.method.toUpperCase() !== method.toUpperCase()) return false;
    try {
      return new RegExp(rule.url).test(requestUrl);
    } catch {
      return rule.url === requestUrl;
    }
  });
}

function interceptFetch() {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo, init?: RequestInit) {
    const request = new Request(input, init);
    const url = request.url;
    const method = request.method;
    const rule = matchHttpRule(method, url);
    if (rule) {
      if (rule.mode === 'proxy' && rule.proxyTarget) {
        try {
          const realResponse = await originalFetch(rule.proxyTarget, init);
          let data = await realResponse.json();
          if (rule.proxyReplacements) {
            for (const rep of rule.proxyReplacements) {
              setNestedValue(data, rep.path, rep.value);
            }
          }
          return new Response(JSON.stringify(data), {
            status: rule.statusCode || realResponse.status,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          console.error('[MockSDK] HTTP proxy error', err);
          return new Response(JSON.stringify({ error: 'Proxy failed' }), { status: 502 });
        }
      } else {
        // 静态模式
        const body = typeof rule.responseData === 'object'
          ? JSON.stringify(rule.responseData)
          : rule.responseData;
        return new Response(body, {
          status: rule.statusCode || 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return originalFetch.call(window, input, init);
  };
}

function interceptXHR() {
  const XHR = window.XMLHttpRequest;
  const originalOpen = XHR.prototype.open;
  const originalSend = XHR.prototype.send;

  XHR.prototype.open = function (method: string, url: string) {
    (this as any)._mockMethod = method;
    (this as any)._mockUrl = url;
    return originalOpen.apply(this, arguments as any);
  };

  XHR.prototype.send = function (body) {
    const self = this;
    const rule = matchHttpRule((self as any)._mockMethod, (self as any)._mockUrl);
    if (rule) {
      if (rule.mode === 'proxy' && rule.proxyTarget) {
        // XHR 代理简化：使用 fetch 实现，然后触发 XHR 事件
        const proxyReq = new XMLHttpRequest();
        proxyReq.open((self as any)._mockMethod, rule.proxyTarget, true);
        proxyReq.onload = function () {
          let data = JSON.parse(proxyReq.responseText);
          if (rule.proxyReplacements) {
            for (const rep of rule.proxyReplacements) {
              setNestedValue(data, rep.path, rep.value);
            }
          }
          Object.defineProperty(self, 'readyState', { value: 4, writable: true });
          Object.defineProperty(self, 'status', { value: rule.statusCode || proxyReq.status, writable: true });
          Object.defineProperty(self, 'responseText', {
            value: JSON.stringify(data),
            writable: true
          });
          if (self.onreadystatechange) self.onreadystatechange(new Event('readystatechange'));
          if (self.onload) self.onload(new Event('load'));
        };
        proxyReq.onerror = function () {
          console.error('[MockSDK] XHR proxy error');
        };
        proxyReq.send(body);
        return;
      } else {
        // 静态模式
        const responseText = typeof rule.responseData === 'object'
          ? JSON.stringify(rule.responseData)
          : rule.responseData;
        setTimeout(() => {
          Object.defineProperty(self, 'readyState', { value: 4, writable: true });
          Object.defineProperty(self, 'status', { value: rule.statusCode || 200, writable: true });
          Object.defineProperty(self, 'responseText', { value: responseText, writable: true });
          if (self.onreadystatechange) self.onreadystatechange(new Event('readystatechange'));
          if (self.onload) self.onload(new Event('load'));
        }, 10);
        return;
      }
    }
    return originalSend.apply(self, arguments as any);
  };
}

// WebSocket 拦截部分
const OriginalWebSocket = window.WebSocket;

class FakeWebSocket {
  url: string;
  readyState: number = 0;
  onopen: ((ev: Event) => any) | null = null;
  onmessage: ((ev: MessageEvent) => any) | null = null;
  onclose: ((ev: CloseEvent) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;

  private rules: MockRule[];
  private realSocket?: WebSocket;

  constructor(url: string, protocols?: string | string[], matchedRules: MockRule[] = []) {
    this.url = url;
    this.rules = matchedRules;
    console.log('[MockSDK] FakeWebSocket - instance created for url:', url, 'with', matchedRules.length, 'matched rules');
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    console.log('[MockSDK] FakeWebSocket.send - received data:', data);
    let msg: any;
    try {
      msg = JSON.parse(data);
      console.log('[MockSDK] FakeWebSocket.send - parsed message method:', msg.method);
    } catch {
      console.log('[MockSDK] FakeWebSocket.send - data is not JSON, passing to real socket');
      this.ensureRealSocket();
      this.realSocket?.send(data);
      return;
    }

    const rule = this.rules.find(r => {
      console.log('[MockSDK] FakeWebSocket.send - attempting to match rule.wsMethod:', r.wsMethod, 'with msg.method:', msg.method);
      return r.wsMethod === msg.method;
    });
    if (rule) {
      console.log('[MockSDK] FakeWebSocket.send - rule matched!', rule.id);
      if (rule.mode === 'static') {
        // 静态模式
        const response = {
          id: msg.id,
          ...JSON.parse(JSON.stringify(rule.responseData))
        };
        setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(response) }));
        }, 50);
      } else if (rule.mode === 'proxy' && rule.proxyTarget) {
        this.handleProxy(msg, rule);
      }
    } else {
      console.log('[MockSDK] FakeWebSocket.send - no rule matched for method:', msg.method, ', passing to real socket');
      this.ensureRealSocket();
      this.realSocket?.send(data);
    }
  }

  private handleProxy(msg: any, rule: MockRule) {
    const proxyWs = new OriginalWebSocket(rule.proxyTarget!);
    proxyWs.onopen = () => proxyWs.send(JSON.stringify(msg));
    proxyWs.onmessage = (event) => {
      let data = JSON.parse(event.data);
      if (rule.proxyReplacements) {
        for (const rep of rule.proxyReplacements) {
          setNestedValue(data, rep.path, rep.value);
        }
      }
      this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
      proxyWs.close();
    };
    proxyWs.onerror = (err) => {
      console.error('[MockSDK] WebSocket proxy error', err);
    };
  }

  private ensureRealSocket() {
    if (!this.realSocket || this.realSocket.readyState > 1) {
      this.realSocket = new OriginalWebSocket(this.url);
      this.realSocket.onmessage = (event) => {
        this.onmessage?.(new MessageEvent('message', { data: event.data }));
      };
      this.realSocket.onclose = (ev) => {
        this.readyState = 3;
        this.onclose?.(ev);
      };
      this.realSocket.onerror = (ev) => this.onerror?.(ev);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = 3;
    this.realSocket?.close();
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

function interceptWebSocket() {
  window.WebSocket = function (url: string, protocols?: string | string[]) {
    console.log('[MockSDK] interceptWebSocket - new WebSocket called with url:', url);
    console.log('[MockSDK] interceptWebSocket - Available WS rules (urls):', wsRules.map(r => r.url));
    
    const matched = wsRules.filter(r => r.url === url);
    console.log('[MockSDK] interceptWebSocket - Matched rules count for url:', url, matched.length);
    if (matched.length > 0) {
      return new FakeWebSocket(url, protocols, matched) as any;
    }
    return new OriginalWebSocket(url, protocols);
  } as any;

  (window.WebSocket as any).CONNECTING = OriginalWebSocket.CONNECTING;
  (window.WebSocket as any).OPEN = OriginalWebSocket.OPEN;
  (window.WebSocket as any).CLOSING = OriginalWebSocket.CLOSING;
  (window.WebSocket as any).CLOSED = OriginalWebSocket.CLOSED;
}

// 初始化入口
export async function initMock(options: { projectKey: string; baseURL?: string }) {
  const base = options.baseURL || '';
  const url = `${base}/api/project/${options.projectKey}/rules`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const allRules: MockRule[] = await response.json();
    httpRules = allRules.filter(r => r.type === 'http' || !r.type);
    wsRules = allRules.filter(r => r.type === 'ws');
    interceptFetch();
    interceptXHR();
    interceptWebSocket();
    console.log(`[MockSDK] Loaded ${httpRules.length} HTTP rules, ${wsRules.length} WS rules`);
  } catch (err) {
    console.error('[MockSDK] Failed to load rules:', err);
  }
}