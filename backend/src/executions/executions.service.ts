import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateExecutionDto {
  suiteId!: string;
  sprint!: string;
  version!: string;
  startDate!: string;
  endDate!: string;
  testedFeature!: string;
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
      throw new HttpException('Ciclo de execução não encontrado.', HttpStatus.NOT_FOUND);
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
      throw new HttpException('Suíte de testes não encontrada.', HttpStatus.NOT_FOUND);
    }

    if (suite.testCases.length === 0) {
      throw new HttpException('A suíte de testes não possui nenhum caso de teste importado.', HttpStatus.BAD_REQUEST);
    }

    // 2. Criar execução
    const execution = await this.prisma.execution.create({
      data: {
        suiteId: dto.suiteId,
        sprint: dto.sprint,
        version: dto.version,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        testedFeature: dto.testedFeature,
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
      throw new HttpException('Item de execução de teste não encontrado.', HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.executionTestCase.update({
      where: { id: execTestCaseId },
      data: {
        status: dto.status !== undefined ? dto.status.toUpperCase() : undefined,
        responsible: dto.responsible !== undefined ? dto.responsible : undefined,
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
      throw new HttpException('Item de execução de teste não encontrado.', HttpStatus.NOT_FOUND);
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
      throw new HttpException('Ciclo de execução não encontrado.', HttpStatus.NOT_FOUND);
    }

    await this.prisma.execution.delete({
      where: { id },
    });

    return { success: true, message: 'Ciclo de execução excluído com sucesso!' };
  }

  async updateStatus(id: string, status: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new HttpException('Ciclo de execução não encontrado.', HttpStatus.NOT_FOUND);
    }

    return this.prisma.execution.update({
      where: { id },
      data: { status: status.toUpperCase() },
    });
  }
}
