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
  jiraKey: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { testCases: number; executions: number };
  testCases?: TestCase[];
  executions?: Execution[];
}

export interface TestCase {
  id: string;
  jiraKey: string;
  title: string;
  link?: string;
  suiteId: string;
}

export interface Execution {
  id: string;
  suiteId: string;
  suite?: Suite;
  sprint: string;
  version: string;
  startDate: string;
  endDate: string;
  testedFeature: string;
  responsible: string;
  status: string;
  testCases: ExecutionTestCase[];
  createdAt: string;
}

export interface ExecutionTestCase {
  id: string;
  executionId: string;
  testCaseId: string;
  testCase: TestCase;
  status: string;
  responsible?: string;
  comments?: string;
  issues: Issue[];
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
  importFromJira: (jiraKey: string) => api.post<Suite>('/suites/import', { jiraKey }),
  delete: (id: string) => api.delete(`/suites/${id}`),
  deleteTestCase: (id: string) => api.delete(`/suites/test-cases/${id}`),
};

export const executionsApi = {
  get: (id: string) => api.get<Execution>(`/executions/${id}`),
  create: (data: {
    suiteId: string;
    sprint: string;
    version: string;
    startDate: string;
    endDate: string;
    testedFeature: string;
    responsible: string;
  }) => api.post<Execution>('/executions', data),
  updateStatus: (id: string, status: string) => api.patch(`/executions/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/executions/${id}`),
  updateTestCase: (
    executionId: string,
    etcId: string,
    data: { status?: string; responsible?: string; comments?: string }
  ) => api.patch<ExecutionTestCase>(`/executions/${executionId}/test-cases/${etcId}`, data),
  addIssue: (
    executionId: string,
    etcId: string,
    data: { type: string; jiraKey?: string; title: string; severity?: string; status?: string; responsible?: string }
  ) => api.post<Issue>(`/executions/${executionId}/test-cases/${etcId}/issues`, data),
  removeIssue: (executionId: string, etcId: string, issueId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/issues/${issueId}`),
};

export const reportsApi = {
  xlsx: (executionId: string) =>
    api.get(`/reports/${executionId}/xlsx`, { responseType: 'blob' }),
  pdf: (executionId: string) =>
    api.get(`/reports/${executionId}/pdf`, { responseType: 'blob' }),
};
