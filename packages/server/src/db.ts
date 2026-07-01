import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { v4 as uuid } from 'uuid';

interface Database {
  projects: Project[];
}

const adapter = new JSONFileSync<Database>('db.json');
const db = new LowSync<Database>(adapter, { projects: [] });

db.read();
if (!db.data) {
  db.data = { projects: [] };
}
// *mock规则字段
export interface MockRule {
  id: string;
  type: 'http' | 'ws';                 // 请求类型
  method?: string;                     // HTTP 方法 (GET/POST...)
  url: string;                           // HTTP 路径 或 WebSocket 连接路径
  wsMethod?: string;                   // WebSocket 消息 method
  // 模式：'static' 为直接返回固定数据，'proxy' 为代理并修改
  mode: 'static' | 'proxy';

  // 静态模式下的响应数据（mode=static 时使用）
  responseData?: any;                  // 静态模式返回数据
  statusCode: number;                  // 状态码
  // 代理模式配置（mode=proxy 时使用）
  proxyTarget?: string;                // 代理目标地址
  proxyReplacements?: {                // 字段替换规则
    path: string;
    value: any;
  }[];
}

export interface Project {
  id: string;
  name: string;          // 项目名称
  key: string;           // SDK 用到的唯一标识（projectKey）
  rules: MockRule[];
}
// *数据库操作
export const projectDB = {
  getAll: () => db.data!.projects,
  getByKey: (key: string) => db.data!.projects.find((project) => project.key === key),
  create: (data: Partial<Project>) => {
    const project: Project = { id: uuid(), rules: [], ...data } as Project;
    db.data!.projects.push(project);
    db.write();
    return project;
  },
  update: (id: string, data: Partial<Project>) => {
    const project = db.data!.projects.find((item) => item.id === id);
    if (project) {
      Object.assign(project, data);
      db.write();
    }
  },
  remove: (id: string) => {
    db.data!.projects = db.data!.projects.filter((project) => project.id !== id);
    db.write();
  }
};

export { db };