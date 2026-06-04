<template>
  <div id="app">
    <el-button type="primary" @click="showAddProject">新建项目</el-button>
    <el-table :data="projects" style="margin-top:20px">
      <el-table-column prop="name" label="项目名称" />
      <el-table-column prop="key" label="唯一标识" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button size="small" @click="editRules(row)">规则</el-button>
          <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建项目对话框 -->
    <el-dialog v-model="addVisible" title="新建项目">
      <el-form :model="form">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="唯一键"><el-input v-model="form.key" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProject">确定</el-button>
      </template>
    </el-dialog>

    <!-- 规则管理对话框（可自行完善） -->
    <el-dialog v-model="ruleVisible" :title="'管理规则 - ' + currentProject?.name" width="700px">
      <el-button type="primary" @click="addRule">添加规则</el-button>
      <el-table :data="currentRules" style="margin-top:10px">
        <el-table-column prop="method" label="方法" />
        <el-table-column prop="url" label="URL" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="delRule(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getProjects, deleteProject, createProject, getRules, deleteRule, createRule } from './api';
import type { Project, MockRule } from './types';

const projects = ref<Project[]>([]);
const addVisible = ref(false);
const ruleVisible = ref(false);
const form = ref({ name: '', key: '' });
const currentProject = ref<Project | null>(null);
const currentRules = ref<MockRule[]>([]);

const loadProjects = async () => {
  const res = await getProjects();
  projects.value = res.data;
};

onMounted(loadProjects);

const showAddProject = () => {
  form.value = { name: '', key: '' };
  addVisible.value = true;
};

const submitProject = async () => {
  await createProject(form.value);
  addVisible.value = false;
  loadProjects();
};

const remove = async (id: string) => {
  await deleteProject(id);
  loadProjects();
};

const editRules = async (project: Project) => {
  currentProject.value = project;
  const res = await getRules(project.id);
  currentRules.value = res.data;
  ruleVisible.value = true;
};

const addRule = async () => {
  if (!currentProject.value) return;
  await createRule(currentProject.value.id, {
    method: 'GET',
    url: '/api/example',
    responseData: { message: 'mock data' },
    statusCode: 200
  });
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
};

const delRule = async (ruleId: string) => {
  if (!currentProject.value) return;
  await deleteRule(currentProject.value.id, ruleId);
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
};
</script>