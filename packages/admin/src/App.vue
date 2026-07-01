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
      <el-dialog
        v-model="addProjectVisible"
        title="新建项目"
        lock-scroll="false"
      >
        <el-form :model="projectForm">
          <el-form-item label="名称"
            ><el-input v-model="projectForm.name"
          /></el-form-item>
          <el-form-item label="唯一键"
            ><el-input v-model="projectForm.key"
          /></el-form-item>
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
        lock-scroll="false"
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
                <el-tag :type="typeTagType(rule.type)" size="small">{{
                  rule.type.toUpperCase()
                }}</el-tag>
                <el-tag
                  v-if="rule.type === 'http'"
                  :type="methodTagType(rule.method!)"
                  size="small"
                  >{{ rule.method }}</el-tag
                >
                <span class="rule-url">{{ rule.url }}</span>
                <template v-if="rule.type === 'ws'">
                  <el-tag type="warning" size="small"
                    >method: {{ rule.wsMethod }}</el-tag
                  >
                </template>
                <el-tag
                  :type="rule.mode === 'static' ? 'success' : 'primary'"
                  size="small"
                  >{{ rule.mode === "static" ? "静态" : "代理" }}</el-tag
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
                <el-form-item label="请求类型">
                  <el-radio-group v-model="editingRule.type">
                    <el-radio value="http">HTTP</el-radio>
                    <el-radio value="ws">WebSocket</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item
                  v-if="editingRule.type === 'http'"
                  label="HTTP 方法"
                >
                  <el-select v-model="editingRule.method">
                    <el-option label="GET" value="GET" />
                    <el-option label="POST" value="POST" />
                    <el-option label="PUT" value="PUT" />
                    <el-option label="DELETE" value="DELETE" />
                    <el-option label="PATCH" value="PATCH" />
                  </el-select>
                </el-form-item>
                <el-form-item label="URL/路径">
                  <el-input v-model="editingRule.url" />
                </el-form-item>
                <el-form-item
                  v-if="editingRule.type === 'ws'"
                  label="消息 method"
                >
                  <el-input
                    v-model="editingRule.wsMethod"
                    placeholder="Refoss.DeviceInfo.Get"
                  />
                </el-form-item>

                <el-form-item label="Mock 模式">
                  <el-radio-group v-model="editingRule.mode">
                    <el-radio value="static">静态数据</el-radio>
                    <el-radio value="proxy">代理转发并修改</el-radio>
                  </el-radio-group>
                </el-form-item>

                <!-- 静态模式 -->
                <template v-if="editingRule.mode === 'static'">
                  <el-form-item label="响应数据">
                    <Codemirror
                      v-model="editingRule.responseDataStr"
                      :extensions="jsonExtensions"
                      :style="{ height: '120px', width: '100%' }"
                      placeholder='{"key":"value"}'
                      :tabSize="2"
                    />
                    <el-button
                      size="small"
                      @click="formatJson(editingRule, 'responseDataStr')"
                      >格式化</el-button
                    >
                  </el-form-item>
                  <el-form-item label="状态码">
                    <el-input-number
                      v-model="editingRule.statusCode"
                      :min="100"
                      :max="599"
                    />
                  </el-form-item>
                </template>

                <!-- 代理模式 -->
                <template v-if="editingRule.mode === 'proxy'">
                  <el-form-item label="代理目标">
                    <el-input
                      v-model="editingRule.proxyTarget"
                      placeholder="http://或 wss://"
                    />
                  </el-form-item>
                  <el-form-item label="字段替换">
                    <div
                      v-for="(rep, i) in editingRule.proxyReplacements"
                      :key="i"
                      style="display: flex; gap: 8px; margin-bottom: 6px"
                    >
                      <el-input
                        v-model="rep.path"
                        placeholder="路径 如 data.name"
                        style="flex: 1"
                      />
                      <el-input
                        v-model="rep.value"
                        placeholder="新值"
                        style="flex: 1"
                      />
                      <el-button
                        size="small"
                        type="danger"
                        @click="editingRule.proxyReplacements.splice(i, 1)"
                        >删除</el-button
                      >
                    </div>
                    <el-button
                      size="small"
                      @click="
                        editingRule.proxyReplacements.push({
                          path: '',
                          value: '',
                        })
                      "
                      >添加替换</el-button
                    >
                  </el-form-item>
                </template>

                <el-form-item>
                  <el-button type="primary" @click="saveRule"
                    >保存修改</el-button
                  >
                  <el-button @click="cancelEdit">取消</el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 只读详情 -->
            <div v-else class="rule-detail">
              <div class="detail-row">
                <span class="detail-label">类型：</span
                ><el-tag :type="typeTagType(rule.type)" size="small">{{
                  rule.type
                }}</el-tag>
              </div>
              <div v-if="rule.type === 'http'" class="detail-row">
                <span class="detail-label">方法：</span>{{ rule.method }}
              </div>
              <div class="detail-row">
                <span class="detail-label">URL：</span
                ><code>{{ rule.url }}</code>
              </div>
              <div v-if="rule.type === 'ws'" class="detail-row">
                <span class="detail-label">消息方法：</span>{{ rule.wsMethod }}
              </div>
              <div class="detail-row">
                <span class="detail-label">模式：</span
                >{{ rule.mode === "static" ? "静态" : "代理" }}
              </div>
              <div v-if="rule.mode === 'static'" class="detail-row">
                <span class="detail-label">响应：</span>
              </div>
              <pre v-if="rule.mode === 'static'" class="json-preview">{{
                JSON.stringify(rule.responseData, null, 2)
              }}</pre>
              <div v-if="rule.mode === 'proxy'" class="detail-row">
                <span class="detail-label">代理目标：</span
                >{{ rule.proxyTarget }}
              </div>
              <el-button size="small" type="primary" @click="editRule(rule.id)"
                >编辑</el-button
              >
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-dialog>

      <!-- 新增规则对话框 -->
      <el-dialog
        v-model="addRuleVisible"
        title="添加规则"
        width="600px"
        lock-scroll="false"
      >
        <el-form :model="ruleForm" label-width="100px">
          <el-form-item label="请求类型">
            <el-radio-group v-model="ruleForm.type">
              <el-radio value="http">HTTP</el-radio>
              <el-radio value="ws">WebSocket</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="ruleForm.type === 'http'" label="HTTP 方法">
            <el-select v-model="ruleForm.method">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="PATCH" value="PATCH" />
            </el-select>
          </el-form-item>
          <el-form-item label="URL/路径">
            <el-input v-model="ruleForm.url" />
          </el-form-item>
          <el-form-item v-if="ruleForm.type === 'ws'" label="消息 method">
            <el-input v-model="ruleForm.wsMethod" />
          </el-form-item>

          <el-form-item label="Mock 模式">
            <el-radio-group v-model="ruleForm.mode">
              <el-radio value="static">静态数据</el-radio>
              <el-radio value="proxy">代理转发并修改</el-radio>
            </el-radio-group>
          </el-form-item>

          <template v-if="ruleForm.mode === 'static'">
            <el-form-item label="响应数据">
              <Codemirror
                v-model="ruleForm.responseData"
                :extensions="jsonExtensions"
                :style="{ height: '120px', width: '100%' }"
                placeholder='{"key":"value"}'
                :tabSize="2"
              />
              <el-button
                size="small"
                @click="formatJson(ruleForm, 'responseData')"
                >格式化</el-button
              >
            </el-form-item>
            <el-form-item label="状态码">
              <el-input-number
                v-model="ruleForm.statusCode"
                :min="100"
                :max="599"
              />
            </el-form-item>
          </template>

          <template v-if="ruleForm.mode === 'proxy'">
            <el-form-item label="代理目标">
              <el-input v-model="ruleForm.proxyTarget" />
            </el-form-item>
            <el-form-item label="字段替换">
              <div
                v-for="(rep, i) in ruleForm.proxyReplacements"
                :key="i"
                style="display: flex; gap: 8px; margin-bottom: 6px"
              >
                <el-input
                  v-model="rep.path"
                  placeholder="路径"
                  style="flex: 1"
                />
                <el-input
                  v-model="rep.value"
                  placeholder="新值"
                  style="flex: 1"
                />
                <el-button
                  size="small"
                  type="danger"
                  @click="ruleForm.proxyReplacements.splice(i, 1)"
                  >删除</el-button
                >
              </div>
              <el-button
                size="small"
                @click="
                  ruleForm.proxyReplacements.push({ path: '', value: '' })
                "
                >添加替换</el-button
              >
            </el-form-item>
          </template>
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
        lock-scroll="false"
        :close-on-click-modal="false"
      >
        <div class="usage-content">
          <h4>1. 创建项目</h4>
          <p>
            点击“新建项目”，输入名称和唯一标识（例如
            <code>test-project</code>）。
          </p>
          <h4>2. 配置接口规则</h4>
          <p>
            支持 HTTP 和 WebSocket 两种请求类型，静态数据或代理转发+字段替换。
          </p>
          <h4>3. 在前端项目中引入 SDK</h4>
          <pre class="usage-code">
