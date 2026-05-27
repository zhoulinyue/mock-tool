interface MockRule {
  id: string;
  method: string;
  url: string;
  responseData: any;
  statusCode: number;
}

let rules: MockRule[] = [];

/**
 * 初始化 Mock SDK
 * @param projectKey  项目唯一标识，对应管理平台中设置的 key
 * @param baseURL     管理后端地址，默认当前域名
 */
export async function initMock(options: { projectKey: string; baseURL?: string }) {
  const base = options.baseURL || '';
  const url = `${base}/api/project/${options.projectKey}/rules`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`[Mock SDK] 获取规则失败，Status: ${response.status}`);
    return;
  }
  rules = await response.json();
  interceptFetch();
  interceptXHR();
}

/** 简单匹配：method + 正则匹配 URL */
function findRule(method: string, requestUrl: string): MockRule | undefined {
  return rules.find(rule => {
    const sameMethod = rule.method.toUpperCase() === method.toUpperCase();
    let urlMatch = false;
    try {
      urlMatch = new RegExp(rule.url).test(requestUrl);
    } catch {
      urlMatch = rule.url === requestUrl;
    }
    return sameMethod && urlMatch;
  });
}

/** 拦截 fetch */
function interceptFetch() {
  const { fetch: originalFetch } = window;
  window.fetch = async function (input: RequestInfo, init?: RequestInit) {
    const request = new Request(input, init);
    const url = request.url;
    const method = request.method;
    const rule = findRule(method, url);
    if (rule) {
      const body =
        typeof rule.responseData === 'object'
          ? JSON.stringify(rule.responseData)
          : rule.responseData;
      return new Response(body, {
        status: rule.statusCode || 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch.call(window, input, init);
  };
}

/** 拦截 XMLHttpRequest */
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
    const rule = findRule((self as any)._mockMethod, (self as any)._mockUrl);
    if (rule) {
      // 模拟异步返回
      setTimeout(() => {
        Object.defineProperty(self, 'readyState', { value: 4, writable: true });
        Object.defineProperty(self, 'status', { value: rule.statusCode || 200, writable: true });
        Object.defineProperty(self, 'responseText', {
          value:
            typeof rule.responseData === 'object'
              ? JSON.stringify(rule.responseData)
              : rule.responseData,
          writable: true
        });
        if (self.onreadystatechange) self.onreadystatechange(new Event('readystatechange'));
        if (self.onload) self.onload(new Event('load'));
      }, 10);
      return;
    }
    return originalSend.apply(self, arguments as any);
  };
}