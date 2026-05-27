import axios from 'axios';
import type { Project, MockRule } from '../types';

const http = axios.create({ baseURL: '/' });

// 项目 API
export const getProjects = () => http.get<Project[]>('/api/projects');
export const createProject = (data: { name: string; key: string }) =>
  http.post<Project>('/api/projects', data);
export const deleteProject = (id: string) => http.delete(`/api/projects/${id}`);

// 规则 API
export const getRules = (projectId: string) =>
  http.get<MockRule[]>(`/api/projects/${projectId}/rules`);
export const createRule = (projectId: string, data: Partial<MockRule>) =>
  http.post<MockRule>(`/api/projects/${projectId}/rules`, data);
export const updateRule = (projectId: string, ruleId: string, data: Partial<MockRule>) =>
  http.put(`/api/projects/${projectId}/rules/${ruleId}`, data);
export const deleteRule = (projectId: string, ruleId: string) =>
  http.delete(`/api/projects/${projectId}/rules/${ruleId}`);