MockInterceptorSDK.initMock({
  projectKey: 'test-project',
  baseURL: 'http://localhost:3001'
});</pre
          >
          <h4>4. 验证</h4>
          <p>打开浏览器控制台，请求会被拦截并返回配置的数据。</p>
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
import { Codemirror } from "vue-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
const jsonExtensions = [json(), oneDark];

// ---- 布局相关 ----
const usageVisible = ref(false);
const showUsageGuide = () => {
  usageVisible.value = true;
};

// ---- 项目相关 ----
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

// ---- 规则管理 ----
const ruleVisible = ref(false);
const currentProject = ref<Project | null>(null);
const currentRules = ref<MockRule[]>([]);
const activeRuleIds = ref<string[]>([]);

const editingRuleId = ref<string | null>(null);
const editingRule = ref<any>(null);

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
    type: rule.type || "http",
    method: rule.method || "",
    url: rule.url,
    wsMethod: rule.wsMethod || "",
    mode: rule.mode || "static",
    responseDataStr: JSON.stringify(rule.responseData, null, 2) || "",
    statusCode: rule.statusCode || 200,
    proxyTarget: rule.proxyTarget || "",
    proxyReplacements: (rule.proxyReplacements || []).map((rep) => ({
      path: rep.path,
      value:
        typeof rep.value === "string" ? rep.value : JSON.stringify(rep.value),
    })),
  };
  editingRuleId.value = rule.id;
};

