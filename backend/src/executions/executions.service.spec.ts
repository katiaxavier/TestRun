import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ExecutionsService, CreateScenarioDto } from './executions.service';
import { PrismaService } from '../prisma/prisma.service';

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
      update: jest.fn(),
      findMany: jest.fn(),
    },
    scenario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    issue: {
      updateMany: jest.fn(),
    },
    execution: {
      update: jest.fn(),
    },
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ExecutionsService — Cenários', () => {
  let service: ExecutionsService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: PrismaService, useValue: prisma },
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
      expect(result).toHaveLength(3);
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

      it('usa PENDING como fallback quando originalStatus é nulo', async () => {
        const sc = makeScenario({ issues: [] });
        const etc = makeEtc({ originalStatus: null });

        prisma.scenario.findUnique.mockResolvedValue(sc);
        prisma.scenario.count.mockResolvedValue(0);
        prisma.executionTestCase.findUnique.mockResolvedValue(etc);
        prisma.scenario.delete.mockResolvedValue(sc);
        prisma.executionTestCase.update.mockResolvedValue({ ...etc, status: 'PENDING', originalStatus: null, executionId: 'exec-1' });
        prisma.executionTestCase.findMany.mockResolvedValue([{ status: 'PENDING' }]);
        prisma.execution.update.mockResolvedValue({});

        await service.deleteScenario('etc-1', 'sc-1');

        expect(prisma.executionTestCase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'PENDING' }),
          }),
        );
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

        // chama indiretamente via createScenario (scenarios.length > 0 → update recomputado)
        const etc = makeEtc({ scenarios: [scenarios[0]], issues: [] });
        prisma.executionTestCase.findUnique.mockResolvedValue(etc);
        prisma.scenario.create.mockResolvedValue(scenarios[scenarios.length - 1]);

        await service.createScenario('etc-1', { name: 'X' });

        expect(prisma.executionTestCase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: expected }),
          }),
        );
      });
    });
  });
});
