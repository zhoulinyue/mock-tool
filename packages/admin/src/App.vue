<template>
  <div id="app">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <span class="logo">⚡ Mock 平台</span>
      </div>
      <div class="header-right">
        <el-button text @click="showUsageGuide">📖 使用指南</el-button>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <el-button type="primary" @click="showAddProject">新建项目</el-button>
      <el-table :data="projects" style="margin-top: 20px">
        <el-table-column prop="name" label="项目名称" />
        <el-table-column prop="key" label="唯一标识" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button size="small" @click="editRules(row)">规则</el-button>
            <el-button size="small" type="danger" @click="remove(row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- 新建项目对话框 -->
      <el-dialog v-model="addProjectVisible" title="新建项目">
        <el-form :model="projectForm" label-position="left" label-width="80px">
          <el-form-item label="名称">
            <el-input v-model="projectForm.name" />
          </el-form-item>
          <el-form-item label="唯一键">
            <el-input v-model="projectForm.key" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addProjectVisible = false">取消</el-button>
          <el-button type="primary" @click="submitProject">确定</el-button>
        </template>
      </el-dialog>

      <!-- 规则管理对话框（手风琴模式） -->
      <el-dialog
        v-model="ruleVisible"
        :title="'管理规则 - ' + currentProject?.name"
        width="800px"
      >
        <el-button
          type="primary"
          @click="showAddRule"
          style="margin-bottom: 15px"
          >添加规则</el-button
        >

        <el-collapse v-model="activeRuleIds" accordion>
          <el-collapse-item
            v-for="rule in currentRules"
            :key="rule.id"
            :name="rule.id"
          >
            <!-- 标题栏 -->
            <template #title>
              <div class="rule-title">
                <el-tag :type="methodTagType(rule.method)" size="small">{{
                  rule.method
                }}</el-tag>
                <span class="rule-url">{{ rule.url }}</span>
                <el-tag type="info" size="small"
                  >状态码 {{ rule.statusCode }}</el-tag
                >
                <div class="rule-actions" @click.stop>
                  <el-button size="small" text @click="editRule(rule.id)"
                    >编辑</el-button
                  >
                  <el-button
                    size="small"
                    text
                    type="danger"
                    @click="delRule(rule.id)"
                    >删除</el-button
                  >
                </div>
              </div>
            </template>

            <!-- 展开内容 -->
            <div v-if="editingRuleId === rule.id && editingRule">
              <el-form :model="editingRule" label-width="100px">
                <el-form-item label="请求方法">
                  <el-select v-model="editingRule.method">
                    <el-option label="GET" value="GET" />
                    <el-option label="POST" value="POST" />
                    <el-option label="PUT" value="PUT" />
                    <el-option label="DELETE" value="DELETE" />
                    <el-option label="PATCH" value="PATCH" />
                  </el-select>
                </el-form-item>
                <el-form-item label="URL">
                  <el-input v-model="editingRule.url" />
                </el-form-item>
                <el-form-item label="响应数据">
                  <Codemirror
                    v-model="editingRule.responseDataStr"
                    :extensions="jsonExtensions"
                    :style="{ height: '120px', width: '100%' }"
                    placeholder='{"key":"value"}'
                    :tabSize="2"
                  />
                </el-form-item>
                <el-form-item label="状态码">
                  <el-input-number
                    v-model="editingRule.statusCode"
                    :min="100"
                    :max="599"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveRule"
                    >保存修改</el-button
                  >
                  <el-button @click="cancelEdit">取消</el-button>
                </el-form-item>
              </el-form>
            </div>
            <div v-else class="rule-detail">
              <div class="detail-row">
                <span class="detail-label">请求方法：</span>
                <el-tag :type="methodTagType(rule.method)" size="small">{{
                  rule.method
                }}</el-tag>
              </div>
              <div class="detail-row">
                <span class="detail-label">URL：</span>
                <code>{{ rule.url }}</code>
              </div>
              <div class="detail-row">
                <span class="detail-label">状态码：</span>
                <span>{{ rule.statusCode }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">响应数据：</span>
              </div>
              <pre class="json-preview">{{
                JSON.stringify(rule.responseData, null, 2)
              }}</pre>
              <el-button size="small" type="primary" @click="editRule(rule.id)"
                >编辑</el-button
              >
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-dialog>

      <!-- 新增规则对话框 -->
      <el-dialog v-model="addRuleVisible" title="添加规则" width="500px">
        <el-form :model="ruleForm" label-width="100px">
          <el-form-item label="请求方法">
            <el-select v-model="ruleForm.method">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="PATCH" value="PATCH" />
            </el-select>
          </el-form-item>
          <el-form-item label="URL">
            <el-input v-model="ruleForm.url" />
          </el-form-item>
          <el-form-item label="响应数据">
            <Codemirror
              v-model="ruleForm.responseData"
              :extensions="jsonExtensions"
              :style="{ height: '120px', width: '100%' }"
              placeholder='{"key":"value"}'
              :tabSize="2"
            />
          </el-form-item>
          <el-form-item label="状态码">
            <el-input-number
              v-model="ruleForm.statusCode"
              :min="100"
              :max="599"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addRuleVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddRule">确定</el-button>
        </template>
      </el-dialog>

      <!-- 使用指南弹窗 -->
      <el-dialog
        v-model="usageVisible"
        title="📘 Mock 工具使用指南"
        width="650px"
        :close-on-click-modal="false"
      >
        <div class="usage-content">
          <h4>1. 创建项目</h4>
          <p>
            点击“新建项目”，输入名称和唯一标识（例如
            <code>test-project</code>）。
          </p>

          <h4>2. 配置接口规则</h4>
          <p>在项目操作列点击“规则”，进入规则管理。添加规则时填写：</p>
          <ul>
            <li><b>请求方法</b>：GET / POST / PUT / DELETE 等。</li>
            <li>
              <b>URL</b>：需要拦截的接口路径，支持正则（如
              <code>/api/user/\d+</code>）。
            </li>
            <li><b>响应数据</b>：JSON 格式的假数据。</li>
            <li><b>状态码</b>：返回的 HTTP 状态码，默认 200。</li>
          </ul>

          <h4>3. 在前端项目中引入 SDK</h4>
          <p>
            将构建好的
            <code>mock-interceptor-sdk.umd.js</code> 引入你的项目，并初始化：
          </p>
          <pre class="usage-code">
MockInterceptorSDK.initMock({
  projectKey: 'test-project',    // 与平台中的唯一标识一致
  baseURL: 'http://localhost:3001'  // 管理后台地址
});</pre
          >

          <h4>4. 正常发起请求</h4>
          <p>
            初始化后，所有匹配规则的请求都会被拦截并返回配置的假数据，不会到达真实服务器。
          </p>

          <h4>5. 验证</h4>
          <p>
            打开浏览器控制台，如果看到输出 “Mock
            规则加载完成”，且业务请求返回了假数据，即表示成功。
          </p>
        </div>
        <template #footer>
          <el-button type="primary" @click="usageVisible = false"
            >知道了</el-button
          >
        </template>
      </el-dialog>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  getProjects,
  deleteProject,
  createProject,
  getRules,
  deleteRule,
  createRule,
  updateRule,
} from "./api";
import type { Project, MockRule } from "./types";
import { Codemirror } from "vue-codemirror"; // 注意是具名导出
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

