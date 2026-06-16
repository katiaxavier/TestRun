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

export class CreateBatchExecutionDto {
  suiteIds!: string[];
  name?: string;
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
  responsible?: string;
}

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        suite: true,
        testCases: {
          include: {
            testCase: true,
            issues: true,
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
      include: { testCases: true },
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
        status: 'IN_PROGRESS',
      },
    });

    // 3. Vincular casos de teste da suite na execução
    for (const tc of suite.testCases) {
      await this.prisma.executionTestCase.create({
        data: {
          executionId: execution.id,
          testCaseId: tc.id,
          status: 'PENDING',
          responsible: dto.responsible, // pré-define o responsável geral da execução
        },
      });
    }

    return this.findOne(execution.id);
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
        responsible: dto.responsible || null,
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

  async createBatch(dto: CreateBatchExecutionDto) {
    if (!dto.suiteIds || dto.suiteIds.length === 0) {
      throw new HttpException(
        'Selecione ao menos uma suite para criar o lote.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const suites = await this.prisma.suite.findMany({
      where: { id: { in: dto.suiteIds } },
      include: { testCases: true },
    });

    if (suites.length !== dto.suiteIds.length) {
      throw new HttpException(
        'Uma ou mais suites não foram encontradas.',
        HttpStatus.NOT_FOUND,
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
      include: { testCases: { orderBy: { jiraKey: 'asc' } } },
    });

    const execution = await this.prisma.execution.create({
      data: {
        batchId: batch.id,
        sprint: dto.sprint,
        version: dto.version || '',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        responsible: dto.responsible,
        status: 'IN_PROGRESS',
      },
    });

    for (const suite of suites) {
      for (const tc of suite.testCases) {
        if (excluded.includes(tc.id)) continue;
        await this.prisma.executionTestCase.create({
          data: {
            executionId: execution.id,
            testCaseId: tc.id,
            status: 'PENDING',
            responsible: dto.responsible,
          },
        });
      }
    }

    await this.prisma.executionBatch.update({
      where: { id: batchId },
      data: { status: 'IN_PROGRESS' },
    });

    return this.findBatch(batchId);
  }

  async findBatch(id: string) {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id },
      include: {
        executions: {
          include: {
            suite: true,
            testCases: {
              include: { testCase: true, issues: true },
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
      include: { executions: { select: { id: true } } },
    });

    if (!batch) {
      throw new HttpException('Lote não encontrado.', HttpStatus.NOT_FOUND);
    }

    const excluded = (batch.excludedTestCaseIds as string[]) ?? [];
    if (!excluded.includes(testCaseId)) {
      await this.prisma.executionBatch.update({
        where: { id: batchId },
        data: { excludedTestCaseIds: [...excluded, testCaseId] as any },
      });
    }

    // Remove o caso de teste de todas as execuções do lote
    const executionIds = batch.executions.map((e) => e.id);
    if (executionIds.length > 0) {
      await this.prisma.executionTestCase.deleteMany({
        where: {
          executionId: { in: executionIds },
          testCaseId,
        },
      });
    }

    return { success: true };
  }

  async findAllBatches() {
    const batches = await this.prisma.executionBatch.findMany({
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
          select: { id: true, jiraKey: true, title: true },
        });
        return { ...batch, suites };
      }),
    );
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
