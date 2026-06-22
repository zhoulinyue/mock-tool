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

export interface MockRule {
  id: string;
  method: string;
  url: string;

  // 模式：'static' 为直接返回固定数据，'proxy' 为代理并修改
  mode: 'static' | 'proxy';

  // 静态模式下的响应数据（mode=static 时使用）
  responseData?: any;
  statusCode: number;

  // 代理模式配置（mode=proxy 时使用）
  proxyTarget?: string;          // 真实接口地址，如 https://api.example.com/user/1
  proxyReplacements?: {          // 字段替换列表
    path: string;                // 要替换的字段路径，如 "data.name" 或 "result.age"
    value: any;                  // 替换后的值
  }[];
}

export interface Project {
  id: string;
  name: string;          // 项目名称
  key: string;           // SDK 用到的唯一标识（projectKey）
  rules: MockRule[];
}

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