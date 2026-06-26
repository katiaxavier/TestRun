import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import * as ExcelJS from 'exceljs';

const PdfPrinter = require('pdfmake/src/printer');

const fonts = {
  DejaVuSans: {
    normal: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    italics: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
    bolditalics: '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf',
  },
};
const printer = new PdfPrinter(fonts);

// ── Paleta ───────────────────────────────────────────────────────────────────

const BLACK      = '161616';   // preto — título principal PDF e Excel
const GRAY_DARK  = '3F3F3F';   // cinza — section headers e table headers
const DARK_ORA   = 'DD4012';   // laranja escuro — destaque único (summary)
const CHUMBO     = '818B9D';   // chumbo — labels e subtítulos de suíte
const CREAM      = 'FFFEEE';   // creme — linhas alternadas (calor da marca)
const ORANGE_ACC = 'FF6002';   // laranja primário — links Jira

const SEVERITY_PT: Record<string, string> = {
  Trivial: 'Trivial', Normal: 'Normal', Low: 'Trivial', Medium: 'Médio', High: 'Alto', Critical: 'Crítico', Gravissima: 'Gravíssima',
};
const ISSUE_STATUS_PT: Record<string, string> = {
  Open: 'Aberto', 'In Progress': 'Em Andamento', Resolved: 'Resolvido', Cancelled: 'Cancelado',
};

const XL_BORDER_THIN = {
  top:    { style: 'thin' as const, color: { argb: 'C8D0D8' } },
  left:   { style: 'thin' as const, color: { argb: 'C8D0D8' } },
  bottom: { style: 'thin' as const, color: { argb: 'C8D0D8' } },
  right:  { style: 'thin' as const, color: { argb: 'C8D0D8' } },
};

const STATUS_ARGB: Record<string, string> = {
  PASSED:      'C6EFCE',
  FAILED:      'FFCCCC',
  BLOCKED:     'FFEB9C',
  IN_PROGRESS: 'BDD7EE',
  PENDING:     'EEEEEE',
};

const STATUS_PT: Record<string, string> = {
  PASSED:      'Passou',
  FAILED:      'Falhou',
  BLOCKED:     'Bloqueado',
  IN_PROGRESS: 'Em Andamento',
  PENDING:     'Pendente',
};

const STATUS_HEX: Record<string, string> = {
  PASSED:      '#E2EFDA',
  FAILED:      '#FCE4D6',
  BLOCKED:     '#FFF2CC',
  IN_PROGRESS: '#DDEBF7',
  PENDING:     '#F0F0F0',
};

const STATUS_LABEL: Record<string, string> = {
  PASSED:      'Passou',
  FAILED:      'Falhou',
  BLOCKED:     'Bloqueado',
  IN_PROGRESS: 'Em andamento',
  PENDING:     'Pendente',
};

// ── Helpers Excel ─────────────────────────────────────────────────────────────

function xlFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function xlTitleRow(ws: ExcelJS.Worksheet, merge: string, value: string, row: number) {
  ws.mergeCells(merge);
  const c = ws.getCell(`A${row}`);
  c.value = value;
  c.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFF' } };
  c.fill = xlFill(BLACK);
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 40;
}

function xlHeaderRow(row: ExcelJS.Row, count: number) {
  row.height = 24;
  for (let i = 1; i <= count; i++) {
    const c = row.getCell(i);
    c.fill = xlFill(GRAY_DARK);
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = {
      top:    { style: 'medium', color: { argb: GRAY_DARK } },
      left:   { style: 'thin',   color: { argb: '5A5A5A' } },
      bottom: { style: 'medium', color: { argb: GRAY_DARK } },
      right:  { style: 'thin',   color: { argb: '5A5A5A' } },
    };
  }
}

function xlDataRow(row: ExcelJS.Row, count: number, isEven: boolean, skipFill: number[] = []) {
  row.height = 18;
  const bg = isEven ? 'FFFFFF' : CREAM;
  for (let i = 1; i <= count; i++) {
    const c = row.getCell(i);
    if (!skipFill.includes(i)) c.fill = xlFill(bg);
    c.border = XL_BORDER_THIN;
  }
}

function xlMetaLabel(c: ExcelJS.Cell, text: string) {
  c.value = text;
  c.font = { name: 'Arial', size: 11, bold: true };
  c.fill = xlFill('F0F0F0');
  c.border = XL_BORDER_THIN;
  c.alignment = { vertical: 'middle' };
}

function xlMetaValue(c: ExcelJS.Cell, val: any) {
  c.value = val;
  c.font = { name: 'Arial', size: 11 };
  c.border = XL_BORDER_THIN;
  c.alignment = { vertical: 'middle' };
}

// ── Helpers PDF ───────────────────────────────────────────────────────────────