const jsonExtensions = [json(), oneDark];

// --- 布局相关 ---
const usageVisible = ref(false);
const showUsageGuide = () => {
  usageVisible.value = true;
};

// --- 项目相关 ---
const projects = ref<Project[]>([]);
const addProjectVisible = ref(false);
const projectForm = ref({ name: "", key: "" });

const loadProjects = async () => {
  const res = await getProjects();
  projects.value = res.data;
};
onMounted(loadProjects);

const showAddProject = () => {
  projectForm.value = { name: "", key: "" };
  addProjectVisible.value = true;
};
const submitProject = async () => {
  await createProject(projectForm.value);
  addProjectVisible.value = false;
  loadProjects();
};
const remove = async (id: string) => {
  await deleteProject(id);
  loadProjects();
};

// --- 规则管理（手风琴） ---
const ruleVisible = ref(false);
const currentProject = ref<Project | null>(null);
const currentRules = ref<MockRule[]>([]);
const activeRuleIds = ref<string[]>([]);
const editingRuleId = ref<string | null>(null);
const editingRule = ref<{
  id: string;
  method: string;
  url: string;
  responseDataStr: string;
  statusCode: number;
} | null>(null);

const editRules = async (project: Project) => {
  currentProject.value = project;
  const res = await getRules(project.id);
  currentRules.value = res.data;
  activeRuleIds.value = [];
  cancelEdit();
  ruleVisible.value = true;
};
const delRule = async (ruleId: string) => {
  if (!currentProject.value) return;
  await deleteRule(currentProject.value.id, ruleId);
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
  if (editingRuleId.value === ruleId) cancelEdit();
};
const editRule = (ruleId: string) => {
  const rule = currentRules.value.find((r) => r.id === ruleId);
  if (!rule) return;
  activeRuleIds.value = [ruleId];
  editingRule.value = {
    id: rule.id,
    method: rule.method,
    url: rule.url,
    responseDataStr: JSON.stringify(rule.responseData, null, 2),
    statusCode: rule.statusCode,
  };
  editingRuleId.value = rule.id;
};
const cancelEdit = () => {
  editingRuleId.value = null;
  editingRule.value = null;
};
const saveRule = async () => {
  if (!currentProject.value || !editingRule.value) return;
  let parsedData: any;
  try {
    parsedData = JSON.parse(editingRule.value.responseDataStr);
  } catch {
    ElMessage.error("响应数据不是合法的 JSON 格式");
    return;
  }
  await updateRule(currentProject.value.id, editingRule.value.id, {
    method: editingRule.value.method,
    url: editingRule.value.url,
    responseData: parsedData,
    statusCode: editingRule.value.statusCode,
  });
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
  ElMessage.success("规则已更新");
  cancelEdit();
  activeRuleIds.value = [];
};
const methodTagType = (method: string) => {
  switch (method.toUpperCase()) {
    case "GET":
      return "success";
    case "POST":
      return "primary";
    case "PUT":
      return "warning";
    case "DELETE":
      return "danger";
    default:
      return "info";
  }
};

