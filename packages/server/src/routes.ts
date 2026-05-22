import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { projectDB, Project  } from './db.ts';

const router = Router();

// =========== 项目管理 CRUD ===========
router.get('/api/projects', (req, res) => {
  res.json(projectDB.getAll());
});

router.post('/api/projects', (req, res) => {
  const { name, key } = req.body;
  if (!name || !key) return res.status(400).json({ error: 'name and key required' });
  const project = projectDB.create({ name, key });
  res.json(project);
});

router.put('/api/projects/:id', (req, res) => {
  projectDB.update(req.params.id, req.body);
  res.json({ success: true });
});

router.delete('/api/projects/:id', (req, res) => {
  projectDB.remove(req.params.id);
  res.json({ success: true });
});

// =========== SDK 专用：根据 key 拉取全部 mock 规则 ===========
router.get('/api/project/:key/rules', (req, res) => {
  const project = projectDB.getByKey(req.params.key);
  if (!project) return res.status(404).json({ error: 'project not found' });
  res.json(project.rules);
});

// =========== 规则 CRUD（嵌套在项目下） ===========
router.post('/api/projects/:id/rules', (req, res) => {
  const project = projectDB.getAll().find((p: Project) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  const rule = { id: uuid(), ...req.body };
  project.rules.push(rule);
  // 需要更新整个项目写回
  projectDB.update(req.params.id, { rules: project.rules });
  res.json(rule);
});

router.put('/api/projects/:id/rules/:ruleId', (req, res) => {
  const project = projectDB.getAll().find((p: Project) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  const rule = project.rules.find((r: any) => r.id === req.params.ruleId);
  if (!rule) return res.status(404).end();
  Object.assign(rule, req.body);
  projectDB.update(req.params.id, { rules: project.rules });
  res.json(rule);
});

router.delete('/api/projects/:id/rules/:ruleId', (req, res) => {
  const project = projectDB.getAll().find((p: Project) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  project.rules = project.rules.filter((r: any) => r.id !== req.params.ruleId);
  projectDB.update(req.params.id, { rules: project.rules });
  res.json({ success: true });
});

export default router;