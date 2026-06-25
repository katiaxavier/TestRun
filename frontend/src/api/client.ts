import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// ---- Types ----

export interface JiraConfig {
  url: string;
  email: string;
  token: string;
}

export interface Suite {
  id: string;
  jiraKey?: string;
  manualKey?: string;
  title: string;
  isManual?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { testCases: number; executions: number };
  testCases?: TestCase[];
  executions?: Execution[];
}

export interface TestCaseScenario {
  id: string;
  testCaseId: string;
  name: string;
  createdAt: string;
}

export interface TestCase {
  id: string;
  jiraKey: string;
  title: string;
  link?: string;
  priority?: string;
  suiteId: string;
  scenarioTemplates?: TestCaseScenario[];
}

export interface Execution {
  id: string;
  suiteId?: string;
  suite?: Suite;
  batchId?: string;
  sprint: string;
  version?: string;
  startDate: string;
  endDate: string;
  responsible: string;
  status: string;
  testCases: ExecutionTestCase[];
  createdAt: string;
}

export interface Scenario {
  id: string;
  executionTestCaseId: string;
  templateId?: string;
  name: string;
  status: string;
  comments?: string;
  issues: Issue[];
}

export interface ExecutionTestCase {
  id: string;
  executionId: string;
  testCaseId: string;
  testCase: TestCase;
  status: string;
  originalStatus?: string;
  responsible?: string;
  comments?: string;
  issues: Issue[];
  scenarios: Scenario[];
}

export interface Issue {
  id: string;
  type: string;
  jiraKey?: string;
  title: string;
  severity?: string;
  status?: string;
  responsible?: string;
}

// ---- API helpers ----

export const configApi = {
  get: () => api.get<JiraConfig>('/config'),
  save: (data: JiraConfig) => api.post('/config', data),
};

export const suitesApi = {
  list: () => api.get<Suite[]>('/suites'),
  get: (id: string) => api.get<Suite>(`/suites/${id}`),
  create: (title: string) => api.post<Suite>('/suites', { title }),
  importFromJira: (jiraKey: string) => api.post<Suite>('/suites/import', { jiraKey }),
  delete: (id: string) => api.delete(`/suites/${id}`),
  addTestCase: (suiteId: string, jiraKey: string) =>
    api.post<TestCase>(`/suites/${suiteId}/test-cases`, { jiraKey }),
  deleteTestCase: (id: string) => api.delete(`/suites/test-cases/${id}`),
  addScenarioTemplate: (tcId: string, name: string) =>
    api.post<TestCaseScenario>(`/suites/test-cases/${tcId}/scenarios`, { name }),
  addScenarioTemplateBatch: (tcId: string, names: string[]) =>
    api.post<TestCaseScenario[]>(`/suites/test-cases/${tcId}/scenarios/batch`, { names }),
  deleteScenarioTemplate: (templateId: string) =>
    api.delete(`/suites/test-cases/scenarios/${templateId}`),
};

export const executionsApi = {
  get: (id: string) => api.get<Execution>(`/executions/${id}`),
  delete: (id: string) => api.delete(`/executions/${id}`),
  getBatch: (id: string) => api.get<any>(`/batch/${id}`),
  getAllBatches: () => api.get<any[]>(`/batch`),
  deleteBatch: (id: string) => api.delete(`/batch/${id}`),
  create: (data: {
    suiteId: string;
    sprint: string;
    version?: string;
    startDate: string;
    endDate: string;
    responsible: string;
  }) => api.post<Execution>('/executions', data),
  createBatch: (suiteIds: string[], data: {
    name?: string;
  }) => api.post('/batch', { suiteIds, ...data }),
  createBatchExecution: (batchId: string, data: {
    sprint: string;
    version?: string;
    startDate: string;
    endDate: string;
    responsible: string;
  }) => api.post(`/batch/${batchId}/executions`, data),
  updateStatus: (id: string, status: string) => api.patch(`/executions/${id}/status`, { status }),
  updateTestCase: (
    executionId: string,
    etcId: string,
    data: { status?: string; responsible?: string; comments?: string }
  ) => api.patch(`/executions/${executionId}/test-cases/${etcId}`, data),
  addIssue: (executionId: string, etcId: string, data: { type: string; jiraKey?: string; title: string; severity?: string; status?: string; responsible?: string }) =>
    api.post(`/executions/${executionId}/test-cases/${etcId}/issues`, data),
  removeTestCase: (executionId: string, etcId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}`),
  removeTestCaseFromBatch: (batchId: string, testCaseId: string) =>
    api.delete(`/batch/${batchId}/test-cases/${testCaseId}`),
  removeIssue: (executionId: string, etcId: string, issueId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/issues/${issueId}`),
  updateIssue: (executionId: string, etcId: string, issueId: string, data: { type?: string; jiraKey?: string | null; title?: string; severity?: string; status?: string }) =>
    api.patch<Issue>(`/executions/${executionId}/test-cases/${etcId}/issues/${issueId}`, data),

  createScenario: (executionId: string, etcId: string, name: string) =>
    api.post<Scenario>(`/executions/${executionId}/test-cases/${etcId}/scenarios`, { name }),
  createScenarioBatch: (executionId: string, etcId: string, names: string[]) =>
    api.post<Scenario[]>(`/executions/${executionId}/test-cases/${etcId}/scenarios/batch`, { names }),
  updateScenario: (executionId: string, etcId: string, scenarioId: string, data: { name?: string; status?: string; comments?: string }) =>
    api.patch<Scenario>(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}`, data),
  deleteScenario: (executionId: string, etcId: string, scenarioId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}`),

  addScenarioIssue: (executionId: string, etcId: string, scenarioId: string, data: { type: string; jiraKey?: string; title: string; severity?: string; status?: string }) =>
    api.post<Issue>(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}/issues`, data),
  updateScenarioIssue: (executionId: string, etcId: string, scenarioId: string, issueId: string, data: { type?: string; jiraKey?: string | null; title?: string; severity?: string; status?: string }) =>
    api.patch<Issue>(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}/issues/${issueId}`, data),
  removeScenarioIssue: (executionId: string, etcId: string, scenarioId: string, issueId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}/issues/${issueId}`),
};

export const reportsApi = {
  xlsx: (executionId: string) =>
    api.get(`/reports/${executionId}/xlsx`, { responseType: 'blob' }),
  pdf: (executionId: string) =>
    api.get(`/reports/${executionId}/pdf`, { responseType: 'blob' }),
  getBatchReport: (batchId: string) => api.get<any>(`/reports/batch/${batchId}`),
  downloadBatchXlsx: (batchId: string) =>
    api.get(`/reports/batch/${batchId}/xlsx`, { responseType: 'blob' }),
  downloadBatchPdf: (batchId: string) =>
    api.get(`/reports/batch/${batchId}/pdf`, { responseType: 'blob' }),
};
