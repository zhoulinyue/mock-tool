interface ProxyReplacement {
  path: string;
  value: string;
}
export interface MockRule {
  id: string;
  method: string;
  url: string;
  responseData: any;
  statusCode: number;
  mode: "static" | "proxy";
  proxyTarget?: string;
  proxyReplacements?: ProxyReplacement[];
}

export interface Project {
  id: string;
  name: string;
  key: string;
  rules: MockRule[];
}