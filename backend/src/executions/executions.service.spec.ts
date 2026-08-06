import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ExecutionsService, CreateScenarioDto } from './executions.service';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';
import { SuitesService } from '../suites/suites.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEtc(overrides: Partial<any> = {}) {
  return {
    id: 'etc-1',
    executionId: 'exec-1',
    status: 'PASSED',
    originalStatus: null,
    issues: [],
    scenarios: [],
    ...overrides,
  };
}

function makeScenario(overrides: Partial<any> = {}) {
  return {
    id: 'sc-1',
    executionTestCaseId: 'etc-1',
    name: 'Cenário A',
    status: 'PENDING',
    issues: [],
    ...overrides,
  };
}

function makeIssue(overrides: Partial<any> = {}) {
  return {
    id: 'issue-1',
    executionTestCaseId: 'etc-1',
    scenarioId: null,
    type: 'BUG',
    title: 'Bug encontrado',
    ...overrides,
  };
}

// ── Mock PrismaService ────────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    executionTestCase: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    scenario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    testCaseScenario: {
      // Por padrão não há template na suíte com o nome pedido — createScenario cria um.
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'tpl-novo', name: 'Cenário A' }),
    },
    issue: {
      updateMany: jest.fn(),
    },
    execution: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    executionBatch: {
      findUnique: jest.fn(),
    },
    suite: {
      findMany: jest.fn(),
    },
  };
}

function buildJiraMock() {
  return {
    fetchIssuesByKeys: jest.fn(),
  };
}

