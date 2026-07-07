import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JiraService } from '../src/jira/jira.service';
import { BoardsService } from '../src/boards/boards.service';

const MANUAL_PROJECT_JIRA_ID = 'manual';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const jiraService = app.get(JiraService);
  const boardsService = app.get(BoardsService);

  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    console.error('Nenhum usuário encontrado. Faça login no TestRun antes de rodar o backfill.');
    await app.close();
    process.exit(1);
  }

  const projects = await prisma.project.findMany({
    where: { jiraProjectId: { not: MANUAL_PROJECT_JIRA_ID } },
  });

  const summary = { projects: 0, boards: 0, suitesLinked: 0, batchesLinked: 0 };

  for (const project of projects) {
    const { boards } = await boardsService.listForProject(user.id, project.id);
    summary.projects++;
    summary.boards += boards.length;

    for (const board of boards) {
      let keys: string[];
      try {
        keys = await jiraService.searchSuitesByBoard(user.id, board.jiraBoardId);
      } catch (err) {
        console.warn(
          `Falha ao buscar suítes do quadro '${board.name}' (${board.jiraBoardId}): ${err instanceof Error ? err.message : err}`,
        );
        continue;
      }

      if (keys.length === 0) continue;

      // Não sobrescreve: uma suíte pode aparecer em mais de um quadro do Jira ao mesmo
      // tempo (ex.: "PD-Anflex" e "PD-Anflex - Objetivos PI" mostraram exatamente as
      // mesmas 60 issues). `connect` adiciona a associação sem remover outras já feitas.
      const matchingSuites = await prisma.suite.findMany({
        where: { projectId: project.id, jiraKey: { in: keys } },
        select: { id: true },
      });
      for (const suite of matchingSuites) {
        await prisma.suite.update({
          where: { id: suite.id },
          data: { boards: { connect: { id: board.id } } },
        });
      }
      summary.suitesLinked += matchingSuites.length;
    }
  }

  const suiteBoardMap = new Map<string, string>();
  for (const s of await prisma.suite.findMany({ include: { boards: { select: { id: true } } } })) {
    if (s.boards.length > 0) suiteBoardMap.set(s.id, s.boards[0].id);
  }

  const batches = await prisma.executionBatch.findMany();
  for (const batch of batches) {
    const suiteIds = (batch.suiteIds as string[]) ?? [];
    const boardId = suiteIds.map((id) => suiteBoardMap.get(id)).find(Boolean);
    if (!boardId) continue;
    await prisma.executionBatch.update({ where: { id: batch.id }, data: { boardId } });
    summary.batchesLinked++;
  }

  console.log('\n--- Resumo do backfill de quadros ---');
  console.log(`Projetos processados: ${summary.projects}`);
  console.log(`Quadros encontrados: ${summary.boards}`);
  console.log(`Suítes recategorizadas: ${summary.suitesLinked}`);
  console.log(`Lotes recategorizados: ${summary.batchesLinked}`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
