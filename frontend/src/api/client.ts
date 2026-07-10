import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = error.config?.url?.includes('/auth/me');
    if (error.response?.status === 401 && !isAuthCheck) {
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Types ----

export interface AuthUser {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  jiraProjectId: string;
  jiraProjectKey: string;
  name: string;
}

export interface Board {
  id: string;
  jiraBoardId: string;
  name: string;
  type: string;
  projectId: string;
}

export interface Suite {
  id: string;
  projectId: string;
  boards?: Board[];
  jiraKey?: string;
  manualKey?: string;
  title: string;
  isManual?: boolean;
  epicKey?: string;
  epicSummary?: string;
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
  automated?: boolean;
  suiteId: string;
  scenarioTemplates?: TestCaseScenario[];
}

export interface Execution {
  id: string;
  suiteId?: string;
  suite?: Suite;
  batchId?: string;
  batch?: { id: string; name?: string };
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
  jiraPriority?: string;
  jiraLabels?: string[];
  status?: string;
  responsible?: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  issuetype: string;
  priority?: string;
  labels?: string[];
  created: string;
  updated: string;
  assignee?: string;
  link: string;
}

// ---- API helpers ----

export const authApi = {
  me: () => api.get<AuthUser>('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const jiraApi = {
  getSite: () => api.get<{ url: string }>('/jira/site'),
};

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
};

export const boardsApi = {
  list: (projectId: string) =>
    api.get<{ boards: Board[]; hasUnassignedSuites: boolean }>('/boards', { params: { projectId } }),
};

export const suitesApi = {
  list: (projectId?: string, boardId?: string) =>
    api.get<Suite[]>('/suites', { params: { projectId, boardId } }),
  get: (id: string) => api.get<Suite>(`/suites/${id}`),
  create: (title: string, projectId: string, boardId?: string) =>
    api.post<Suite>('/suites', { title, projectId, boardId }),
  importFromJira: (jiraKey: string, projectId: string, boardId?: string) =>
    api.post<Suite>('/suites/import', { jiraKey, projectId, boardId }),
  sync: (boardId: string) =>
    api.post<{ total: number; synced: string[]; failed: { key: string; error: string }[] }>(
      '/suites/sync',
      { boardId },
    ),
  delete: (id: string) => api.delete(`/suites/${id}`),
  addTestCase: (suiteId: string, jiraKey: string) =>
    api.post<TestCase>(`/suites/${suiteId}/test-cases`, { jiraKey }),
  updateTestCase: (id: string, data: { automated?: boolean }) =>
    api.patch<TestCase>(`/suites/test-cases/${id}`, data),
  deleteTestCase: (id: string) => api.delete(`/suites/test-cases/${id}`),
  addScenarioTemplate: (tcId: string, name: string) =>
    api.post<TestCaseScenario>(`/suites/test-cases/${tcId}/scenarios`, { name }),
  addScenarioTemplateBatch: (tcId: string, names: string[]) =>
    api.post<{ created: TestCaseScenario[]; skipped: string[] }>(`/suites/test-cases/${tcId}/scenarios/batch`, { names }),
  deleteScenarioTemplate: (templateId: string) =>
    api.delete(`/suites/test-cases/scenarios/${templateId}`),
};

export const executionsApi = {
  getRecent: (projectId?: string, boardId?: string, opts?: { limit?: number; status?: string }) =>
    api.get<Execution[]>('/executions', { params: { projectId, boardId, limit: opts?.limit, status: opts?.status } }),
  getAll: (
    projectId?: string,
    boardId?: string,
    opts?: { status?: string; periodStart?: string; periodEnd?: string; page?: number; pageSize?: number },
  ) =>
    api.get<{ data: Execution[]; total: number; page: number; pageSize: number }>('/executions/search', {
      params: {
        projectId, boardId,
        status: opts?.status, periodStart: opts?.periodStart, periodEnd: opts?.periodEnd,
        page: opts?.page, pageSize: opts?.pageSize,
      },
    }),
  get: (id: string) => api.get<Execution>(`/executions/${id}`),
  update: (id: string, data: { sprint?: string; version?: string; startDate?: string; endDate?: string; responsible?: string }) =>
    api.patch<Execution>(`/executions/${id}`, data),
  delete: (id: string) => api.delete(`/executions/${id}`),
  getBatch: (id: string) => api.get<any>(`/batch/${id}`),
  getAllBatches: (projectId?: string, boardId?: string) =>
    api.get<any[]>(`/batch`, { params: { projectId, boardId } }),
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
    projectId: string;
    boardId?: string;
  }) => api.post('/batch', { suiteIds, ...data }),
  createBatchExecution: (batchId: string, data: {
    sprint: string;
    version?: string;
    startDate: string;
    endDate: string;
    responsible: string;
  }) => api.post<Execution>(`/batch/${batchId}/executions`, data),
  updateStatus: (id: string, status: string) => api.patch(`/executions/${id}/status`, { status }),
  updateTestCase: (
    executionId: string,
    etcId: string,
    data: { status?: string; responsible?: string; comments?: string }
  ) => api.patch(`/executions/${executionId}/test-cases/${etcId}`, data),
  addIssue: (executionId: string, etcId: string, data: { type: string; jiraKey?: string; title: string; jiraPriority?: string; jiraLabels?: string[]; status?: string; responsible?: string }) =>
    api.post(`/executions/${executionId}/test-cases/${etcId}/issues`, data),
  removeTestCase: (executionId: string, etcId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}`),
  removeTestCaseFromBatch: (batchId: string, testCaseId: string) =>
    api.delete(`/batch/${batchId}/test-cases/${testCaseId}`),
  removeIssue: (executionId: string, etcId: string, issueId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/issues/${issueId}`),
  updateIssue: (executionId: string, etcId: string, issueId: string, data: { type?: string; jiraKey?: string | null; title?: string; jiraPriority?: string; jiraLabels?: string[]; status?: string }) =>
    api.patch<Issue>(`/executions/${executionId}/test-cases/${etcId}/issues/${issueId}`, data),

  createScenario: (executionId: string, etcId: string, name: string) =>
    api.post<{ scenario: Scenario; templateCreated: boolean }>(`/executions/${executionId}/test-cases/${etcId}/scenarios`, { name }),
  createScenarioBatch: (executionId: string, etcId: string, names: string[]) =>
    api.post<{ created: Scenario[]; skipped: string[] }>(`/executions/${executionId}/test-cases/${etcId}/scenarios/batch`, { names }),
  updateScenario: (executionId: string, etcId: string, scenarioId: string, data: { name?: string; status?: string; comments?: string }) =>
    api.patch<Scenario>(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}`, data),
  deleteScenario: (executionId: string, etcId: string, scenarioId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}`),
  deleteScenarioBatch: (executionId: string, etcId: string, ids: string[]) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/scenarios`, { data: { ids } }),

  addScenarioIssue: (executionId: string, etcId: string, scenarioId: string, data: { type: string; jiraKey?: string; title: string; jiraPriority?: string; jiraLabels?: string[]; status?: string }) =>
    api.post<Issue>(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}/issues`, data),
  updateScenarioIssue: (executionId: string, etcId: string, scenarioId: string, issueId: string, data: { type?: string; jiraKey?: string | null; title?: string; jiraPriority?: string; jiraLabels?: string[]; status?: string }) =>
    api.patch<Issue>(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}/issues/${issueId}`, data),
  removeScenarioIssue: (executionId: string, etcId: string, scenarioId: string, issueId: string) =>
    api.delete(`/executions/${executionId}/test-cases/${etcId}/scenarios/${scenarioId}/issues/${issueId}`),
};

export interface JiraIssueFilters {
  types: { value: string; label: string }[];
  statuses: { id: string; name: string }[];
  priorities: { id: string; name: string }[];
}

export const jiraIssuesApi = {
  list: (
    projectId: string,
    boardId: string,
    opts?: {
      page?: number;
      pageSize?: number;
      type?: string;
      status?: string;
      priority?: string;
      search?: string;
    },
  ) =>
    api.get<{ data: JiraIssue[]; total: number; page: number; pageSize: number }>('/jira-issues', {
      params: {
        projectId, boardId,
        page: opts?.page, pageSize: opts?.pageSize,
        type: opts?.type, status: opts?.status, priority: opts?.priority, search: opts?.search,
      },
    }),
  getFilters: (projectId: string) =>
    api.get<JiraIssueFilters>('/jira-issues/filters', { params: { projectId } }),
  searchPicker: (projectId: string, opts: { type?: 'Bug' | 'Improvement'; search?: string }) =>
    api.get<{ data: JiraIssue[] }>('/jira-issues/picker', {
      params: { projectId, type: opts.type, search: opts.search },
    }),
};

export interface DashboardQuality {
  density: { key: string; labels: string[]; count: number }[];
  severityByExecution: { executionId: string; bySeverity: { severity: string; count: number }[] }[];
  coverage: {
    epicsWithSuite: number;
    totalEpics: number;
    totalTestCases: number;
    automatedTestCases: number;
  };
}

export interface DashboardEfficiency {
  mttrDays: number | null;
  avgAgeDays: number | null;
  openBugsCount: number;
  resolvedBugsCount: number;
  slaViolations: { key: string; link: string; priority?: string; ageDays: number }[];
}

export const dashboardApi = {
  getQuality: (projectId: string, boardId?: string) =>
    api.get<DashboardQuality>('/dashboard/quality', { params: { projectId, boardId } }),
  getEfficiency: (projectId: string, boardId?: string) =>
    api.get<DashboardEfficiency>('/dashboard/efficiency', { params: { projectId, boardId } }),
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
