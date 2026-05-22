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
  method: string;        // GET / POST / PUT...
  url: string;           // 支持正则，如 /api/users
  responseData: any;     // 返回的 JSON 数据
  statusCode: number;    // 返回状态码
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