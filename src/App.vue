<template>
  <div class="app-wrapper">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="bar-content">
        <div class="brand">
          <span class="brand-icon">🔍</span>
          <span class="brand-text">AI Code Reviewer</span>
        </div>
        <button class="config-btn" @click="showConfig = true">
          <span>⚙️</span> 配置密钥
        </button>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main-area">
      <div class="workspace">
        <!-- 左侧：代码输入 -->
        <section class="code-panel">
          <div class="panel-header">
            <h2>代码输入</h2>
            <div class="lang-selector">
              <select v-model="language" class="lang-select">
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="typescript">TypeScript</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>
          <div class="editor-container">
            <textarea
              v-model="code"
              class="code-editor"
              placeholder="在此输入或粘贴代码..."
              spellcheck="false"
            ></textarea>
          </div>
          <div class="panel-footer">
            <button class="review-btn" @click="handleReview" :disabled="loading || !code.trim()">
              {{ loading ? '审查中...' : '开始审查' }}
            </button>
            <button class="clear-btn" @click="clearCode">清空</button>
          </div>
        </section>

        <!-- 右侧：审查结果 -->
        <section class="result-panel">
          <div class="panel-header">
            <h2>审查结果</h2>
            <div v-if="result" class="score-badge" :class="result.levelClass">
              {{ result.score }}分
            </div>
          </div>
          
          <div v-if="!result" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>等待代码审查</p>
          </div>
          
          <div v-else class="result-content">
            <!-- 评分概览 -->
            <div class="overview-card">
              <div class="overview-header">
                <span class="level-tag" :class="result.levelClass">{{ result.level }}</span>
                <span class="score-text">{{ result.score }} / 100</span>
              </div>
              <p class="summary-text">{{ result.summary }}</p>
            </div>

            <!-- 问题列表 -->
            <div class="issues-section">
              <h3>发现的问题</h3>
              <div v-if="result.issues.length === 0" class="no-issues">
                <span>✅ 未发现问题</span>
              </div>
              <div v-else class="issues-list">
                <div
                  v-for="(issue, idx) in result.issues"
                  :key="idx"
                  class="issue-item"
                  :class="issue.type"
                >
                  <div class="issue-header">
                    <span class="issue-type">{{ getIssueTypeLabel(issue.type) }}</span>
                    <span v-if="issue.line" class="issue-line">第 {{ issue.line }} 行</span>
                  </div>
                  <p class="issue-message">{{ issue.message }}</p>
                  <p v-if="issue.suggestion" class="issue-suggestion">
                    💡 {{ issue.suggestion }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 改进建议 -->
            <div class="suggestions-section">
              <h3>改进建议</h3>
              <ul class="suggestions-list">
                <li v-for="(suggestion, idx) in result.suggestions" :key="idx">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 配置弹窗 -->
    <div v-if="showConfig" class="modal-overlay" @click="showConfig = false">
      <div class="modal-content" @click.stop>
        <h3>配置 API 密钥</h3>
        <div class="form-group">
          <label>AccessKey Secret（密钥）</label>
          <input v-model="configForm.accessKeySecret" type="password" placeholder="输入 AccessKey Secret" />
          <p class="form-hint">密钥仅存储在浏览器本地，不会上传到服务器</p>
        </div>
        <div class="modal-actions">
          <button @click="showConfig = false">取消</button>
          <button @click="saveConfig" class="primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { submitReview, type ReviewRequest } from './services/reviewer'

const code = ref('')
const language = ref('javascript')
const loading = ref(false)
const result = ref<any>(null)
const showConfig = ref(false)
const configForm = ref({
  accessKeySecret: ''
})

function loadConfig() {
  const saved = localStorage.getItem('aliyun_accesskey')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      configForm.value = {
        accessKeySecret: config.accessKeySecret || ''
      }
    } catch (e) {
      console.error('加载配置失败:', e)
    }
  }
}

function saveConfig() {
  if (!configForm.value.accessKeySecret) {
    ElMessage.warning('请输入 API 密钥')
    return
  }
  
  localStorage.setItem('aliyun_accesskey', JSON.stringify({
    accessKeySecret: configForm.value.accessKeySecret
  }))
  
  ElMessage.success('配置已保存')
  showConfig.value = false
}

