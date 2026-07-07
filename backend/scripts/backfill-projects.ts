import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import type { Suite } from '@prisma/client';

const MANUAL_PROJECT = {
  jiraProjectId: 'manual',
  jiraProjectKey: 'MANUAL',
  name: 'Suítes Manuais',
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);

  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    console.error(
      'Nenhum usuário encontrado. Faça login no TestRun (Fase 1) antes de rodar o backfill.',
    );
    await app.close();
    process.exit(1);
  }

  const accessToken = await authService.getValidAccessToken(user.id);
  const { cloudId } = await authService.resolveSite(accessToken);
  const apiBaseUrl = `https://api.atlassian.com/ex/jira/${cloudId}`;

  const suites = await prisma.suite.findMany();

  const keyToSuites = new Map<string, Suite[]>();
  for (const suite of suites) {
    const key = suite.isManual ? 'MANUAL' : (suite.jiraKey?.split('-')[0] ?? null);
    if (!key) {
      console.warn(`Suíte ${suite.id} (${suite.title}) sem jiraKey e não-manual — pulando.`);
      continue;
    }
    if (!keyToSuites.has(key)) keyToSuites.set(key, []);
    keyToSuites.get(key)!.push(suite);
  }

  const summary = { projects: 0, suitesLinked: 0, batchesLinked: 0, fallbacks: [] as string[] };

  for (const [key, groupSuites] of keyToSuites) {
    let project;

    if (key === 'MANUAL') {
      project = await prisma.project.upsert({
        where: { jiraProjectKey: MANUAL_PROJECT.jiraProjectKey },
        update: {},
        create: MANUAL_PROJECT,
      });
    } else {
      let jiraProjectId: string = key;
      let name: string = key;
      try {
        const res = await fetch(`${apiBaseUrl}/rest/api/3/project/${key}`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          jiraProjectId = data.id;
          name = data.name;
        } else {
          summary.fallbacks.push(key);
          console.warn(`Projeto '${key}' não encontrado no Jira (status ${res.status}). Usando fallback.`);
        }
      } catch (err) {
        summary.fallbacks.push(key);
        console.warn(`Falha ao buscar projeto '${key}' no Jira: ${err instanceof Error ? err.message : err}. Usando fallback.`);
      }
      project = await prisma.project.upsert({
        where: { jiraProjectKey: key },
        update: { jiraProjectId, name },
        create: { jiraProjectId, jiraProjectKey: key, name },
      });
    }

    summary.projects++;

    for (const suite of groupSuites) {
      await prisma.suite.update({ where: { id: suite.id }, data: { projectId: project.id } });
      summary.suitesLinked++;
    }
  }

  const suiteProjectMap = new Map<string, string>();
  for (const s of await prisma.suite.findMany()) {
    if (s.projectId) suiteProjectMap.set(s.id, s.projectId);
  }

  const batches = await prisma.executionBatch.findMany();
  for (const batch of batches) {
    const suiteIds = (batch.suiteIds as string[]) ?? [];
    const projectId = suiteIds.map((id) => suiteProjectMap.get(id)).find(Boolean);
    if (!projectId) {
      console.warn(`Lote ${batch.id} (${batch.name ?? 'sem nome'}) sem suites vinculadas a um projeto — pulando.`);
      continue;
    }
    await prisma.executionBatch.update({ where: { id: batch.id }, data: { projectId } });
    summary.batchesLinked++;
  }

  console.log('\n--- Resumo do backfill ---');
  console.log(`Projetos (criados/atualizados): ${summary.projects}`);
  console.log(`Suítes vinculadas: ${summary.suitesLinked}`);
  console.log(`Lotes vinculados: ${summary.batchesLinked}`);
  if (summary.fallbacks.length > 0) {
    console.log(`Projetos criados via fallback (revisar manualmente): ${summary.fallbacks.join(', ')}`);
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