const cancelEdit = () => {
  editingRuleId.value = null;
  editingRule.value = null;
};

const saveRule = async () => {
  if (!currentProject.value || !editingRule.value) return;

  const payload: any = {
    type: editingRule.value.type,
    method:
      editingRule.value.type === "http" ? editingRule.value.method : undefined,
    url: editingRule.value.url,
    wsMethod:
      editingRule.value.type === "ws" ? editingRule.value.wsMethod : undefined,
    mode: editingRule.value.mode,
    statusCode: editingRule.value.statusCode,
  };

  if (editingRule.value.mode === "static") {
    try {
      payload.responseData = JSON.parse(editingRule.value.responseDataStr);
    } catch {
      ElMessage.error("响应数据不是合法的 JSON 格式");
      return;
    }
  } else {
    payload.proxyTarget = editingRule.value.proxyTarget;
    payload.proxyReplacements = editingRule.value.proxyReplacements.map(
      (rep: any) => ({
        path: rep.path,
        value: tryParseJSON(rep.value),
      }),
    );
  }

  await updateRule(currentProject.value.id, editingRule.value.id, payload);
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
  ElMessage.success("规则已更新");
  cancelEdit();
  activeRuleIds.value = [];
};

// ---- 新增规则 ----
const addRuleVisible = ref(false);
const ruleForm = ref<any>({
  type: "http",
  method: "GET",
  url: "",
  wsMethod: "",
  mode: "static",
  responseData: "",
  statusCode: 200,
  proxyTarget: "",
  proxyReplacements: [],
});

const showAddRule = () => {
  ruleForm.value = {
    type: "http",
    method: "GET",
    url: "",
    wsMethod: "",
    mode: "static",
    responseData: "",
    statusCode: 200,
    proxyTarget: "",
    proxyReplacements: [],
  };
  addRuleVisible.value = true;
};

const submitAddRule = async () => {
  if (!currentProject.value) return;

  const payload: any = {
    type: ruleForm.value.type,
    method: ruleForm.value.type === "http" ? ruleForm.value.method : undefined,
    url: ruleForm.value.url,
    wsMethod:
      ruleForm.value.type === "ws" ? ruleForm.value.wsMethod : undefined,
    mode: ruleForm.value.mode,
    statusCode: ruleForm.value.statusCode,
  };

  if (ruleForm.value.mode === "static") {
    try {
      payload.responseData = JSON.parse(ruleForm.value.responseData);
    } catch {
      ElMessage.error("响应数据不是合法的 JSON 格式");
      return;
    }
  } else {
    payload.proxyTarget = ruleForm.value.proxyTarget;
    payload.proxyReplacements = ruleForm.value.proxyReplacements.map(
      (rep: any) => ({
        path: rep.path,
        value: tryParseJSON(rep.value),
      }),
    );
  }

  await createRule(currentProject.value.id, payload);
  addRuleVisible.value = false;
  const res = await getRules(currentProject.value.id);
  currentRules.value = res.data;
  ElMessage.success("规则添加成功");
};

// 工具函数
function tryParseJSON(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

const formatJson = (obj: any, key: string) => {
  try {
    const parsed = JSON.parse(obj[key]);
    obj[key] = JSON.stringify(parsed, null, 2);
  } catch {
    ElMessage.error("JSON 格式错误，无法格式化");
  }
};

const typeTagType = (type: string) => (type === "http" ? "" : "warning");
const methodTagType = (method: string) => {
  switch (method?.toUpperCase()) {
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
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--el-bg-color-page, #f5f6f7);
}
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
}
.header-right {
  display: flex;
  gap: 12px;
}
.app-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 24px auto;
  padding: 0 24px;
  overflow: auto;
}
.usage-content {
  font-size: 14px;
  line-height: 1.8;
}
.usage-content h4 {
  margin: 16px 0 6px;
}
.usage-code {
  background: #f5f6f7;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}
.rule-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.rule-url {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-right: auto;
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
  font-family: monospace;
}
</style>