function pdfSectionHeader(title: string): any {
  return {
    table: {
      widths: ['*'],
      body: [[{
        text: title,
        bold: true,
        fontSize: 11,
        color: '#FFFFFF',
        fillColor: `#${GRAY_DARK}`,
        border: [false, false, false, false],
        margin: [8, 5, 8, 5],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 15, 0, 8],
  };
}

function pdfHeaderCells(labels: string[]): any[] {
  return labels.map((text) => ({
    text,
    bold: true,
    fontSize: 9,
    color: '#FFFFFF',
    fillColor: `#${GRAY_DARK}`,
    alignment: 'center',
    margin: [3, 5, 3, 5],
  }));
}

function pdfCell(text: any, bg: string | null, extra: any = {}): any {
  return { text: String(text ?? '-'), fontSize: 8, fillColor: bg, margin: [3, 3, 3, 3], ...extra };
}

function pdfStatusCell(status: string): any {
  return {
    text: STATUS_LABEL[status] ?? status,
    fontSize: 8,
    bold: true,
    alignment: 'center',
    fillColor: STATUS_HEX[status] ?? '#F0F0F0',
    margin: [2, 4, 2, 4],
  };
}

function rowBg(i: number): string | null {
  return i % 2 === 1 ? `#${CREAM}` : null;
}

function buildChartCanvas(
  segments: Array<{ count: number; color: string }>,
  total: number,
  width: number,
  h: number,
): any[] {
  if (total <= 0) return [];
  const rects: any[] = [{ type: 'rect', x: 0, y: 0, w: width, h, color: '#E2E8F0' }];
  let x = 0;
  for (const seg of segments) {
    if (seg.count <= 0) continue;
    const w = Math.max((seg.count / total) * width, 10);
    rects.push({ type: 'rect', x, y: 0, w, h, color: seg.color });
    x += w;
  }
  return rects;
}

function pdfFooter(date: string) {
  return (currentPage: number, pageCount: number): any => ({
    columns: [
      { text: `Gerado em ${date}`, fontSize: 7, color: '#94a3b8', margin: [40, 8, 0, 0] },
      { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#94a3b8', alignment: 'right', margin: [0, 8, 40, 0] },
    ],
  });
}

const TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#CBD5E1',
  vLineColor: () => '#CBD5E1',
  paddingLeft:   () => 4,
  paddingRight:  () => 4,
  paddingTop:    () => 2,
  paddingBottom: () => 2,
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get jiraBaseUrl(): string {
    return this.configService.getJiraConfig().url || '';
  }

  private issueLink(jiraKey: string | null | undefined): string | null {
    if (!jiraKey || jiraKey === 'N/A') return null;
    const base = this.jiraBaseUrl;
    return base ? `${base}/browse/${jiraKey}` : null;
  }

  private formatDate(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  private get today(): string {
    const d = new Date();
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  // ── Excel – ciclo individual ────────────────────────────────────────────────

  async generateXlsx(executionId: string): Promise<Buffer> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        suite: true,
        batch: { select: { suiteIds: true } },
        testCases: {
          include: {
            testCase: true,
            issues: true,
            scenarios: { include: { issues: true }, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { testCase: { jiraKey: 'asc' } },
        },
      },
    });

    if (!execution) {
      throw new HttpException('Ciclo de execução não encontrado.', HttpStatus.NOT_FOUND);
    }

    const batchSuites = await this.resolveBatchSuites(execution.batch?.suiteIds);
    const isBatch = batchSuites.length > 0;

    const workbook = new ExcelJS.Workbook();

    // ── Aba 1: Visualizar Resultado ──────────────────────────────────────────
    const ws = workbook.addWorksheet('Visualizar Resultado');
    ws.columns = [
      { key: 'index',       width: 6  },
      { key: 'key',         width: 14 },
      { key: 'title',       width: 55 },
      { key: 'priority',    width: 14 },
      { key: 'status',      width: 18 },
      { key: 'responsible', width: 18 },
      { key: 'comments',    width: 22 },
      { key: 'issue',       width: 18 },
    ];

    // Linha 1 – Título
    xlTitleRow(ws, 'A1:H1', 'Relatório de Execução', 1);

    // Linhas 2-6 – Metadados
    ws.getRow(2).height = 22;
    xlMetaLabel(ws.getCell('A2'), 'Sprint');
    xlMetaValue(ws.getCell('C2'), execution.sprint);
    xlMetaLabel(ws.getCell('F2'), 'Total Passou');
    xlMetaValue(ws.getCell('G2'), { formula: 'COUNTIF(E11:E1000,"Passou")' });

    ws.getRow(3).height = 22;
    xlMetaLabel(ws.getCell('A3'), 'Versão do sistema');
    xlMetaValue(ws.getCell('C3'), execution.version);
    xlMetaLabel(ws.getCell('F3'), 'Total Falhou');
    xlMetaValue(ws.getCell('G3'), { formula: 'COUNTIF(E11:E1000,"Falhou")' });

    ws.getRow(4).height = 22;
    xlMetaLabel(ws.getCell('A4'), 'Data de início');
    xlMetaValue(ws.getCell('C4'), this.formatDate(execution.startDate));
    xlMetaLabel(ws.getCell('F4'), 'Total Bloqueado');
    xlMetaValue(ws.getCell('G4'), { formula: 'COUNTIF(E11:E1000,"Bloqueado")' });

    ws.getRow(5).height = 22;
    xlMetaLabel(ws.getCell('A5'), 'Data de fim');
    xlMetaValue(ws.getCell('C5'), this.formatDate(execution.endDate));
    xlMetaLabel(ws.getCell('F5'), 'Total Executado');
    xlMetaValue(ws.getCell('G5'), { formula: 'G2+G3+G4' });

    ws.getRow(6).height = 22;
    xlMetaLabel(ws.getCell('A6'), isBatch ? 'Suítes' : 'Suíte');
    xlMetaValue(ws.getCell('C6'), isBatch
      ? batchSuites.map((s) => s.jiraKey ?? s.manualKey).join(', ')
      : (execution.suite ? `${execution.suite.jiraKey ?? execution.suite.manualKey} — ${execution.suite.title}` : '-'));
    const effectiveTotal = execution.testCases.reduce((sum, tc) => {
      const s = (tc as any).scenarios ?? [];
      return sum + (s.length > 0 ? s.length : 1);
    }, 0);
    xlMetaLabel(ws.getCell('F6'), 'Total de Testes');
    xlMetaValue(ws.getCell('G6'), effectiveTotal);

    // Linhas 7-9 – Ocorrências
    const xlBugCount = execution.testCases.reduce((sum, etc) => {
      const tcBugs = etc.issues.filter((i) => i.type === 'BUG').length;
      const scenarioBugs = ((etc as any).scenarios ?? []).reduce((s: number, sc: any) => s + sc.issues.filter((i: any) => i.type === 'BUG').length, 0);
      return sum + tcBugs + scenarioBugs;
    }, 0);
    const xlImprovementCount = execution.testCases.reduce((sum, etc) => {
      const tcImpr = etc.issues.filter((i) => i.type !== 'BUG').length;
      const scenarioImpr = ((etc as any).scenarios ?? []).reduce((s: number, sc: any) => s + sc.issues.filter((i: any) => i.type !== 'BUG').length, 0);
      return sum + tcImpr + scenarioImpr;
    }, 0);

    ws.getRow(7).height = 20;
    ws.mergeCells('F7:G7');
    const xlOccHeader = ws.getCell('F7');
    xlOccHeader.value = 'Ocorrências';
    xlOccHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    xlOccHeader.fill = xlFill(GRAY_DARK);
    xlOccHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getRow(8).height = 22;
    xlMetaLabel(ws.getCell('F8'), 'Bugs reportados');
    xlMetaValue(ws.getCell('G8'), xlBugCount);

    ws.getRow(9).height = 22;
    xlMetaLabel(ws.getCell('F9'), 'Melhorias');
    xlMetaValue(ws.getCell('G9'), xlImprovementCount);

    // Linha 10 – Cabeçalho da tabela
    const headerRow = ws.getRow(10);
    headerRow.values = ['', 'ID', 'Título do teste', 'Prioridade', 'Status', 'Responsável', 'Comentários', 'Issues'];
    xlHeaderRow(headerRow, 8);

    // Linhas 11+ – Dados
    let xlRowIdx = 11;
    execution.testCases.forEach((etc, idx) => {
      const hasScenarios = (etc as any).scenarios?.length > 0;
      const jiraIssues = etc.issues.map((i) => i.jiraKey || i.title).join(', ');
      const statusArgb = STATUS_ARGB[etc.status] ?? 'EEEEEE';

      const row = ws.getRow(xlRowIdx++);
      row.getCell(1).value = idx + 1;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      if (etc.testCase.link) {
        row.getCell(2).value = { formula: `HYPERLINK("${etc.testCase.link}","${etc.testCase.jiraKey}")`, result: etc.testCase.jiraKey };
      } else {
        row.getCell(2).value = etc.testCase.jiraKey;
      }
      row.getCell(2).font = { name: 'Calibri', size: 11, color: { argb: 'FF6002' }, underline: true };

      row.getCell(3).value = etc.testCase.title;
      row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };

      row.getCell(4).value = etc.testCase.priority || '-';
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(5).value = hasScenarios ? '' : (STATUS_PT[etc.status] ?? etc.status);
      row.getCell(5).fill = xlFill(hasScenarios ? 'EEEEEE' : statusArgb);
      row.getCell(5).font = { name: 'Calibri', size: 11 };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(6).value = etc.responsible || '';
      row.getCell(7).value = hasScenarios ? '(ver cenários)' : (etc.comments || '');
      row.getCell(7).alignment = { wrapText: true, vertical: 'middle' };
      row.getCell(8).value = jiraIssues || '';

      xlDataRow(row, 8, idx % 2 === 0, [5]);

      if (hasScenarios) {
        for (const scenario of (etc as any).scenarios) {
          const sRow = ws.getRow(xlRowIdx++);
          const sArgb = STATUS_ARGB[scenario.status] ?? 'EEEEEE';
          const sIssues = scenario.issues.map((i: any) => i.jiraKey || i.title).join(', ');

          sRow.getCell(1).value = '';
          sRow.getCell(2).value = '↳';
          sRow.getCell(2).font = { name: 'Calibri', size: 11, color: { argb: '818B9D' } };
          sRow.getCell(3).value = scenario.name;
          sRow.getCell(3).font = { name: 'Calibri', size: 10, italic: true };
          sRow.getCell(3).alignment = { indent: 2, wrapText: true, vertical: 'middle' };
          sRow.getCell(4).value = etc.testCase.priority || '-';
          sRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
          sRow.getCell(5).value = STATUS_PT[scenario.status] ?? scenario.status;
          sRow.getCell(5).fill = xlFill(sArgb);
          sRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
          sRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
          sRow.getCell(6).value = etc.responsible || '';
          sRow.getCell(7).value = scenario.comments || '';
          sRow.getCell(7).alignment = { wrapText: true, vertical: 'middle' };
          sRow.getCell(8).value = sIssues || '';

          xlDataRow(sRow, 8, idx % 2 === 0, [5]);
        }
      }
    });

    // ── Aba 2: Bugs e Melhorias ──────────────────────────────────────────────
    const wsBugs = workbook.addWorksheet('Bugs e Melhorias');
    wsBugs.columns = [
      { key: 'type',      width: 12 },
      { key: 'key',       width: 16 },
      { key: 'title',     width: 66 },
      { key: 'severity',  width: 14 },
      { key: 'createdAt', width: 16 },
      { key: 'status',    width: 14 },
    ];

    const allIssues: any[] = [];
    execution.testCases.forEach((etc) => {
      etc.issues.forEach((issue) => {
        allIssues.push({
          type:      issue.type === 'BUG' ? 'Bug' : 'Melhoria',
          jiraKey:   issue.jiraKey || 'N/A',
          title:     issue.title,
          severity:  SEVERITY_PT[issue.severity ?? ''] || issue.severity || '-',
          createdAt: this.formatDate(issue.createdAt),
          status:    ISSUE_STATUS_PT[issue.status ?? ''] || issue.status || 'Aberto',
        });
      });
      (etc as any).scenarios?.forEach((scenario: any) => {
        scenario.issues.forEach((issue: any) => {
          allIssues.push({
            type:      issue.type === 'BUG' ? 'Bug' : 'Melhoria',
            jiraKey:   issue.jiraKey || 'N/A',
            title:     issue.title,
            severity:  SEVERITY_PT[issue.severity ?? ''] || issue.severity || '-',
            createdAt: this.formatDate(issue.createdAt),
            status:    ISSUE_STATUS_PT[issue.status ?? ''] || issue.status || 'Aberto',
          });
        });
      });
    });

    const xlBugs        = allIssues.filter((i) => i.type === 'Bug');
    const xlImprovements = allIssues.filter((i) => i.type === 'Melhoria');

    const xlWriteIssueRow = (ws: ExcelJS.Worksheet, issue: any, wsRowNum: number, idx: number) => {
      const row = ws.getRow(wsRowNum);
      const link = this.issueLink(issue.jiraKey);
      row.getCell(1).value = issue.type;
      row.getCell(1).font = { name: 'Arial', size: 11 };
      if (link) {
        row.getCell(2).value = { formula: `HYPERLINK("${link}","${issue.jiraKey}")`, result: issue.jiraKey };
        row.getCell(2).font = { name: 'Arial', size: 11, color: { argb: ORANGE_ACC }, underline: true };
      } else {
        row.getCell(2).value = issue.jiraKey;
        row.getCell(2).font = { name: 'Arial', size: 11 };
      }
      row.getCell(3).value = issue.title;
      row.getCell(3).font = { name: 'Arial', size: 11 };
      row.getCell(4).value = issue.severity;
      row.getCell(4).font = { name: 'Arial', size: 11 };
      row.getCell(5).value = issue.createdAt;
      row.getCell(5).font = { name: 'Arial', size: 11 };
      row.getCell(6).value = issue.status;
      row.getCell(6).font = { name: 'Arial', size: 11 };
      xlDataRow(row, 6, idx % 2 === 0, [2]);
    };

    let wsRowNum = 1;

    // Seção Bugs
    xlTitleRow(wsBugs, `A${wsRowNum}:F${wsRowNum}`, 'Bugs Reportados', wsRowNum);
    wsRowNum++;
    const bugsHeaderRow = wsBugs.getRow(wsRowNum);
    bugsHeaderRow.values = ['Tipo', 'ID', 'Título', 'Severidade', 'Criado em', 'Status'];
    xlHeaderRow(bugsHeaderRow, 6);
    wsRowNum++;
    if (xlBugs.length === 0) {
      wsBugs.getRow(wsRowNum).getCell(1).value = 'Nenhum bug reportado.';
      wsRowNum++;
    } else {
      xlBugs.forEach((issue, idx) => { xlWriteIssueRow(wsBugs, issue, wsRowNum++, idx); });
    }

    wsRowNum++; // linha em branco separadora

    // Seção Melhorias
    xlTitleRow(wsBugs, `A${wsRowNum}:F${wsRowNum}`, 'Melhorias Reportadas', wsRowNum);
    wsRowNum++;
    const imprHeaderRow = wsBugs.getRow(wsRowNum);
    imprHeaderRow.values = ['Tipo', 'ID', 'Título', 'Severidade', 'Criado em', 'Status'];
    xlHeaderRow(imprHeaderRow, 6);
    wsRowNum++;
    if (xlImprovements.length === 0) {
      wsBugs.getRow(wsRowNum).getCell(1).value = 'Nenhuma melhoria reportada.';
    } else {
      xlImprovements.forEach((issue, idx) => { xlWriteIssueRow(wsBugs, issue, wsRowNum++, idx); });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── Batch report data ───────────────────────────────────────────────────────

  async getBatchReport(batchId: string) {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id: batchId },
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
              orderBy: { testCase: { jiraKey: 'asc' } },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new HttpException('Batch não encontrado.', HttpStatus.NOT_FOUND);
    }

    // Busca as suítes pelos IDs registrados no lote
    const suiteIds = Array.isArray(batch.suiteIds) ? (batch.suiteIds as string[]) : [];
    const suites = suiteIds.length > 0
      ? await this.prisma.suite.findMany({ where: { id: { in: suiteIds } } })
      : [];

    const allTestCases = batch.executions.flatMap((ex) => ex.testCases);

    const summary = {
      totalTests:  allTestCases.length,
      passed:      allTestCases.filter((tc) => tc.status === 'PASSED').length,
      failed:      allTestCases.filter((tc) => tc.status === 'FAILED').length,
      blocked:     allTestCases.filter((tc) => tc.status === 'BLOCKED').length,
      inProgress:  allTestCases.filter((tc) => tc.status === 'IN_PROGRESS').length,
      pending:     allTestCases.filter((tc) => tc.status === 'PENDING').length,
    };

    return {
      batch: {
        id:            batch.id,
        name:          batch.name,
        testedFeature: batch.testedFeature,
        status:        batch.status,
        suiteIds:      batch.suiteIds,
      },
      suites,
      summary,
      executions: batch.executions.map((ex) => ({
        id:            ex.id,
        suite:         ex.suite,
        sprint:        ex.sprint,
        version:       ex.version,
        startDate:     ex.startDate,
        endDate:       ex.endDate,
        testedFeature: ex.testedFeature,
        responsible:   ex.responsible,
        status:        ex.status,
        testCases:     ex.testCases,
      })),
    };
  }

  // ── Excel – lote ────────────────────────────────────────────────────────────

  async generateBatchXlsx(batchId: string): Promise<Buffer> {
    const report = await this.getBatchReport(batchId);
    const { batch, summary } = report;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Relatório Consolidado');
    ws.columns = [
      { key: 'index',       width: 6  },
      { key: 'empty',       width: 4  },
      { key: 'suite',       width: 16 },
      { key: 'key',         width: 14 },
      { key: 'title',       width: 55 },
      { key: 'priority',    width: 14 },
      { key: 'status',      width: 18 },
      { key: 'responsible', width: 18 },
      { key: 'issue',       width: 18 },
    ];

    xlTitleRow(ws, 'A1:I1', `Relatório Consolidado — ${batch.name || 'Lote ' + batch.id}`, 1);

    ws.getRow(2).height = 22;
    xlMetaLabel(ws.getCell('A2'), 'Total de Testes');
    xlMetaValue(ws.getCell('C2'), summary.totalTests);
    xlMetaLabel(ws.getCell('D2'), 'Passou');
    xlMetaValue(ws.getCell('E2'), summary.passed);
    xlMetaLabel(ws.getCell('F2'), 'Falhou');
    xlMetaValue(ws.getCell('G2'), summary.failed);

    ws.getRow(3).height = 22;
    xlMetaLabel(ws.getCell('A3'), 'Suítes');
    const suiteNamesBatch = report.suites.map((s) => s.jiraKey ?? s.manualKey).join(', ');
    xlMetaValue(ws.getCell('C3'), suiteNamesBatch || '-');
    xlMetaLabel(ws.getCell('D3'), 'Bloqueado');
    xlMetaValue(ws.getCell('E3'), summary.blocked);
    xlMetaLabel(ws.getCell('F3'), 'Pendente');
    xlMetaValue(ws.getCell('G3'), summary.pending);

    const batchBugCount = report.executions.reduce((sum, ex) => sum + ex.testCases.reduce((s, etc) => {
      return s + etc.issues.filter((i) => i.type === 'BUG').length
        + ((etc as any).scenarios ?? []).reduce((ss: number, sc: any) => ss + sc.issues.filter((i: any) => i.type === 'BUG').length, 0);
    }, 0), 0);
    const batchImprovementCount = report.executions.reduce((sum, ex) => sum + ex.testCases.reduce((s, etc) => {
      return s + etc.issues.filter((i) => i.type !== 'BUG').length
        + ((etc as any).scenarios ?? []).reduce((ss: number, sc: any) => ss + sc.issues.filter((i: any) => i.type !== 'BUG').length, 0);
    }, 0), 0);

    ws.getRow(4).height = 22;
    xlMetaLabel(ws.getCell('D4'), 'Bugs reportados');
    xlMetaValue(ws.getCell('E4'), batchBugCount);
    xlMetaLabel(ws.getCell('F4'), 'Melhorias');
    xlMetaValue(ws.getCell('G4'), batchImprovementCount);

    const headerRow = ws.getRow(5);
    headerRow.values = ['#', '', 'Suíte', 'ID', 'Título do teste', 'Prioridade', 'Status', 'Responsável', 'Issues'];
    xlHeaderRow(headerRow, 9);

    const allBatchTcs = report.executions.flatMap((ex) => ex.testCases);
    let testIndex = 1;
    let rowIdx = 6;
    allBatchTcs.forEach((etc) => {
      const row = ws.getRow(rowIdx);
      const jiraIssues = etc.issues.map((i) => i.jiraKey || i.title).join(', ');
      const statusArgb = STATUS_ARGB[etc.status] ?? 'EEEEEE';
      const suite = report.suites.find((s) => s.id === etc.testCase.suiteId);

        row.getCell(1).value = testIndex;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).value = suite?.jiraKey || '';
        if (etc.testCase.link) {
          row.getCell(4).value = { formula: `HYPERLINK("${etc.testCase.link}","${etc.testCase.jiraKey}")`, result: etc.testCase.jiraKey };
        } else {
          row.getCell(4).value = etc.testCase.jiraKey;
        }
        row.getCell(4).font = { name: 'Calibri', size: 11, color: { argb: 'FF6002' }, underline: true };
        row.getCell(5).value = etc.testCase.title;
        row.getCell(5).alignment = { wrapText: true, vertical: 'middle' };
        row.getCell(6).value = etc.testCase.priority || '-';
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).value = STATUS_PT[etc.status] ?? etc.status;
        row.getCell(7).fill = xlFill(statusArgb);
        row.getCell(7).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(8).value = etc.responsible || '';
        row.getCell(9).value = jiraIssues || '';

        xlDataRow(row, 9, testIndex % 2 !== 0, [7]);
        testIndex++;
        rowIdx++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── PDF – lote ──────────────────────────────────────────────────────────────

  async generateBatchPdf(batchId: string): Promise<Buffer> {
    const report = await this.getBatchReport(batchId);
    const { batch, summary } = report;

    const executedTests = summary.passed + summary.failed + summary.blocked;

    const chartSegments = [
      { label: 'Passou',    count: summary.passed,  color: '#22c55e' },
      { label: 'Falhou',    count: summary.failed,  color: '#ef4444' },
      { label: 'Bloqueado', count: summary.blocked, color: '#f59e0b' },
      { label: 'Pendente',  count: summary.pending, color: '#3b82f6' },
    ];

    const allIssues: any[] = [];
    report.executions.forEach((ex) => {
      ex.testCases.forEach((etc) => {
        etc.issues.forEach((issue) => {
          allIssues.push({
            type:     issue.type === 'BUG' ? 'Bug' : 'Melhoria',
            key:      issue.jiraKey || 'N/A',
            title:    issue.title,
            severity: SEVERITY_PT[issue.severity ?? ''] || issue.severity || '-',
            status:   ISSUE_STATUS_PT[issue.status ?? ''] || issue.status || 'Aberto',
          });
        });
        (etc as any).scenarios?.forEach((scenario: any) => {
          scenario.issues.forEach((issue: any) => {
            allIssues.push({
              type:     issue.type === 'BUG' ? 'Bug' : 'Melhoria',
              key:      issue.jiraKey || 'N/A',
              title:    issue.title,
              severity: SEVERITY_PT[issue.severity ?? ''] || issue.severity || '-',
              status:   ISSUE_STATUS_PT[issue.status ?? ''] || issue.status || 'Aberto',
            });
          });
        });
      });
    });

    const pdfBugCount = allIssues.filter((i) => i.type === 'Bug').length;
    const pdfImprovementCount = allIssues.filter((i) => i.type === 'Melhoria').length;

    const docDefinition: any = {
      pageMargins: [40, 50, 40, 50],
      footer: pdfFooter(this.today),
      content: [
        this.pdfTitle('RELATÓRIO CONSOLIDADO DE TESTES'),
        {
          columns: [
            {
              width: '45%',
              stack: [{
                text: [
                  { text: 'Suítes: ', bold: true },
                  `${report.suites.map((s) => s.jiraKey ?? s.manualKey).join(', ') || '-'}\n`,
                ],
                lineHeight: 1.5,
                fontSize: 10,
                margin: [0, 4, 12, 0],
              }],
            },
            {
              width: '55%',
              ...this.pdfSummaryTable(summary.totalTests, executedTests, summary.passed, summary.failed, summary.blocked, pdfBugCount, pdfImprovementCount),
            },
          ],
          margin: [0, 0, 0, 20],
        },

        pdfSectionHeader('Distribuição de Resultados'),
        { canvas: buildChartCanvas(chartSegments, summary.totalTests, 460, 22), margin: [0, 0, 0, 8] },
        this.pdfChartLegend(chartSegments, summary.totalTests),

        pdfSectionHeader('Detalhamento por Suíte'),
        ...(() => {
          const allTcs = report.executions.flatMap((ex) => ex.testCases);
          return report.suites.flatMap((suite) => {
            const suiteTcs = allTcs.filter((tc) => tc.testCase.suiteId === suite.id);
            if (suiteTcs.length === 0) return [];
            return [
              {
                text: `${suite.jiraKey ?? suite.manualKey} — ${suite.title}`,
                fontSize: 10,
                bold: true,
                color: '#818B9D',
                margin: [0, 10, 0, 4],
              },
              {
                table: {
                  headerRows: 1,
                  widths: ['14%', '26%', '14%', '13%', '18%', '15%'],
                  body: [
                    pdfHeaderCells(['ID', 'Caso de Teste', 'Prioridade', 'Status', 'Responsável', 'Issues']),
                    ...suiteTcs.map((tc, i) => {
                      const bg = rowBg(i);
                      const issues = tc.issues.map((iss) => iss.jiraKey || iss.title).join(', ') || '-';
                      return [
                        pdfCell(tc.testCase.jiraKey, bg, { color: '#FF6002', decoration: 'underline', ...(tc.testCase.link ? { link: tc.testCase.link } : {}) }),
                        pdfCell(tc.testCase.title, bg),
                        pdfCell(tc.testCase.priority || '-', bg, { alignment: 'center' }),
                        pdfStatusCell(tc.status),
                        pdfCell(tc.responsible || '-', bg),
                        pdfCell(issues, bg),
                      ];
                    }),
                  ],
                },
                layout: TABLE_LAYOUT,
                fontSize: 8,
                margin: [0, 0, 0, 14],
              },
            ];
          });
        })(),

        pdfSectionHeader('Bugs e Melhorias Reportados'),
        this.pdfIssuesTable(allIssues, 'Nenhum bug ou melhoria reportado neste lote.'),
      ],
      defaultStyle: { font: 'DejaVuSans' },
    };

    return this.renderPdf(docDefinition);
  }

  // ── PDF – ciclo individual ──────────────────────────────────────────────────

  async generatePdf(executionId: string): Promise<Buffer> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        suite: true,
        batch: { select: { suiteIds: true } },
        testCases: {
          include: {
            testCase: true,
            issues: true,
            scenarios: { include: { issues: true }, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { testCase: { jiraKey: 'asc' } },
        },
      },
    });

    if (!execution) {
      throw new HttpException('Ciclo de execução não encontrado.', HttpStatus.NOT_FOUND);
    }

    const batchSuites = await this.resolveBatchSuites(execution.batch?.suiteIds);
    const isBatch = batchSuites.length > 0;

    const totalTests = execution.testCases.reduce((sum, tc) => {
      const scenarios = (tc as any).scenarios ?? [];
      return sum + (scenarios.length > 0 ? scenarios.length : 1);
    }, 0);
    const passedTests = execution.testCases.reduce((sum, tc) => {
      const scenarios = (tc as any).scenarios ?? [];
      if (scenarios.length > 0) return sum + scenarios.filter((s: any) => s.status === 'PASSED').length;
      return sum + (tc.status === 'PASSED' ? 1 : 0);
    }, 0);
    const failedTests = execution.testCases.reduce((sum, tc) => {
      const scenarios = (tc as any).scenarios ?? [];
      if (scenarios.length > 0) return sum + scenarios.filter((s: any) => s.status === 'FAILED').length;
      return sum + (tc.status === 'FAILED' ? 1 : 0);
    }, 0);
    const blockedTests = execution.testCases.reduce((sum, tc) => {
      const scenarios = (tc as any).scenarios ?? [];
      if (scenarios.length > 0) return sum + scenarios.filter((s: any) => s.status === 'BLOCKED').length;
      return sum + (tc.status === 'BLOCKED' ? 1 : 0);
    }, 0);
    const executedTests = passedTests + failedTests + blockedTests;
    const pendingTests  = totalTests - executedTests;


    const chartSegments = [
      { label: 'Passou',    count: passedTests,  color: '#22c55e' },
      { label: 'Falhou',    count: failedTests,  color: '#ef4444' },
      { label: 'Bloqueado', count: blockedTests, color: '#f59e0b' },
      { label: 'Pendente',  count: pendingTests, color: '#3b82f6' },
    ];

    const allIssues: any[] = [];
    execution.testCases.forEach((etc) => {
      etc.issues.forEach((issue) => {
        allIssues.push({
          type:     issue.type === 'BUG' ? 'Bug' : 'Melhoria',
          key:      issue.jiraKey || 'N/A',
          title:    issue.title,
          severity: SEVERITY_PT[issue.severity ?? ''] || issue.severity || '-',
          status:   ISSUE_STATUS_PT[issue.status ?? ''] || issue.status || 'Aberto',
        });
      });
      (etc as any).scenarios?.forEach((scenario: any) => {
        scenario.issues.forEach((issue: any) => {
          allIssues.push({
            type:     issue.type === 'BUG' ? 'Bug' : 'Melhoria',
            key:      issue.jiraKey || 'N/A',
            title:    issue.title,
            severity: SEVERITY_PT[issue.severity ?? ''] || issue.severity || '-',
            status:   ISSUE_STATUS_PT[issue.status ?? ''] || issue.status || 'Aberto',
          });
        });
      });
    });

    const pdfBugCount = allIssues.filter((i) => i.type === 'Bug').length;
    const pdfImprovementCount = allIssues.filter((i) => i.type === 'Melhoria').length;

    const docDefinition: any = {
      pageMargins: [40, 50, 40, 50],
      footer: pdfFooter(this.today),
      content: [
        this.pdfTitle('RELATÓRIO DE EXECUÇÃO DE TESTES'),
        {
          columns: [
            {
              width: '45%',
              stack: [{
                text: [
                  { text: 'Sprint: ',           bold: true }, `${execution.sprint}\n`,
                  { text: 'Versão do sistema: ',  bold: true }, `${execution.version}\n`,
                  { text: 'Data de início: ',   bold: true }, `${this.formatDate(execution.startDate)}\n`,
                  { text: 'Data de fim: ',      bold: true }, `${this.formatDate(execution.endDate)}\n`,
                  { text: isBatch ? 'Suítes: ' : 'Suíte: ', bold: true },
                  `${isBatch
                    ? batchSuites.map((s) => s.jiraKey ?? s.manualKey).join(', ')
                    : (execution.suite ? `${execution.suite.jiraKey ?? execution.suite.manualKey} — ${execution.suite.title}` : '-')
                  }\n`,
                  { text: 'Responsável: ',      bold: true }, `${execution.responsible}\n`,
                ],
                lineHeight: 1.5,
                fontSize: 10,
                margin: [0, 4, 12, 0],
              }],
            },
            {
              width: '55%',
              ...this.pdfSummaryTable(totalTests, executedTests, passedTests, failedTests, blockedTests, pdfBugCount, pdfImprovementCount),
            },
          ],
          margin: [0, 0, 0, 20],
        },

        pdfSectionHeader('Distribuição de Resultados'),
        { canvas: buildChartCanvas(chartSegments, totalTests, 460, 22), margin: [0, 0, 0, 8] },
        this.pdfChartLegend(chartSegments, totalTests),

        pdfSectionHeader('Detalhamento dos Casos de Teste'),
        ...(isBatch
          ? batchSuites.flatMap((suite) => {
              const suiteTcs = execution.testCases.filter((tc) => tc.testCase.suiteId === suite.id);
              if (suiteTcs.length === 0) return [];
              return [
                {
                  text: `${suite.jiraKey ?? suite.manualKey} — ${suite.title}`,
                  fontSize: 10,
                  bold: true,
                  color: '#818B9D',
                  margin: [0, 10, 0, 4],
                },
                {
                  table: {
                    headerRows: 1,
                    widths: ['12%', '20%', '11%', '13%', '14%', '16%', '14%'],
                    body: [
                      pdfHeaderCells(['ID', 'Caso de Teste', 'Prior.', 'Status', 'Resp.', 'Coment.', 'Issues']),
                      ...suiteTcs.flatMap((tc, i) => {
                        const bg = rowBg(i);
                        const issues = tc.issues.map((iss) => iss.jiraKey || iss.title).join(', ') || '-';
                        const scenarios = (tc as any).scenarios ?? [];
                        const mainRow = [
                          pdfCell(tc.testCase.jiraKey, bg, { color: '#FF6002', decoration: 'underline', ...(tc.testCase.link ? { link: tc.testCase.link } : {}) }),
                          pdfCell(tc.testCase.title, bg),
                          pdfCell(tc.testCase.priority || '-', bg, { alignment: 'center' }),
                          scenarios.length > 0
                            ? { text: '', fontSize: 8, alignment: 'center', fillColor: '#EEEEEE', margin: [2, 4, 2, 4] }
                            : pdfStatusCell(tc.status),
                          pdfCell(tc.responsible || '-', bg),
                          pdfCell(tc.comments || '-', bg),
                          pdfCell(issues, bg),
                        ];
                        const scenarioRows = scenarios.map((s: any) => {
                          const sIssues = s.issues.map((iss: any) => iss.jiraKey || iss.title).join(', ') || '-';
                          return [
                            pdfCell('↳', bg, { color: '#818B9D' }),
                            pdfCell(s.name, bg, { italics: true, margin: [10, 3, 3, 3] }),
                            pdfCell(tc.testCase.priority || '-', bg, { alignment: 'center' }),
                            pdfStatusCell(s.status),
                            pdfCell(tc.responsible || '-', bg),
                            pdfCell(s.comments || '-', bg),
                            pdfCell(sIssues, bg),
                          ];
                        });
                        return [mainRow, ...scenarioRows];
                      }),
                    ],
                  },
                  layout: TABLE_LAYOUT,
                  fontSize: 8,
                  margin: [0, 0, 0, 14],
                },
              ];
            })
          : [{
              table: {
                headerRows: 1,
                widths: ['12%', '20%', '11%', '13%', '14%', '16%', '14%'],
                body: [
                  pdfHeaderCells(['ID', 'Caso de Teste', 'Prior.', 'Status', 'Resp.', 'Coment.', 'Issues']),
                  ...execution.testCases.flatMap((tc, i) => {
                    const bg = rowBg(i);
                    const issues = tc.issues.map((iss) => iss.jiraKey || iss.title).join(', ') || '-';
                    const scenarios = (tc as any).scenarios ?? [];
                    const mainRow = [
                      pdfCell(tc.testCase.jiraKey, bg, { color: '#FF6002', decoration: 'underline', ...(tc.testCase.link ? { link: tc.testCase.link } : {}) }),
                      pdfCell(tc.testCase.title, bg),
                      pdfCell(tc.testCase.priority || '-', bg, { alignment: 'center' }),
                      scenarios.length > 0
                        ? { text: '', fontSize: 8, alignment: 'center', fillColor: '#EEEEEE', margin: [2, 4, 2, 4] }
                        : pdfStatusCell(tc.status),
                      pdfCell(tc.responsible || '-', bg),
                      pdfCell(tc.comments || '-', bg),
                      pdfCell(issues, bg),
                    ];
                    const scenarioRows = scenarios.map((s: any) => {
                      const sIssues = s.issues.map((iss: any) => iss.jiraKey || iss.title).join(', ') || '-';
                      return [
                        pdfCell('↳', bg, { color: '#818B9D' }),
                        pdfCell(s.name, bg, { italics: true, margin: [10, 3, 3, 3] }),
                        pdfCell(tc.testCase.priority || '-', bg, { alignment: 'center' }),
                        pdfStatusCell(s.status),
                        pdfCell(tc.responsible || '-', bg),
                        pdfCell(s.comments || '-', bg),
                        pdfCell(sIssues, bg),
                      ];
                    });
                    return [mainRow, ...scenarioRows];
                  }),
                ],
              },
              layout: TABLE_LAYOUT,
              fontSize: 8,
              margin: [0, 0, 0, 20],
            }]),

        pdfSectionHeader('Bugs e Melhorias Reportados'),
        this.pdfIssuesTable(allIssues, 'Nenhum bug ou melhoria reportado neste ciclo.'),
      ],
      defaultStyle: { font: 'DejaVuSans' },
    };

    return this.renderPdf(docDefinition);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private pdfTitle(text: string): any {
    return {
      table: {
        widths: ['*'],
        body: [[{
          text,
          bold: true,
          fontSize: 16,
          color: '#FFFFFF',
          fillColor: `#${BLACK}`,
          alignment: 'center',
          border: [false, false, false, false],
          margin: [0, 12, 0, 12],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 18],
    };
  }

  private pdfSummaryTable(
    total: number, executed: number, passed: number, failed: number,
    blocked: number, bugs: number, improvements: number,
  ): any {
    const makeBlock = (header: string, color: string, rows: [string, number][]) => ({
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: header, bold: true, fontSize: 9, fillColor: color, color: '#FFFFFF', alignment: 'center', colSpan: 2, margin: [4, 5, 4, 5] },
            {},
          ],
          ...rows.map(([label, value], i) => [
            { text: label, fontSize: 9, fillColor: i % 2 === 0 ? `#${CREAM}` : '#FFFFFF', margin: [4, 3, 4, 3] },
            { text: String(value), fontSize: 9, fillColor: i % 2 === 0 ? `#${CREAM}` : '#FFFFFF', alignment: 'center', margin: [4, 3, 4, 3] },
          ]),
        ],
      },
      fontSize: 9,
    });

    return {
      columns: [
        {
          width: '58%',
          ...makeBlock('Resultados', `#${DARK_ORA}`, [
            ['Passou',          passed],
            ['Falhou',          failed],
            ['Bloqueado',       blocked],
            ['Total Executado', executed],
            ['Total de Testes', total],
          ]),
        },
        { width: '4%', text: '' },
        {
          width: '38%',
          ...makeBlock('Ocorrências', `#${GRAY_DARK}`, [
            ['Bugs',      bugs],
            ['Melhorias', improvements],
          ]),
        },
      ],
    };
  }

  private pdfChartLegend(
    segments: Array<{ label: string; count: number; color: string }>,
    total: number,
  ): any {
    return {
      columns: segments
        .filter((s) => s.count > 0)
        .map((s) => ({
          width: 'auto',
          stack: [
            { canvas: [{ type: 'rect', x: 0, y: 2, w: 10, h: 10, color: s.color }] },
            { text: s.label, bold: true, fontSize: 9, margin: [0, 3, 0, 0] },
            {
              text: `${s.count} (${total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}%)`,
              fontSize: 9,
              color: s.color,
            },
          ],
          margin: [0, 4, 20, 0],
        })),
      margin: [0, 0, 0, 20],
    };
  }

  private pdfIssuesTable(issues: any[], emptyMessage: string): any {
    if (issues.length === 0) {
      return { text: emptyMessage, italics: true, fontSize: 9 };
    }

    const sorted = [...issues].sort((a, b) => (a.type === b.type ? 0 : a.type === 'Bug' ? -1 : 1));
    const separatorIdx = sorted.findIndex((i) => i.type === 'Melhoria');
    const hasBothTypes = separatorIdx > 0;

    const makeSeparator = (label: string) => [{
      text: label,
      colSpan: 5,
      bold: true,
      fontSize: 9,
      color: '#FFFFFF',
      fillColor: `#${GRAY_DARK}`,
      alignment: 'center',
      margin: [3, 5, 3, 5],
    }, {}, {}, {}, {}];

    const hasBugs = sorted.some((i) => i.type === 'Bug');
    const firstSeparator = hasBugs ? makeSeparator('Bugs') : makeSeparator('Melhorias');

    const dataRows: any[] = [];
    let bgIdx = 0;
    sorted.forEach((issue, i) => {
      if (hasBothTypes && i === separatorIdx) {
        dataRows.push([{ text: '', colSpan: 5, border: [false, false, false, false], margin: [0, 6, 0, 6] }, {}, {}, {}, {}]);
        dataRows.push(makeSeparator('Melhorias'));
        dataRows.push(pdfHeaderCells(['Tipo', 'ID', 'Título', 'Severidade', 'Status']));
        bgIdx = 0;
      }
      const bg = rowBg(bgIdx++);
      const link = this.issueLink(issue.key);
      dataRows.push([
        pdfCell(issue.type, bg),
        link
          ? pdfCell(issue.key, bg, { color: `#${ORANGE_ACC}`, decoration: 'underline', link })
          : pdfCell(issue.key, bg),
        pdfCell(issue.title, bg),
        pdfCell(issue.severity, bg),
        pdfCell(issue.status, bg),
      ]);
    });

    return {
      table: {
        headerRows: 0,
        widths: ['12%', '14%', '38%', '16%', '20%'],
        body: [
          firstSeparator,
          pdfHeaderCells(['Tipo', 'ID', 'Título', 'Severidade', 'Status']),
          ...dataRows,
        ],
      },
      layout: TABLE_LAYOUT,
      fontSize: 8,
    };
  }

  private async resolveBatchSuites(suiteIds: unknown): Promise<Array<{ id: string; jiraKey: string | null; manualKey: string | null; title: string }>> {
    const ids = Array.isArray(suiteIds) ? (suiteIds as string[]) : [];
    if (ids.length === 0) return [];
    return this.prisma.suite.findMany({ where: { id: { in: ids } } });
  }

  private renderPdf(docDefinition: any): Promise<Buffer> {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.end();
    return new Promise<Buffer>((resolve) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
