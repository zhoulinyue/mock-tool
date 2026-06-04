import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { v4 as uuid } from 'uuid';
const adapter = new JSONFileSync('db.json');
const db = new LowSync(adapter, { projects: [] });
db.read();
if (!db.data) {
    db.data = { projects: [] };
}
export const projectDB = {
    getAll: () => db.data.projects,
    getByKey: (key) => db.data.projects.find((project) => project.key === key),
    create: (data) => {
        const project = { id: uuid(), rules: [], ...data };
        db.data.projects.push(project);
        db.write();
        return project;
    },
    update: (id, data) => {
        const project = db.data.projects.find((item) => item.id === id);
        if (project) {
            Object.assign(project, data);
            db.write();
        }
    },
    remove: (id) => {
        db.data.projects = db.data.projects.filter((project) => project.id !== id);
        db.write();
    }
};