function buildSuitesMock() {
  return {
    importFromJira: jest.fn().mockResolvedValue({}),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ExecutionsService — Cenários', () => {
  let service: ExecutionsService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let suitesService: ReturnType<typeof buildSuitesMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    suitesService = buildSuitesMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: JiraService, useValue: buildJiraMock() },
        { provide: SuitesService, useValue: suitesService },
      ],
    }).compile();

    service = module.get<ExecutionsService>(ExecutionsService);
  });

  // ── createScenario ──────────────────────────────────────────────────────────

  describe('createScenario', () => {
    it('lança 404 quando ETC não existe', async () => {
      prisma.executionTestCase.findUnique.mockResolvedValue(null);
      await expect(
        service.createScenario('inexistente', { name: 'X' }),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('salva originalStatus ao criar o primeiro cenário', async () => {
      const etc = makeEtc({ status: 'PASSED', issues: [], scenarios: [] });
      const sc = makeScenario();

      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, originalStatus: 'PASSED', status: 'PENDING', executionId: 'exec-1' });
      prisma.scenario.create.mockResolvedValue(sc);
      prisma.scenario.findMany.mockResolvedValue([sc]);
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      await service.createScenario('etc-1', { name: 'Cenário A' });

      expect(prisma.executionTestCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'etc-1' },
          data: { originalStatus: 'PASSED' },
        }),
      );
    });

    it('migra issues do TC para o primeiro cenário quando existem issues', async () => {
      const issue = makeIssue();
      const etc = makeEtc({ status: 'FAILED', issues: [issue], scenarios: [] });
      const sc = makeScenario({ id: 'sc-new' });

      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, originalStatus: 'FAILED', executionId: 'exec-1' });
      prisma.scenario.create.mockResolvedValue(sc);
      prisma.scenario.findMany.mockResolvedValue([sc]);
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      await service.createScenario('etc-1', { name: 'Cenário A' });

      expect(prisma.issue.updateMany).toHaveBeenCalledWith({
        where: { executionTestCaseId: 'etc-1' },
        data: { executionTestCaseId: null, scenarioId: 'sc-new' },
      });
    });

    it('não migra issues nem salva originalStatus em cenários subsequentes', async () => {
      const existingScenario = makeScenario({ id: 'sc-existing' });
      const etc = makeEtc({ scenarios: [existingScenario], issues: [] });
      const sc = makeScenario({ id: 'sc-new', name: 'Cenário B' });

      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.scenario.create.mockResolvedValue(sc);
      prisma.scenario.findMany.mockResolvedValue([existingScenario, sc]);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, status: 'PENDING', executionId: 'exec-1' });
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      await service.createScenario('etc-1', { name: 'Cenário B' });

      // update só deve ser chamado para recompute (status), não para originalStatus
      const updateCalls = prisma.executionTestCase.update.mock.calls;
      const savedOriginal = updateCalls.find(
        (call: any[]) => call[0]?.data?.originalStatus !== undefined,
      );
      expect(savedOriginal).toBeUndefined();
      expect(prisma.issue.updateMany).not.toHaveBeenCalled();
    });

    it('não chama updateMany de issues quando TC não tem issues', async () => {
      const etc = makeEtc({ status: 'PENDING', issues: [], scenarios: [] });
      const sc = makeScenario();

      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, originalStatus: 'PENDING', executionId: 'exec-1' });
      prisma.scenario.create.mockResolvedValue(sc);
      prisma.scenario.findMany.mockResolvedValue([sc]);
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      await service.createScenario('etc-1', { name: 'Cenário A' });

      expect(prisma.issue.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── createScenarioBatch ─────────────────────────────────────────────────────

  describe('createScenarioBatch', () => {
    it('cria múltiplos cenários em sequência', async () => {
      const etc = makeEtc({ scenarios: [], issues: [] });
      const scA = makeScenario({ id: 'sc-a', name: 'Proc A' });
      const scB = makeScenario({ id: 'sc-b', name: 'Proc B' });
      const scC = makeScenario({ id: 'sc-c', name: 'Proc C' });

      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, originalStatus: 'PENDING', executionId: 'exec-1' });
      prisma.scenario.create
        .mockResolvedValueOnce(scA)
        .mockResolvedValueOnce(scB)
        .mockResolvedValueOnce(scC);
      prisma.scenario.findMany.mockResolvedValue([scA, scB, scC]);
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      const result = await service.createScenarioBatch('etc-1', ['Proc A', 'Proc B', 'Proc C']);

      expect(prisma.scenario.create).toHaveBeenCalledTimes(3);
      expect(result.created).toHaveLength(3);
      expect(result.skipped).toEqual([]);
    });

    it('migra issues para o PRIMEIRO cenário do lote', async () => {
      const issue = makeIssue();
      const etc = makeEtc({ status: 'FAILED', issues: [issue], scenarios: [] });
      const scA = makeScenario({ id: 'sc-a', name: 'Proc A' });
      const scB = makeScenario({ id: 'sc-b', name: 'Proc B' });

      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, originalStatus: 'FAILED', executionId: 'exec-1' });
      prisma.scenario.create
        .mockResolvedValueOnce(scA)
        .mockResolvedValueOnce(scB);
      prisma.scenario.findMany.mockResolvedValue([scA, scB]);
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      await service.createScenarioBatch('etc-1', ['Proc A', 'Proc B']);

      expect(prisma.issue.updateMany).toHaveBeenCalledWith({
        where: { executionTestCaseId: 'etc-1' },
        data: { executionTestCaseId: null, scenarioId: 'sc-a' },
      });
      expect(prisma.issue.updateMany).toHaveBeenCalledTimes(1);
    });

    it('lança 404 quando ETC não existe', async () => {
      prisma.executionTestCase.findUnique.mockResolvedValue(null);
      await expect(
        service.createScenarioBatch('inexistente', ['A', 'B']),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  // ── deleteScenario ──────────────────────────────────────────────────────────

  describe('deleteScenario', () => {
    it('lança 404 quando cenário não existe', async () => {
      prisma.scenario.findUnique.mockResolvedValue(null);
      await expect(
        service.deleteScenario('etc-1', 'sc-inexistente'),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('lança 404 quando cenário pertence a outro ETC', async () => {
      prisma.scenario.findUnique.mockResolvedValue(
        makeScenario({ executionTestCaseId: 'outro-etc' }),
      );
      await expect(
        service.deleteScenario('etc-1', 'sc-1'),
      ).rejects.toBeInstanceOf(HttpException);
    });

    describe('ao deletar o último cenário', () => {
      it('restaura originalStatus no TC', async () => {
        const sc = makeScenario({ issues: [] });
        const etc = makeEtc({ originalStatus: 'PASSED' });

        prisma.scenario.findUnique.mockResolvedValue(sc);
        prisma.scenario.count.mockResolvedValue(0);
        prisma.executionTestCase.findUnique.mockResolvedValue(etc);
        prisma.scenario.delete.mockResolvedValue(sc);
        prisma.executionTestCase.update.mockResolvedValue({ ...etc, status: 'PASSED', originalStatus: null, executionId: 'exec-1' });
        prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PASSED' }]);
        prisma.execution.update.mockResolvedValue({});

        await service.deleteScenario('etc-1', 'sc-1');

        expect(prisma.executionTestCase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'PASSED',
              originalStatus: null,
            }),
          }),
        );
      });

      it('mantém o status atual quando originalStatus é nulo', async () => {
        const sc = makeScenario({ issues: [] });
        const etc = makeEtc({ originalStatus: null });

        prisma.scenario.findUnique.mockResolvedValue(sc);
        prisma.scenario.count.mockResolvedValue(0);
        prisma.executionTestCase.findUnique.mockResolvedValue(etc);
        prisma.scenario.delete.mockResolvedValue(sc);

        await service.deleteScenario('etc-1', 'sc-1');

        // Sem originalStatus não há o que restaurar: o TC fica com o status derivado que tinha.
        expect(prisma.executionTestCase.update).not.toHaveBeenCalled();
        expect(prisma.scenario.delete).toHaveBeenCalledWith({ where: { id: 'sc-1' } });
      });

      it('migra issues do cenário de volta ao TC', async () => {
        const issue = makeIssue({ id: 'issue-sc', executionTestCaseId: null, scenarioId: 'sc-1' });
        const sc = makeScenario({ issues: [issue] });
        const etc = makeEtc({ originalStatus: 'FAILED' });

        prisma.scenario.findUnique.mockResolvedValue(sc);
        prisma.scenario.count.mockResolvedValue(0);
        prisma.executionTestCase.findUnique.mockResolvedValue(etc);
        prisma.scenario.delete.mockResolvedValue(sc);
        prisma.executionTestCase.update.mockResolvedValue({ ...etc, status: 'FAILED', originalStatus: null, executionId: 'exec-1' });
        prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'FAILED' }]);
        prisma.execution.update.mockResolvedValue({});

        await service.deleteScenario('etc-1', 'sc-1');

        expect(prisma.issue.updateMany).toHaveBeenCalledWith({
          where: { scenarioId: 'sc-1' },
          data: { scenarioId: null, executionTestCaseId: 'etc-1' },
        });
      });

      it('não chama updateMany de issues quando cenário não tem issues', async () => {
        const sc = makeScenario({ issues: [] });
        const etc = makeEtc({ originalStatus: 'PASSED' });

        prisma.scenario.findUnique.mockResolvedValue(sc);
        prisma.scenario.count.mockResolvedValue(0);
        prisma.executionTestCase.findUnique.mockResolvedValue(etc);
        prisma.scenario.delete.mockResolvedValue(sc);
        prisma.executionTestCase.update.mockResolvedValue({ ...etc, status: 'PASSED', originalStatus: null, executionId: 'exec-1' });
        prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PASSED' }]);
        prisma.execution.update.mockResolvedValue({});

        await service.deleteScenario('etc-1', 'sc-1');

        expect(prisma.issue.updateMany).not.toHaveBeenCalled();
      });
    });

    describe('ao deletar cenário não-último', () => {
      it('deleta o cenário e recomputa status sem restaurar originalStatus', async () => {
        const sc = makeScenario();
        const remaining = makeScenario({ id: 'sc-2', name: 'Cenário B', status: 'PASSED' });

        prisma.scenario.findUnique.mockResolvedValue(sc);
        prisma.scenario.count.mockResolvedValue(1);
        prisma.scenario.delete.mockResolvedValue(sc);
        prisma.scenario.findMany.mockResolvedValue([remaining]);
        prisma.executionTestCase.update.mockResolvedValue({ id: 'etc-1', status: 'PASSED', executionId: 'exec-1' });
        prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PASSED' }]);
        prisma.execution.update.mockResolvedValue({});

        await service.deleteScenario('etc-1', 'sc-1');

        expect(prisma.scenario.delete).toHaveBeenCalledWith({ where: { id: 'sc-1' } });
        expect(prisma.executionTestCase.findUnique).not.toHaveBeenCalled();
        expect(prisma.issue.updateMany).not.toHaveBeenCalled();
      });
    });

    it('retorna { success: true }', async () => {
      const sc = makeScenario({ issues: [] });
      const etc = makeEtc({ originalStatus: 'PASSED' });

      prisma.scenario.findUnique.mockResolvedValue(sc);
      prisma.scenario.count.mockResolvedValue(0);
      prisma.executionTestCase.findUnique.mockResolvedValue(etc);
      prisma.scenario.delete.mockResolvedValue(sc);
      prisma.executionTestCase.update.mockResolvedValue({ ...etc, executionId: 'exec-1' });
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PASSED' }]);
      prisma.execution.update.mockResolvedValue({});

      const result = await service.deleteScenario('etc-1', 'sc-1');
      expect(result).toEqual({ success: true });
    });
  });

  // ── Agregação de status ─────────────────────────────────────────────────────

  describe('recomputeTestCaseStatus — aggregação via cenários', () => {
    const cases: Array<{ statuses: string[]; expected: string }> = [
      { statuses: ['PENDING', 'PENDING'], expected: 'PENDING' },
      { statuses: ['PASSED', 'PASSED'], expected: 'PASSED' },
      { statuses: ['PASSED', 'FAILED'], expected: 'FAILED' },
      { statuses: ['FAILED', 'BLOCKED'], expected: 'FAILED' },
      { statuses: ['BLOCKED', 'BLOCKED'], expected: 'BLOCKED' },
      { statuses: ['PASSED', 'PENDING'], expected: 'IN_PROGRESS' },
      { statuses: ['BLOCKED', 'PENDING'], expected: 'BLOCKED' },
    ];

    cases.forEach(({ statuses, expected }) => {
      it(`${statuses.join(' + ')} → ${expected}`, async () => {
        const scenarios = statuses.map((s, i) =>
          makeScenario({ id: `sc-${i}`, status: s }),
        );

        prisma.scenario.findMany.mockResolvedValue(scenarios);
        prisma.executionTestCase.update.mockResolvedValue({
          id: 'etc-1', status: expected, executionId: 'exec-1',
        });
        prisma.executionTestCase.findMany.mockResolvedValue([{ status: expected }]);
        prisma.execution.update.mockResolvedValue({});

        // chama indiretamente via updateScenario (mudança de status → recompute)
        prisma.scenario.findUnique.mockResolvedValue(scenarios[0]);
        prisma.scenario.update.mockResolvedValue({ ...scenarios[0], status: statuses[0] });

        await service.updateScenario('etc-1', 'sc-0', { status: statuses[0] });

        expect(prisma.executionTestCase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: expected }),
          }),
        );
      });
    });
  });

  // ── syncExecution ───────────────────────────────────────────────────────────

  describe('syncExecution', () => {
    // Monta os dois findMany de suite que o sync faz: o 1º com select (import do Jira),
    // o 2º com include (diff local).
    function mockSuites(
      forImport: any[],
      withTestCases: any[],
    ) {
      prisma.suite.findMany
        .mockResolvedValueOnce(forImport)
        .mockResolvedValueOnce(withTestCases);
    }

    it('lança 404 quando a execução não existe', async () => {
      prisma.execution.findUnique.mockResolvedValue(null);
      await expect(
        service.syncExecution('inexistente', 'user-1', 'Katia'),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('adiciona apenas os casos de teste ausentes, com cenários e responsável', async () => {
      prisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1', suiteId: 'suite-1', batchId: null,
        testCases: [{ id: 'etc-1', testCaseId: 'tc-1', scenarios: [] }],
      });
      mockSuites(
        [{ id: 'suite-1', jiraKey: 'ABC-1', projectId: 'proj-1' }],
        [{
          id: 'suite-1',
          testCases: [
            { id: 'tc-1', jiraKey: 'ABC-10', title: 'Caso A', scenarioTemplates: [] },
            { id: 'tc-2', jiraKey: 'ABC-11', title: 'Caso B', scenarioTemplates: [{ id: 'tpl-1', name: 'C1' }] },
          ],
        }],
      );
      prisma.executionTestCase.create.mockResolvedValue({ id: 'etc-2' });
      prisma.scenario.create.mockResolvedValue(makeScenario({ id: 'sc-1' }));
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      const result = await service.syncExecution('exec-1', 'user-1', 'Katia');

      expect(suitesService.importFromJira).toHaveBeenCalledWith('ABC-1', 'user-1', 'proj-1');
      expect(prisma.executionTestCase.create).toHaveBeenCalledTimes(1);
      expect(prisma.executionTestCase.create).toHaveBeenCalledWith({
        data: {
          executionId: 'exec-1',
          testCaseId: 'tc-2',
          status: 'PENDING',
          responsible: 'Katia',
        },
      });
      expect(prisma.scenario.create).toHaveBeenCalledWith({
        data: {
          executionTestCaseId: 'etc-2',
          templateId: 'tpl-1',
          name: 'C1',
          status: 'PENDING',
        },
      });
      expect(result.addedTestCases).toEqual([{ jiraKey: 'ABC-11', title: 'Caso B' }]);
      expect(result.jiraFailed).toEqual([]);
    });

    it('adiciona cenário faltante em caso já presente e recalcula o status do caso', async () => {
      prisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1', suiteId: 'suite-1', batchId: null,
        testCases: [{ id: 'etc-1', testCaseId: 'tc-1', scenarios: [makeScenario({ name: 'C1' })] }],
      });
      mockSuites(
        [{ id: 'suite-1', jiraKey: 'ABC-1', projectId: 'proj-1' }],
        [{
          id: 'suite-1',
          testCases: [{
            id: 'tc-1', jiraKey: 'ABC-10', title: 'Caso A',
            scenarioTemplates: [{ id: 'tpl-1', name: 'C1' }, { id: 'tpl-2', name: 'C2' }],
          }],
        }],
      );
      // createScenario
      prisma.executionTestCase.findUnique.mockResolvedValue(
        makeEtc({ id: 'etc-1', testCaseId: 'tc-1', scenarios: [makeScenario({ name: 'C1', status: 'PASSED' })] }),
      );
      prisma.testCaseScenario.findFirst.mockResolvedValue({ id: 'tpl-2', name: 'C2' });
      prisma.scenario.create.mockResolvedValue(makeScenario({ id: 'sc-2', name: 'C2' }));
      prisma.scenario.findUnique.mockResolvedValue(makeScenario({ id: 'sc-2', name: 'C2' }));
      // recompute
      prisma.scenario.findMany.mockResolvedValue([{ status: 'PASSED' }, { status: 'PENDING' }]);
      prisma.executionTestCase.update.mockResolvedValue({ id: 'etc-1', executionId: 'exec-1' });
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'IN_PROGRESS' }]);
      prisma.execution.update.mockResolvedValue({});

      const result = await service.syncExecution('exec-1', 'user-1', 'Katia');

      expect(result.addedScenarios).toBe(1);
      expect(result.addedTestCases).toEqual([]);
      expect(prisma.executionTestCase.create).not.toHaveBeenCalled();
      expect(prisma.testCaseScenario.create).not.toHaveBeenCalled(); // reaproveita o template
      expect(prisma.executionTestCase.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'IN_PROGRESS' }) }),
      );
    });

    it('não duplica cenário cujo nome já existe no item', async () => {
      prisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1', suiteId: 'suite-1', batchId: null,
        testCases: [{ id: 'etc-1', testCaseId: 'tc-1', scenarios: [makeScenario({ name: 'C1' })] }],
      });
      mockSuites(
        [{ id: 'suite-1', jiraKey: 'ABC-1', projectId: 'proj-1' }],
        [{
          id: 'suite-1',
          testCases: [{ id: 'tc-1', jiraKey: 'ABC-10', title: 'Caso A', scenarioTemplates: [{ id: 'tpl-1', name: 'C1' }] }],
        }],
      );

      const result = await service.syncExecution('exec-1', 'user-1', 'Katia');

      expect(result).toEqual({ addedTestCases: [], addedScenarios: 0, jiraFailed: [] });
      expect(prisma.scenario.create).not.toHaveBeenCalled();
      expect(prisma.execution.update).not.toHaveBeenCalled();
    });

    it('respeita excludedTestCaseIds em execução de lote', async () => {
      prisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1', suiteId: null, batchId: 'batch-1', testCases: [],
      });
      prisma.executionBatch.findUnique.mockResolvedValue({
        id: 'batch-1', suiteIds: ['suite-1'], excludedTestCaseIds: ['tc-2'],
      });
      mockSuites(
        [{ id: 'suite-1', jiraKey: 'ABC-1', projectId: 'proj-1' }],
        [{
          id: 'suite-1',
          testCases: [
            { id: 'tc-1', jiraKey: 'ABC-10', title: 'Caso A', scenarioTemplates: [] },
            { id: 'tc-2', jiraKey: 'ABC-11', title: 'Caso B', scenarioTemplates: [] },
          ],
        }],
      );
      prisma.executionTestCase.create.mockResolvedValue({ id: 'etc-novo' });
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      const result = await service.syncExecution('exec-1', 'user-1', 'Katia');

      expect(result.addedTestCases).toEqual([{ jiraKey: 'ABC-10', title: 'Caso A' }]);
      expect(prisma.executionTestCase.create).toHaveBeenCalledTimes(1);
    });

    it('coleta falha do Jira em jiraFailed e segue com o diff local', async () => {
      prisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1', suiteId: 'suite-1', batchId: null, testCases: [],
      });
      suitesService.importFromJira.mockRejectedValue(new HttpException('Suíte não encontrada no Jira.', 404));
      mockSuites(
        [{ id: 'suite-1', jiraKey: 'ABC-1', projectId: 'proj-1' }],
        [{
          id: 'suite-1',
          testCases: [{ id: 'tc-1', jiraKey: 'ABC-10', title: 'Caso A', scenarioTemplates: [] }],
        }],
      );
      prisma.executionTestCase.create.mockResolvedValue({ id: 'etc-novo' });
      prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
      prisma.execution.update.mockResolvedValue({});

      const result = await service.syncExecution('exec-1', 'user-1', 'Katia');

      expect(result.jiraFailed).toEqual([{ key: 'ABC-1', error: 'Suíte não encontrada no Jira.' }]);
      expect(result.addedTestCases).toEqual([{ jiraKey: 'ABC-10', title: 'Caso A' }]);
    });

    it('não chama o Jira para suíte manual', async () => {
      prisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1', suiteId: 'suite-1', batchId: null, testCases: [],
      });
      mockSuites(
        [{ id: 'suite-1', jiraKey: null, projectId: 'proj-1' }],
        [{ id: 'suite-1', testCases: [] }],
      );

      const result = await service.syncExecution('exec-1', 'user-1', 'Katia');

      expect(suitesService.importFromJira).not.toHaveBeenCalled();
      expect(result.jiraFailed).toEqual([]);
    });
  });
});
