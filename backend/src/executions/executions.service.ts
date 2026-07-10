import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateExecutionDto {
  suiteId!: string;
  sprint!: string;
  version?: string;
  startDate!: string;
  endDate!: string;
  responsible!: string;
}

export class UpdateExecutionDto {
  sprint?: string;
  version?: string;
  startDate?: string;
  endDate?: string;
  responsible?: string;
}

export class CreateBatchExecutionDto {
  suiteIds!: string[];
  name?: string;
  projectId!: string;
  boardId?: string;
}

export class CreateBatchExecutionItemDto {
  sprint!: string;
  version?: string;
  startDate!: string;
  endDate!: string;
  responsible!: string;
}

export class UpdateTestCaseDto {
  status?: string;
  responsible?: string;
  comments?: string;
}

export class CreateIssueDto {
  type!: string; // BUG, IMPROVEMENT
  jiraKey?: string;
  title!: string;
  severity?: string;
  status?: string;
}

export class UpdateIssueDto {
  type?: string;
  jiraKey?: string | null;
  title?: string;
  severity?: string;
  status?: string;
}

export class CreateScenarioDto {
  name!: string;
}

export class UpdateScenarioDto {
  name?: string;
  status?: string;
  comments?: string;
}

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  // boardId === 'none' é o pseudo-quadro "Sem quadro" (suítes/lotes sem quadro no banco).
  async findRecentExecutions(projectId: string, boardId?: string, status?: string, limit = 3) {
    const boardFilterSuite =
      boardId === 'none' ? { boards: { none: {} } } : boardId ? { boards: { some: { id: boardId } } } : {};
    const boardFilterBatch = boardId === 'none' ? { boardId: null } : boardId ? { boardId } : {};

    return this.prisma.execution.findMany({
      where: {
        OR: [
          { suite: { projectId, ...boardFilterSuite } },
          { batch: { projectId, ...boardFilterBatch } },
        ],
        ...(status ? { status: status.toUpperCase() } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 3, 50),
      include: {
        suite: { select: { id: true, jiraKey: true, manualKey: true, title: true } },
        batch: { select: { id: true, name: true } },
        testCases: { select: { status: true, scenarios: { select: { status: true } } } },
      },
    });
  }

  // Histórico completo e paginado de execuções (tela "Todas as Execuções"), em contraste com
  // findRecentExecutions acima, que serve o widget de home com um limite fixo pequeno.
  async findAllExecutions(
    projectId: string,
    boardId?: string,
    status?: string,
    periodStart?: string,
    periodEnd?: string,
    page = 1,
    pageSize = 25,
  ) {
    const boardFilterSuite =
      boardId === 'none' ? { boards: { none: {} } } : boardId ? { boards: { some: { id: boardId } } } : {};
    const boardFilterBatch = boardId === 'none' ? { boardId: null } : boardId ? { boardId } : {};

    const where = {
      OR: [
        { suite: { projectId, ...boardFilterSuite } },
        { batch: { projectId, ...boardFilterBatch } },
      ],
      ...(status ? { status: status.toUpperCase() } : {}),
      ...(periodStart ? { startDate: { gte: new Date(periodStart) } } : {}),
      ...(periodEnd ? { endDate: { lte: new Date(periodEnd) } } : {}),
    };

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.execution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          suite: { select: { id: true, jiraKey: true, manualKey: true, title: true } },
          batch: { select: { id: true, name: true } },
          testCases: { select: { status: true, scenarios: { select: { status: true } } } },
        },
      }),
      this.prisma.execution.count({ where }),
    ]);

    return { data, total, page: Math.max(page, 1), pageSize: take };
  }

  async findOne(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        suite: true,
        testCases: {
          include: {
            testCase: true,
            issues: true,
            scenarios: {
              include: { issues: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: {
            testCase: {
              jiraKey: 'asc',
            },
          },
        },
      },
    });

    if (!execution) {
      throw new HttpException(
        'Ciclo de execução não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return execution;
  }

  async create(dto: CreateExecutionDto) {
    // 1. Validar suite
    const suite = await this.prisma.suite.findUnique({
      where: { id: dto.suiteId },
      include: { testCases: { include: { scenarioTemplates: true } } },
    });

    if (!suite) {
      throw new HttpException(
        'Suíte de testes não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (suite.testCases.length === 0) {
      throw new HttpException(
        'A suíte de testes não possui nenhum caso de teste importado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Criar execução
    const execution = await this.prisma.execution.create({
      data: {
        suiteId: dto.suiteId,
        sprint: dto.sprint,
        version: dto.version || '',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        responsible: dto.responsible,
        status: 'PENDING',
      },
    });

    // 3. Vincular casos de teste da suite na execução, copiando cenários template
    for (const tc of suite.testCases) {
      const etc = await this.prisma.executionTestCase.create({
        data: {
          executionId: execution.id,
          testCaseId: tc.id,
          status: 'PENDING',
          responsible: dto.responsible,
        },
      });
      for (const template of (tc as any).scenarioTemplates ?? []) {
        await this.prisma.scenario.create({
          data: {
            executionTestCaseId: etc.id,
            templateId: template.id,
            name: template.name,
            status: 'PENDING',
          },
        });
      }
    }

    return this.findOne(execution.id);
  }

  private async recomputeTestCaseStatus(etcId: string): Promise<string> {
    const scenarios = await this.prisma.scenario.findMany({
      where: { executionTestCaseId: etcId },
      select: { status: true },
    });

    const statuses = scenarios.map((s) => s.status);
    let status: string;

    if (statuses.every((s) => s === 'PENDING')) status = 'PENDING';
    else if (statuses.some((s) => s === 'FAILED')) status = 'FAILED';
    else if (statuses.some((s) => s === 'BLOCKED')) status = 'BLOCKED';
    else if (statuses.every((s) => s === 'PASSED')) status = 'PASSED';
    else status = 'IN_PROGRESS';

    const updated = await this.prisma.executionTestCase.update({
      where: { id: etcId },
      data: { status },
    });

    return updated.executionId;
  }

  private async recomputeExecutionStatus(executionId: string) {
    const testCases = await this.prisma.executionTestCase.findMany({
      where: { executionId },
      select: { status: true },
    });

    const allPending = testCases.every((tc) => tc.status === 'PENDING');
    const allDone = testCases.every((tc) => tc.status !== 'PENDING');

    const status = allPending ? 'PENDING' : allDone ? 'COMPLETED' : 'IN_PROGRESS';

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status },
    });
  }

  async updateTestCase(execTestCaseId: string, dto: UpdateTestCaseDto) {
    const etc = await this.prisma.executionTestCase.findUnique({
      where: { id: execTestCaseId },
    });

    if (!etc) {
      throw new HttpException(
        'Item de execução de teste não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.executionTestCase.update({
      where: { id: execTestCaseId },
      data: {
        status: dto.status !== undefined ? dto.status.toUpperCase() : undefined,
        responsible:
          dto.responsible !== undefined ? dto.responsible : undefined,
        comments: dto.comments !== undefined ? dto.comments : undefined,
      },
      include: {
        testCase: true,
        issues: true,
      },
    });

    await this.recomputeExecutionStatus(etc.executionId);

    return updated;
  }

  async addIssue(execTestCaseId: string, dto: CreateIssueDto) {
    const etc = await this.prisma.executionTestCase.findUnique({
      where: { id: execTestCaseId },
    });

    if (!etc) {
      throw new HttpException(
        'Item de execução de teste não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    const issue = await this.prisma.issue.create({
      data: {
        executionTestCaseId: execTestCaseId,
        type: dto.type.toUpperCase(),
        jiraKey: dto.jiraKey || null,
        title: dto.title,
        severity: dto.severity || null,
        status: dto.status || 'Open',
      },
    });

    return issue;
  }

  async removeTestCaseFromExecution(executionId: string, etcId: string) {
    const etc = await this.prisma.executionTestCase.findUnique({
      where: { id: etcId },
    });

    if (!etc || etc.executionId !== executionId) {
      throw new HttpException(
        'Item de execução não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.executionTestCase.delete({ where: { id: etcId } });

    return { success: true };
  }

  async removeIssue(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new HttpException('Issue não encontrada.', HttpStatus.NOT_FOUND);
    }

    await this.prisma.issue.delete({
      where: { id: issueId },
    });

    return { success: true, message: 'Issue removida com sucesso!' };
  }

  async updateIssue(issueId: string, dto: UpdateIssueDto) {
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      throw new HttpException('Issue não encontrada.', HttpStatus.NOT_FOUND);
    }
    return this.prisma.issue.update({ where: { id: issueId }, data: dto });
  }

  async delete(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new HttpException(
        'Ciclo de execução não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.execution.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Ciclo de execução excluído com sucesso!',
    };
  }

  async updateStatus(id: string, status: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new HttpException(
        'Ciclo de execução não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.execution.update({
      where: { id },
      data: { status: status.toUpperCase() },
    });
  }

  async update(id: string, dto: UpdateExecutionDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new HttpException(
        'Ciclo de execução não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.execution.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      },
    });

    return this.findOne(id);
  }

  async createBatch(dto: CreateBatchExecutionDto) {
    if (!dto.suiteIds || dto.suiteIds.length === 0) {
      throw new HttpException(
        'Selecione ao menos uma suite para criar o lote.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!dto.projectId) {
      throw new HttpException('O projeto é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    const suites = await this.prisma.suite.findMany({
      where: { id: { in: dto.suiteIds } },
      include: { testCases: true, boards: true },
    });

    if (suites.length !== dto.suiteIds.length) {
      throw new HttpException(
        'Uma ou mais suites não foram encontradas.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (suites.some((s) => s.projectId !== dto.projectId)) {
      throw new HttpException(
        'Todas as suites do lote devem pertencer ao mesmo projeto.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.boardId && suites.some((s) => !s.boards.some((b) => b.id === dto.boardId))) {
      throw new HttpException(
        'Todas as suites do lote devem pertencer ao quadro selecionado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (suites.some((s) => s.testCases.length === 0)) {
      throw new HttpException(
        'Todas as suites devem possuir casos de teste importados.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.executionBatch.create({
      data: {
        name: dto.name || null,
        suiteIds: dto.suiteIds as any,
        status: 'PENDING',
        projectId: dto.projectId,
        boardId: dto.boardId,
      },
      include: { executions: true },
    });
  }

  async createBatchExecution(batchId: string, dto: CreateBatchExecutionItemDto) {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new HttpException('Lote não encontrado.', HttpStatus.NOT_FOUND);
    }

    const suiteIds = (batch.suiteIds as string[]) ?? [];
    const excluded = (batch.excludedTestCaseIds as string[]) ?? [];
    const suites = await this.prisma.suite.findMany({
      where: { id: { in: suiteIds } },
      include: { testCases: { include: { scenarioTemplates: true }, orderBy: { jiraKey: 'asc' } } },
    });

    const execution = await this.prisma.execution.create({
      data: {
        batchId: batch.id,
        sprint: dto.sprint,
        version: dto.version || '',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        responsible: dto.responsible,
        status: 'PENDING',
      },
    });

    for (const suite of suites) {
      for (const tc of suite.testCases) {
        if (excluded.includes(tc.id)) continue;
        const etc = await this.prisma.executionTestCase.create({
          data: {
            executionId: execution.id,
            testCaseId: tc.id,
            status: 'PENDING',
            responsible: dto.responsible,
          },
        });
        for (const template of (tc as any).scenarioTemplates ?? []) {
          await this.prisma.scenario.create({
            data: {
              executionTestCaseId: etc.id,
              templateId: template.id,
              name: template.name,
              status: 'PENDING',
            },
          });
        }
      }
    }

    await this.prisma.executionBatch.update({
      where: { id: batchId },
      data: { status: 'IN_PROGRESS' },
    });

    return execution;
  }

  async findBatch(id: string) {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id },
      include: {
        executions: {
          include: {
            suite: true,
            testCases: {
              include: {
                testCase: true,
                issues: true,
                scenarios: { include: { issues: true }, orderBy: { createdAt: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new HttpException('Batch não encontrado.', HttpStatus.NOT_FOUND);
    }

    return batch;
  }

  async removeTestCaseFromBatch(batchId: string, testCaseId: string) {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new HttpException('Lote não encontrado.', HttpStatus.NOT_FOUND);
    }

    const suiteIds = (batch.suiteIds as string[]) ?? [];
    const excluded = (batch.excludedTestCaseIds as string[]) ?? [];

    if (excluded.includes(testCaseId)) {
      return { success: true };
    }

    const suites = await this.prisma.suite.findMany({
      where: { id: { in: suiteIds } },
      include: { testCases: { select: { id: true } } },
    });

    const allActiveTcIds = suites
      .flatMap((s) => s.testCases.map((tc) => tc.id))
      .filter((id) => !excluded.includes(id));

    if (allActiveTcIds.length === 1 && allActiveTcIds[0] === testCaseId) {
      throw new HttpException(
        'Não é possível remover o último caso de teste do lote. Exclua o lote inteiro caso queira encerrá-lo.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newExcluded = [...excluded, testCaseId];

    const newSuiteIds = suiteIds.filter((sid) => {
      const suite = suites.find((s) => s.id === sid);
      if (!suite) return false;
      return suite.testCases.some((tc) => !newExcluded.includes(tc.id));
    });

    await this.prisma.executionBatch.update({
      where: { id: batchId },
      data: {
        excludedTestCaseIds: newExcluded as any,
        suiteIds: newSuiteIds as any,
      },
    });

    return { success: true };
  }

  // boardId === 'none' é o pseudo-quadro "Sem quadro" (lotes com boardId nulo no banco).
  async findAllBatches(projectId?: string, boardId?: string) {
    const where: { projectId?: string; boardId?: string | null } = {};
    if (projectId) where.projectId = projectId;
    if (boardId === 'none') where.boardId = null;
    else if (boardId) where.boardId = boardId;

    const batches = await this.prisma.executionBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          include: {
            _count: { select: { testCases: true } },
          },
        },
      },
    });

    return Promise.all(
      batches.map(async (batch) => {
        const suiteIds = (batch.suiteIds as string[]) ?? [];
        const suites = await this.prisma.suite.findMany({
          where: { id: { in: suiteIds } },
          select: { id: true, jiraKey: true, manualKey: true, title: true, _count: { select: { testCases: true } } },
        });
        return { ...batch, suites };
      }),
    );
  }

  async createScenario(etcId: string, dto: CreateScenarioDto) {
    const etc = await this.prisma.executionTestCase.findUnique({
      where: { id: etcId },
      include: { issues: true, scenarios: true },
    });
    if (!etc) throw new HttpException('Item de execução não encontrado.', HttpStatus.NOT_FOUND);

    const nameExists = etc.scenarios.some(s => s.name === dto.name);
    if (nameExists) throw new HttpException(`Já existe um cenário com o nome "${dto.name}" neste caso de teste.`, HttpStatus.CONFLICT);

    const isFirst = etc.scenarios.length === 0;

    if (isFirst) {
      await this.prisma.executionTestCase.update({
        where: { id: etcId },
        data: { originalStatus: etc.status },
      });
    }

    // Flow 5b: reutiliza template existente na suíte se houver com o mesmo nome
    let template = await this.prisma.testCaseScenario.findFirst({
      where: { testCaseId: etc.testCaseId, name: dto.name },
    });
    const templateCreated = !template;
    if (!template) {
      template = await this.prisma.testCaseScenario.create({
        data: { testCaseId: etc.testCaseId, name: dto.name },
      });
    }

    const scenario = await this.prisma.scenario.create({
      data: {
        executionTestCaseId: etcId,
        templateId: template.id,
        name: dto.name,
        status: 'PENDING',
      },
      include: { issues: true },
    });

    if (isFirst && etc.issues.length > 0) {
      await this.prisma.issue.updateMany({
        where: { executionTestCaseId: etcId },
        data: { executionTestCaseId: null, scenarioId: scenario.id },
      });
    }

    const scenarioResult = await this.prisma.scenario.findUnique({
      where: { id: scenario.id },
      include: { issues: true },
    });
    return { scenario: scenarioResult, templateCreated };
  }

  async createScenarioBatch(etcId: string, names: string[]) {
    const etc = await this.prisma.executionTestCase.findUnique({
      where: { id: etcId },
      include: { issues: true, scenarios: true },
    });
    if (!etc) throw new HttpException('Item de execução não encontrado.', HttpStatus.NOT_FOUND);

    const existingNames = new Set(etc.scenarios.map(s => s.name));
    const seen = new Set<string>();
    const validNames: string[] = [];
    const skipped: string[] = [];

    for (const name of names) {
      if (existingNames.has(name) || seen.has(name)) {
        skipped.push(name);
      } else {
        seen.add(name);
        validNames.push(name);
      }
    }

    if (validNames.length === 0) return { created: [], skipped };

    const isFirst = etc.scenarios.length === 0;

    if (isFirst) {
      await this.prisma.executionTestCase.update({
        where: { id: etcId },
        data: { originalStatus: etc.status },
      });
    }

    const created: any[] = [];
    for (const name of validNames) {
      // Flow 5b: reutiliza template existente na suíte se houver com o mesmo nome
      let template = await this.prisma.testCaseScenario.findFirst({
        where: { testCaseId: etc.testCaseId, name },
      });
      if (!template) {
        template = await this.prisma.testCaseScenario.create({
          data: { testCaseId: etc.testCaseId, name },
        });
      }
      const scenario = await this.prisma.scenario.create({
        data: { executionTestCaseId: etcId, templateId: template.id, name, status: 'PENDING' },
        include: { issues: true },
      });
      created.push(scenario);
    }

    if (isFirst && etc.issues.length > 0 && created.length > 0) {
      await this.prisma.issue.updateMany({
        where: { executionTestCaseId: etcId },
        data: { executionTestCaseId: null, scenarioId: created[0].id },
      });
      created[0] = await this.prisma.scenario.findUnique({
        where: { id: created[0].id },
        include: { issues: true },
      });
    }

    return { created, skipped };
  }

  async updateScenario(etcId: string, scenarioId: string, dto: UpdateScenarioDto) {
    const scenario = await this.prisma.scenario.findUnique({ where: { id: scenarioId } });
    if (!scenario || scenario.executionTestCaseId !== etcId)
      throw new HttpException('Cenário não encontrado.', HttpStatus.NOT_FOUND);

    const updated = await this.prisma.scenario.update({
      where: { id: scenarioId },
      data: {
        name: dto.name,
        status: dto.status ? dto.status.toUpperCase() : undefined,
        comments: dto.comments,
      },
      include: { issues: true },
    });

    if (dto.status !== undefined) {
      const executionId = await this.recomputeTestCaseStatus(etcId);
      await this.recomputeExecutionStatus(executionId);
    }

    return updated;
  }

  async deleteScenario(etcId: string, scenarioId: string) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { issues: true },
    });
    if (!scenario || scenario.executionTestCaseId !== etcId)
      throw new HttpException('Cenário não encontrado.', HttpStatus.NOT_FOUND);

    const remainingScenarios = await this.prisma.scenario.count({
      where: { executionTestCaseId: etcId, id: { not: scenarioId } },
    });
    const isLast = remainingScenarios === 0;

    if (isLast && scenario.issues.length > 0) {
      await this.prisma.issue.updateMany({
        where: { scenarioId },
        data: { scenarioId: null, executionTestCaseId: etcId },
      });
    }

    if (isLast) {
      const etc = await this.prisma.executionTestCase.findUnique({ where: { id: etcId } });
      if (etc?.originalStatus) {
        await this.prisma.executionTestCase.update({
          where: { id: etcId },
          data: { status: etc.originalStatus, originalStatus: null },
        });
      }
    }

    await this.prisma.scenario.delete({ where: { id: scenarioId } });

    return { success: true };
  }

  async deleteScenarioBatch(etcId: string, scenarioIds: string[]) {
    if (!scenarioIds?.length) return { deleted: 0 };

    const scenarios = await this.prisma.scenario.findMany({
      where: { id: { in: scenarioIds }, executionTestCaseId: etcId },
      include: { issues: true },
    });

    if (!scenarios.length) return { deleted: 0 };

    const remainingCount = await this.prisma.scenario.count({
      where: { executionTestCaseId: etcId, id: { notIn: scenarioIds } },
    });
    const isLast = remainingCount === 0;

    if (isLast) {
      if (scenarios.some(s => s.issues.length > 0)) {
        await this.prisma.issue.updateMany({
          where: { scenarioId: { in: scenarioIds } },
          data: { scenarioId: null, executionTestCaseId: etcId },
        });
      }
      const etc = await this.prisma.executionTestCase.findUnique({ where: { id: etcId } });
      if (etc?.originalStatus) {
        await this.prisma.executionTestCase.update({
          where: { id: etcId },
          data: { status: etc.originalStatus, originalStatus: null },
        });
      }
      await this.prisma.scenario.deleteMany({ where: { id: { in: scenarioIds }, executionTestCaseId: etcId } });
      // Recompute only execution status; test case status was already restored above
      const etc2 = await this.prisma.executionTestCase.findUnique({ where: { id: etcId } });
      if (etc2) await this.recomputeExecutionStatus(etc2.executionId);
    } else {
      await this.prisma.scenario.deleteMany({ where: { id: { in: scenarioIds }, executionTestCaseId: etcId } });
      const executionId = await this.recomputeTestCaseStatus(etcId);
      await this.recomputeExecutionStatus(executionId);
    }

    return { deleted: scenarios.length };
  }

  async addScenarioIssue(scenarioId: string, dto: CreateIssueDto) {
    const scenario = await this.prisma.scenario.findUnique({ where: { id: scenarioId } });
    if (!scenario) throw new HttpException('Cenário não encontrado.', HttpStatus.NOT_FOUND);
    return this.prisma.issue.create({
      data: {
        scenarioId,
        type: dto.type.toUpperCase(),
        jiraKey: dto.jiraKey || null,
        title: dto.title,
        severity: dto.severity || null,
        status: dto.status || 'Open',
      },
    });
  }

  async updateScenarioIssue(scenarioId: string, issueId: string, dto: UpdateIssueDto) {
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue || issue.scenarioId !== scenarioId)
      throw new HttpException('Issue não encontrada.', HttpStatus.NOT_FOUND);
    return this.prisma.issue.update({ where: { id: issueId }, data: dto });
  }

  async removeScenarioIssue(scenarioId: string, issueId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue || issue.scenarioId !== scenarioId)
      throw new HttpException('Issue não encontrada.', HttpStatus.NOT_FOUND);
    await this.prisma.issue.delete({ where: { id: issueId } });
    return { success: true };
  }

  async deleteBatch(id: string) {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      throw new HttpException('Batch não encontrado.', HttpStatus.NOT_FOUND);
    }

    await this.prisma.executionBatch.delete({
      where: { id },
    });

    return { success: true, message: 'Batch excluído com sucesso!' };
  }
}
