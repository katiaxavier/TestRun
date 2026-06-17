import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class SuitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  async findAll() {
    return this.prisma.suite.findMany({
      include: {
        _count: {
          select: { testCases: true, executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const suite = await this.prisma.suite.findUnique({
      where: { id },
      include: {
        _count: {
          select: { testCases: true, executions: true },
        },
        testCases: {
          orderBy: { jiraKey: 'asc' },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          include: {
            testCases: {
              select: { status: true },
            },
          },
        },
      },
    });

    if (!suite) {
      throw new HttpException('Suíte não encontrada.', HttpStatus.NOT_FOUND);
    }
    return suite;
  }

  async importFromJira(jiraKey: string) {
    const key = jiraKey.trim().toUpperCase();

    // 1. Buscar do Jira
    const jiraData = await this.jiraService.importSuite(key);

    // 2. Criar ou atualizar a Suite no banco
    const suite = await this.prisma.suite.upsert({
      where: { jiraKey: key },
      update: { title: jiraData.suiteTitle },
      create: {
        jiraKey: key,
        title: jiraData.suiteTitle,
      },
    });

    // 3. Importar os Casos de Teste vinculados
    const currentTestCases = await this.prisma.testCase.findMany({
      where: { suiteId: suite.id },
    });

    const currentKeys = new Set(currentTestCases.map((tc) => tc.jiraKey));

    for (const tc of jiraData.testCases) {
      if (!currentKeys.has(tc.key)) {
        // Criar caso de teste novo
        await this.prisma.testCase.create({
          data: {
            jiraKey: tc.key,
            title: tc.title,
            link: tc.link,
            priority: tc.priority,
            suiteId: suite.id,
          },
        });
      } else {
        // Atualizar título do caso existente se mudou
        await this.prisma.testCase.updateMany({
          where: { suiteId: suite.id, jiraKey: tc.key },
          data: { title: tc.title, link: tc.link, priority: tc.priority },
        });
      }
    }

    return this.findOne(suite.id);
  }

  async deleteSuite(id: string) {
    await this.findOne(id); // Valida existência

    const batches = await this.prisma.executionBatch.findMany({
      select: { id: true, name: true, suiteIds: true },
    });

    const affectedBatches = batches.filter((b) =>
      (b.suiteIds as string[]).includes(id),
    );

    if (affectedBatches.length > 0) {
      const names = affectedBatches
        .map((b) => b.name || b.id)
        .join(', ');
      throw new HttpException(
        `Esta suíte faz parte de ${affectedBatches.length === 1 ? 'um lote' : 'lotes'}: ${names}. Exclua o lote antes de excluir a suíte.`,
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.suite.delete({
      where: { id },
    });
    return { success: true, message: 'Suíte excluída com sucesso!' };
  }

  async deleteTestCase(id: string) {
    const tc = await this.prisma.testCase.findUnique({
      where: { id },
    });
    if (!tc) {
      throw new HttpException(
        'Caso de teste não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.testCase.delete({
      where: { id },
    });
    return { success: true, message: 'Caso de teste excluído localmente!' };
  }
}