// --- 新增规则 ---
const addRuleVisible = ref(false);
const ruleForm = ref({
  method: "GET",
  url: "",
  responseData: "",
  statusCode: 200,
});
const showAddRule = () => {
  ruleForm.value = {
    method: "GET",
    url: "",
    responseData: "",
    statusCode: 200,
  };
  addRuleVisible.value = true;
};
const submitAddRule = async () => {
  if (!currentProject.value) return;
  let parsedData: any;
  try {
    parsedData = JSON.parse(ruleForm.value.responseData);
  } catch {
    ElMessage.error("响应数据不是合法的 JSON 格式");
    return;
  }
  await createRule(currentProject.value.id, {
    method: ruleForm.value.method,
    url: ruleForm.value.url,
    responseData: parsedData,
    statusCode: ruleForm.value.statusCode,
  });
  addRuleVisible.value = false;
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
  ElMessage.success("规则添加成功");
};
</script>

<style scoped>
/* 整体布局 */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--el-bg-color-page, #f5f6f7);
}

/* 顶部导航 */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-light, #e5e6eb);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.header-left .logo {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary, #3370ff);
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 主内容区 */
.app-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 24px auto;
  padding: 0 24px;
  overflow: auto;
}

/* 使用指南弹窗样式 */
.usage-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}
.usage-content h4 {
  margin: 16px 0 6px;
  color: var(--el-text-color-primary);
}
.usage-content p {
  margin: 4px 0;
}
.usage-content ul {
  padding-left: 20px;
}
.usage-code {
  background: #f5f6f7;
  padding: 12px;
  border-radius: 6px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

/* 手风琴相关样式 */
.rule-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.rule-url {
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.rule-actions {
  margin-left: auto;
}
.rule-detail {
  padding: 8px 0;
}
.detail-row {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.detail-label {
  font-weight: 500;
  width: 72px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.json-preview {
  background: #f5f6f7;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  max-height: 200px;
  overflow: auto;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
</style>
