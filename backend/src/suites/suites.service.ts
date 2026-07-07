import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class SuitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  async findAll(projectId?: string) {
    return this.prisma.suite.findMany({
      where: projectId ? { projectId } : {},
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
          include: { scenarioTemplates: { orderBy: { createdAt: 'asc' } } },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          include: {
            testCases: {
              select: { status: true, scenarios: { select: { status: true } } },
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

  async createManual(title: string, projectId: string) {
    const count = await this.prisma.suite.count({ where: { isManual: true, projectId } });
    const manualKey = `SUITE-${String(count + 1).padStart(3, '0')}`;
    const suite = await this.prisma.suite.create({
      data: { title, isManual: true, manualKey, projectId },
    });
    return this.findOne(suite.id);
  }

  async addTestCase(suiteId: string, jiraKey: string, userId: string) {
    await this.findOne(suiteId);

    const key = jiraKey.trim().toUpperCase();

    const existing = await this.prisma.testCase.findFirst({
      where: { suiteId, jiraKey: key },
    });
    if (existing) {
      throw new HttpException(
        `O caso de teste '${key}' já existe nesta suíte.`,
        HttpStatus.CONFLICT,
      );
    }

    const issue = await this.jiraService.fetchIssue(userId, key);

    return this.prisma.testCase.create({
      data: {
        jiraKey: issue.key,
        title: issue.title,
        link: issue.link,
        priority: issue.priority,
        suiteId,
      },
    });
  }

  async addScenarioTemplate(tcId: string, name: string) {
    const tc = await this.prisma.testCase.findUnique({
      where: { id: tcId },
      include: { scenarioTemplates: true },
    });
    if (!tc) throw new HttpException('Caso de teste não encontrado.', HttpStatus.NOT_FOUND);
    const exists = tc.scenarioTemplates.some(t => t.name === name);
    if (exists) throw new HttpException(`Já existe um cenário com o nome "${name}" neste caso de teste.`, HttpStatus.CONFLICT);
    return this.prisma.testCaseScenario.create({ data: { testCaseId: tcId, name } });
  }

  async addScenarioTemplateBatch(tcId: string, names: string[]) {
    const tc = await this.prisma.testCase.findUnique({
      where: { id: tcId },
      include: { scenarioTemplates: true },
    });
    if (!tc) throw new HttpException('Caso de teste não encontrado.', HttpStatus.NOT_FOUND);
    const existingNames = new Set(tc.scenarioTemplates.map(t => t.name));
    const seen = new Set<string>();
    const created = [];
    const skipped: string[] = [];
    for (const name of names) {
      if (existingNames.has(name) || seen.has(name)) {
        skipped.push(name);
      } else {
        seen.add(name);
        created.push(await this.prisma.testCaseScenario.create({ data: { testCaseId: tcId, name } }));
      }
    }
    return { created, skipped };
  }

  async deleteScenarioTemplate(templateId: string) {
    const t = await this.prisma.testCaseScenario.findUnique({ where: { id: templateId } });
    if (!t) throw new HttpException('Template de cenário não encontrado.', HttpStatus.NOT_FOUND);
    await this.prisma.testCaseScenario.delete({ where: { id: templateId } });
    return { success: true };
  }

  async importFromJira(jiraKey: string, userId: string, projectId: string) {
    const key = jiraKey.trim().toUpperCase();

    // 1. Buscar do Jira
    const jiraData = await this.jiraService.importSuite(userId, key);

    // 2. Criar ou atualizar a Suite no banco
    const suite = await this.prisma.suite.upsert({
      where: { projectId_jiraKey: { projectId, jiraKey: key } },
      update: { title: jiraData.suiteTitle },
      create: {
        jiraKey: key,
        title: jiraData.suiteTitle,
        projectId,
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

    const execCount = await this.prisma.executionTestCase.count({
      where: { testCaseId: id },
    });
    if (execCount > 0) {
      throw new HttpException(
        'Este caso de teste possui histórico de execuções e não pode ser excluído.',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.testCase.delete({
      where: { id },
    });
    return { success: true, message: 'Caso de teste excluído localmente!' };
  }
}