async function handleReview() {
  if (!code.value.trim()) {
    ElMessage.warning('请输入代码')
    return
  }

  loading.value = true
  result.value = null

  try {
    const data: ReviewRequest = {
      code: code.value,
      language: language.value
    }

    const response = await submitReview(data)
    
    result.value = {
      ...response,
      levelClass: response.level === '优秀' ? 'excellent' : 
                  response.level === '良好' ? 'good' : 
                  response.level === '需改进' ? 'warning' : 'fail'
    }
  } catch (error: any) {
    ElMessage.error(error.message || '审查失败，请重试')
  } finally {
    loading.value = false
  }
}

function clearCode() {
  code.value = ''
  result.value = null
}

function getIssueTypeLabel(type: string) {
  const labels: Record<string, string> = {
    error: '❌ 错误',
    warning: '⚠️ 警告',
    suggestion: '💡 建议'
  }
  return labels[type] || type
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  background: #0a0a0a;
  color: #e4e4e7;
  display: flex;
  flex-direction: column;
}

.top-bar {
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  padding: 0;
}

.bar-content {
  max-width: 1800px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 24px;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: #60a5fa;
  letter-spacing: 0.5px;
}

.config-btn {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #e4e4e7;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.config-btn:hover {
  background: #3a3a3a;
  border-color: #60a5fa;
}

.main-area {
  flex: 1;
  padding: 24px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
}

.workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  height: calc(100vh - 120px);
}

.code-panel,
.result-panel {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #151515;
}

.panel-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #e4e4e7;
  margin: 0;
}

.lang-selector {
  display: flex;
  align-items: center;
}

.lang-select {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #e4e4e7;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.editor-container {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.code-editor {
  width: 100%;
  height: 100%;
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  color: #e4e4e7;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  padding: 16px;
  border-radius: 4px;
  resize: none;
  outline: none;
}

.code-editor:focus {
  border-color: #60a5fa;
}

.panel-footer {
  padding: 16px 20px;
  border-top: 1px solid #2a2a2a;
  display: flex;
  gap: 12px;
  background: #151515;
}

.review-btn,
.clear-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.review-btn {
  background: #3b82f6;
  color: white;
  flex: 1;
}

.review-btn:hover:not(:disabled) {
  background: #2563eb;
}

.review-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  background: #2a2a2a;
  color: #e4e4e7;
  border: 1px solid #3a3a3a;
}

.clear-btn:hover {
  background: #3a3a3a;
}

.result-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.score-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
}

.score-badge.excellent {
  background: #10b981;
  color: white;
}

.score-badge.good {
  background: #3b82f6;
  color: white;
}

.score-badge.warning {
  background: #f59e0b;
  color: white;
}

.score-badge.fail {
  background: #ef4444;
  color: white;
}

.overview-card {
  background: #151515;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.level-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}

.level-tag.excellent {
  background: #10b981;
  color: white;
}

.level-tag.good {
  background: #3b82f6;
  color: white;
}

.level-tag.warning {
  background: #f59e0b;
  color: white;
}

.level-tag.fail {
  background: #ef4444;
  color: white;
}

.score-text {
  font-size: 18px;
  font-weight: 700;
  color: #60a5fa;
}

.summary-text {
  color: #9ca3af;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.issues-section,
.suggestions-section {
  margin-bottom: 24px;
}

.issues-section h3,
.suggestions-section h3 {
  font-size: 15px;
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 12px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.issue-item {
  background: #151515;
  border-left: 3px solid;
  border-radius: 4px;
  padding: 12px;
}

.issue-item.error {
  border-color: #ef4444;
}

.issue-item.warning {
  border-color: #f59e0b;
}

.issue-item.suggestion {
  border-color: #60a5fa;
}

.issue-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.issue-type {
  font-size: 12px;
  font-weight: 600;
}

.issue-line {
  font-size: 12px;
  color: #6b7280;
}

.issue-message {
  color: #e4e4e7;
  font-size: 14px;
  margin-bottom: 6px;
}

.issue-suggestion {
  color: #9ca3af;
  font-size: 13px;
  margin: 0;
}

.no-issues {
  text-align: center;
  padding: 24px;
  color: #6b7280;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions-list li {
  background: #151515;
  border-left: 3px solid #60a5fa;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  color: #e4e4e7;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin: 0 0 20px;
  color: #e4e4e7;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #9ca3af;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  color: #e4e4e7;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.modal-actions button {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #2a2a2a;
  background: #2a2a2a;
  color: #e4e4e7;
  cursor: pointer;
}

.modal-actions button.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .code-panel,
  .result-panel {
    min-height: 400px;
  }
}
</style>
