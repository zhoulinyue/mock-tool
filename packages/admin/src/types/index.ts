interface ProxyReplacement {
  path: string;
  value: string;
}
export interface MockRule {
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

export interface Project {
  id: string;
  name: string;
  key: string;
  rules: MockRule[];
}