export interface MockRule {
  id: string;
  method: string;
  url: string;
  responseData: any;
  statusCode: number;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  rules: MockRule[];
}