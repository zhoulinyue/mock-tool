import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { v4 as uuid } from 'uuid';

const adapter = new FileSync('db.json');
const db = low(adapter);

// 默认数据结构：项目列表
db.defaults({ projects: [] }).write();

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
  getAll: () => db.get('projects').value(),
  getByKey: (key: string) => db.get('projects').find({ key }).value(),
  create: (data: Partial<Project>) => {
    const project = { id: uuid(), rules: [], ...data };
    db.get('projects').push(project).write();
    return project;
  },
  update: (id: string, data: Partial<Project>) => {
    db.get('projects').find({ id }).assign(data).write();
  },
  remove: (id: string) => {
    db.get('projects').remove({ id }).write();
  }
};