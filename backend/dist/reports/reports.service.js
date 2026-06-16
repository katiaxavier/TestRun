"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
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
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    formatDate(date) {
        if (!date)
            return '-';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    async generateXlsx(executionId) {
        const execution = await this.prisma.execution.findUnique({
            where: { id: executionId },
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
            throw new common_1.HttpException('Ciclo de execução não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Visualizar Resultado');
        ws.columns = [
            { key: 'index', width: 6 },
            { key: 'key', width: 12 },
            { key: 'title', width: 65 },
            { key: 'status', width: 18 },
            { key: 'responsible', width: 15 },
            { key: 'comments', width: 20 },
            { key: 'issue', width: 15 },
        ];
        ws.mergeCells('A1:G1');
        const titleCell = ws.getCell('A1');
        titleCell.value = 'Relatório de Execução';
        titleCell.font = {
            name: 'Arial',
            size: 14,
            bold: true,
            color: { argb: '000000' },
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 30;
        const boldLabelFont = { name: 'Arial', size: 11, bold: true };
        const normalFont = { name: 'Arial', size: 11 };
        ws.getCell('A2').value = 'Sprint';
        ws.getCell('A2').font = boldLabelFont;
        ws.getCell('C2').value = execution.sprint;
        ws.getCell('C2').font = normalFont;
        ws.getCell('C2').alignment = { horizontal: 'right' };
        ws.getCell('D2').value = '%(Passou/Total)';
        ws.getCell('D2').font = normalFont;
        ws.getCell('E2').value = { formula: 'G2/G6' };
        ws.getCell('E2').font = normalFont;
        ws.getCell('E2').numFmt = '0%';
        ws.getCell('F2').value = 'Total Passou';
        ws.getCell('F2').font = normalFont;
        ws.getCell('G2').value = { formula: 'COUNTIF(D8:D1000,"Passed")' };
        ws.getCell('G2').font = normalFont;
        ws.getCell('A3').value = 'Versão do sistema';
        ws.getCell('A3').font = boldLabelFont;
        ws.getCell('C3').value = execution.version;
        ws.getCell('C3').font = normalFont;
        ws.getCell('D3').value =
            'Descontando os Blocked (Passou/(Total - Blocked))';
        ws.getCell('D3').font = normalFont;
        ws.getCell('E3').value = { formula: 'IF((G6-G4)>0, G2/(G6-G4), 0)' };
        ws.getCell('E3').font = normalFont;
        ws.getCell('E3').numFmt = '0%';
        ws.getCell('F3').value = 'Total Falhou';
        ws.getCell('F3').font = normalFont;
        ws.getCell('G3').value = { formula: 'COUNTIF(D8:D1000,"Failed")' };
        ws.getCell('G3').font = normalFont;
        ws.getCell('A4').value = 'Data de início';
        ws.getCell('A4').font = boldLabelFont;
        ws.getCell('C4').value = this.formatDate(execution.startDate);
        ws.getCell('C4').font = normalFont;
        ws.getCell('F4').value = 'Total Bloqueado';
        ws.getCell('F4').font = normalFont;
        ws.getCell('G4').value = { formula: 'COUNTIF(D8:D1000,"Blocked")' };
        ws.getCell('G4').font = normalFont;
        ws.getCell('A5').value = 'Data de fim';
        ws.getCell('A5').font = boldLabelFont;
        ws.getCell('C5').value = this.formatDate(execution.endDate);
        ws.getCell('C5').font = normalFont;
        ws.getCell('F5').value = 'Total Executado';
        ws.getCell('F5').font = normalFont;
        ws.getCell('G5').value = { formula: 'G2+G3+G4' };
        ws.getCell('G5').font = normalFont;
        ws.getCell('A6').value = 'Funcionalidade a ser testada';
        ws.getCell('A6').font = boldLabelFont;
        ws.getCell('C6').value = execution.testedFeature;
        ws.getCell('C6').font = normalFont;
        ws.getCell('F6').value = 'Numero total de testes';
        ws.getCell('F6').font = normalFont;
        ws.getCell('G6').value = execution.testCases.length;
        ws.getCell('G6').font = normalFont;
        ws.getRow(7).values = [
            '',
            'Key',
            'Título do teste',
            'Status',
            'Responsável',
            'Comentarios',
            'Issue',
        ];
        ws.getRow(7).font = { name: 'Arial', size: 11, bold: true };
        ws.getRow(7).height = 20;
        let rowIndex = 8;
        execution.testCases.forEach((etc, idx) => {
            const row = ws.getRow(rowIndex);
            const jiraIssues = etc.issues.map((i) => i.jiraKey || i.title).join(', ');
            row.getCell(1).value = idx + 1;
            row.getCell(2).value = etc.testCase.jiraKey;
            row.getCell(3).value = etc.testCase.title;
            row.getCell(4).value = etc.status;
            row.getCell(5).value = etc.responsible || '';
            row.getCell(6).value = etc.comments || '';
            row.getCell(7).value = jiraIssues || '';
            row.getCell(1).font = { name: 'Calibri', size: 11 };
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(2).font = {
                name: 'Calibri',
                size: 11,
                color: { argb: '0000FF' },
                underline: true,
            };
            if (etc.testCase.link) {
                row.getCell(2).value = {
                    text: etc.testCase.jiraKey,
                    hyperlink: etc.testCase.link,
                };
            }
            row.getCell(3).font = { name: 'Calibri', size: 12 };
            row.getCell(4).font = { name: 'Calibri', size: 12 };
            row.getCell(5).font = { name: 'Calibri', size: 12 };
            row.getCell(6).font = { name: 'Arial', size: 11 };
            row.getCell(7).font = { name: 'Calibri', size: 11 };
            const statusValue = String(etc.status).toUpperCase();
            let statusColor = 'FFFFFF';
            if (statusValue === 'PASSED')
                statusColor = 'E2EFDA';
            else if (statusValue === 'FAILED')
                statusColor = 'FCE4D6';
            else if (statusValue === 'BLOCKED')
                statusColor = 'FFF2CC';
            else if (statusValue === 'IN_PROGRESS')
                statusColor = 'DDEBF7';
            if (statusColor !== 'FFFFFF') {
                row.getCell(4).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: statusColor },
                };
            }
            rowIndex++;
        });
        const wsBugs = workbook.addWorksheet('Bugs e Melhorias');
        wsBugs.columns = [
            { key: 'type', width: 12 },
            { key: 'key', width: 15 },
            { key: 'title', width: 66 },
            { key: 'severity', width: 12 },
            { key: 'createdAt', width: 15 },
            { key: 'updatedAt', width: 15 },
            { key: 'status', width: 13 },
            { key: 'responsible', width: 15 },
        ];
        wsBugs.mergeCells('A1:H1');
        const bugsTitle = wsBugs.getCell('A1');
        bugsTitle.value = 'Bugs e Melhorias reportados durante execução';
        bugsTitle.font = { name: 'Arial', size: 11, bold: true };
        wsBugs.getRow(1).height = 25;
        wsBugs.getRow(2).values = [
            'Tipo',
            'ID',
            'Titulo',
            'Severidade',
            'Data de criação',
            'Data de atualização',
            'Status',
            'Responsável',
        ];
        wsBugs.getRow(2).font = { name: 'Arial', size: 11, bold: true };
        wsBugs.getRow(2).height = 20;
        const allIssues = [];
        execution.testCases.forEach((etc) => {
            etc.issues.forEach((issue) => {
                allIssues.push({
                    type: issue.type === 'BUG' ? 'Bug' : 'Melhoria',
                    jiraKey: issue.jiraKey || 'N/A',
                    title: issue.title,
                    severity: issue.severity || '-',
                    createdAt: issue.createdAt,
                    updatedAt: issue.updatedAt,
                    status: issue.status || 'Open',
                    responsible: issue.responsible || '-',
                });
            });
        });
        let bugsRowIndex = 3;
        allIssues.forEach((issue) => {
            const row = wsBugs.getRow(bugsRowIndex);
            row.values = [
                issue.type,
                issue.jiraKey,
                issue.title,
                issue.severity,
                this.formatDate(issue.createdAt),
                this.formatDate(issue.updatedAt),
                issue.status,
                issue.responsible,
            ];
            row.font = { name: 'Arial', size: 11 };
            bugsRowIndex++;
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async getBatchReport(batchId) {
        const batch = await this.prisma.executionBatch.findUnique({
            where: { id: batchId },
            include: {
                executions: {
                    include: {
                        suite: true,
                        testCases: {
                            include: { testCase: true, issues: true },
                            orderBy: { testCase: { jiraKey: 'asc' } },
                        },
                    },
                },
            },
        });
        if (!batch) {
            throw new common_1.HttpException('Batch não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        const allTestCases = batch.executions.flatMap((ex) => ex.testCases);
        const summary = {
            totalTests: allTestCases.length,
            passed: allTestCases.filter((tc) => tc.status === 'PASSED').length,
            failed: allTestCases.filter((tc) => tc.status === 'FAILED').length,
            blocked: allTestCases.filter((tc) => tc.status === 'BLOCKED').length,
            inProgress: allTestCases.filter((tc) => tc.status === 'IN_PROGRESS')
                .length,
            pending: allTestCases.filter((tc) => tc.status === 'PENDING').length,
        };
        return {
            batch: {
                id: batch.id,
                name: batch.name,
                testedFeature: batch.testedFeature,
                status: batch.status,
                suiteIds: batch.suiteIds,
            },
            summary,
            executions: batch.executions.map((ex) => ({
                id: ex.id,
                suite: ex.suite,
                sprint: ex.sprint,
                version: ex.version,
                startDate: ex.startDate,
                endDate: ex.endDate,
                testedFeature: ex.testedFeature,
                responsible: ex.responsible,
                status: ex.status,
                testCases: ex.testCases,
            })),
        };
    }
    async generateBatchXlsx(batchId) {
        const report = await this.getBatchReport(batchId);
        const batch = report.batch;
        const summary = report.summary;
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Relatório Consolidado');
        ws.columns = [
            { key: 'index', width: 6 },
            { key: 'suite', width: 15 },
            { key: 'key', width: 12 },
            { key: 'title', width: 65 },
            { key: 'status', width: 18 },
            { key: 'responsible', width: 15 },
            { key: 'comments', width: 20 },
            { key: 'issue', width: 15 },
        ];
        ws.mergeCells('A1:H1');
        const titleCell = ws.getCell('A1');
        titleCell.value = `Relatório Consolidado - ${batch.name || 'Batch ' + batch.id}`;
        titleCell.font = {
            name: 'Arial',
            size: 14,
            bold: true,
            color: { argb: '000000' },
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 30;
        const boldLabelFont = { name: 'Arial', size: 11, bold: true };
        const normalFont = { name: 'Arial', size: 11 };
        let rowIdx = 2;
        ws.getCell(`A${rowIdx}`).value = 'Total de Testes';
        ws.getCell(`A${rowIdx}`).font = boldLabelFont;
        ws.getCell(`C${rowIdx}`).value = summary.totalTests;
        ws.getCell(`C${rowIdx}`).font = normalFont;
        ws.getCell(`D${rowIdx}`).value = 'Passou';
        ws.getCell(`D${rowIdx}`).font = normalFont;
        ws.getCell(`E${rowIdx}`).value = summary.passed;
        ws.getCell(`E${rowIdx}`).font = normalFont;
        ws.getCell(`F${rowIdx}`).value = 'Falhou';
        ws.getCell(`F${rowIdx}`).font = normalFont;
        ws.getCell(`G${rowIdx}`).value = summary.failed;
        ws.getCell(`G${rowIdx}`).font = normalFont;
        rowIdx++;
        ws.getCell(`A${rowIdx}`).value = 'Funcionalidade';
        ws.getCell(`A${rowIdx}`).font = boldLabelFont;
        ws.getCell(`C${rowIdx}`).value = batch.testedFeature;
        ws.getCell(`C${rowIdx}`).font = normalFont;
        rowIdx++;
        ws.getRow(rowIdx).values = [
            '',
            '',
            'Suite',
            'Key',
            'Título do teste',
            'Status',
            'Responsável',
            'Issue',
        ];
        ws.getRow(rowIdx).font = { name: 'Arial', size: 11, bold: true };
        ws.getRow(rowIdx).height = 20;
        rowIdx++;
        let testIndex = 1;
        report.executions.forEach((ex) => {
            ex.testCases.forEach((etc) => {
                const row = ws.getRow(rowIdx);
                const jiraIssues = etc.issues
                    .map((i) => i.jiraKey || i.title)
                    .join(', ');
                row.getCell(1).value = testIndex++;
                row.getCell(2).value = '';
                row.getCell(3).value = ex.suite?.jiraKey || '';
                row.getCell(4).value = etc.testCase.jiraKey;
                row.getCell(5).value = etc.testCase.title;
                row.getCell(6).value = etc.status;
                row.getCell(7).value = etc.responsible || '';
                row.getCell(8).value = jiraIssues || '';
                row.getCell(1).font = { name: 'Calibri', size: 11 };
                row.getCell(1).alignment = { horizontal: 'center' };
                row.getCell(3).font = { name: 'Calibri', size: 11 };
                row.getCell(4).font = {
                    name: 'Calibri',
                    size: 11,
                    color: { argb: '0000FF' },
                    underline: true,
                };
                row.getCell(5).font = { name: 'Calibri', size: 12 };
                row.getCell(6).font = { name: 'Calibri', size: 12 };
                row.getCell(7).font = { name: 'Calibri', size: 12 };
                row.getCell(8).font = { name: 'Calibri', size: 11 };
                const statusValue = String(etc.status).toUpperCase();
                let statusColor = 'FFFFFF';
                if (statusValue === 'PASSED')
                    statusColor = 'E2EFDA';
                else if (statusValue === 'FAILED')
                    statusColor = 'FCE4D6';
                else if (statusValue === 'BLOCKED')
                    statusColor = 'FFF2CC';
                else if (statusValue === 'IN_PROGRESS')
                    statusColor = 'DDEBF7';
                if (statusColor !== 'FFFFFF') {
                    row.getCell(6).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: statusColor },
                    };
                }
                rowIdx++;
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateBatchPdf(batchId) {
        const report = await this.getBatchReport(batchId);
        const batch = report.batch;
        const summary = report.summary;
        const approvalRate = summary.totalTests > 0 ? (summary.passed / summary.totalTests) * 100 : 0;
        const adjustedRate = summary.totalTests - summary.blocked > 0
            ? (summary.passed / (summary.totalTests - summary.blocked)) * 100
            : 0;
        const executedTests = summary.passed + summary.failed + summary.blocked;
        const chartSegments = [
            { label: 'Passou', count: summary.passed, color: '#22c55e' },
            { label: 'Falhou', count: summary.failed, color: '#ef4444' },
            { label: 'Bloqueado', count: summary.blocked, color: '#ffd15a' },
            { label: 'Pendente', count: summary.pending, color: '#0066ff' },
        ];
        const chartWidth = 460;
        let chartCurrentX = 0;
        const chartCanvas = [];
        if (summary.totalTests > 0) {
            chartCanvas.push({
                type: 'rect',
                x: 0,
                y: 0,
                w: chartWidth,
                h: 16,
                color: '#f8fafc',
            });
            chartSegments.forEach((segment) => {
                if (segment.count <= 0)
                    return;
                const width = Math.max((segment.count / summary.totalTests) * chartWidth, 12);
                chartCanvas.push({
                    type: 'rect',
                    x: chartCurrentX,
                    y: 0,
                    w: width,
                    h: 16,
                    color: segment.color,
                });
                chartCurrentX += width;
            });
        }
        const allIssues = [];
        report.executions.forEach((ex) => {
            ex.testCases.forEach((etc) => {
                etc.issues.forEach((issue) => {
                    allIssues.push({
                        type: issue.type === 'BUG' ? 'Bug' : 'Melhoria',
                        key: issue.jiraKey || 'N/A',
                        title: issue.title,
                        severity: issue.severity || '-',
                        status: issue.status || 'Open',
                        responsible: issue.responsible || '-',
                    });
                });
            });
        });
        const docDefinition = {
            content: [
                {
                    text: 'RELATÓRIO CONSOLIDADO DE TESTES',
                    style: 'docTitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 15],
                },
                {
                    columns: [
                        {
                            width: '55%',
                            stack: [
                                {
                                    text: [
                                        { text: 'Funcionalidade: ', bold: true },
                                        `${batch.testedFeature ?? '-'}\n`,
                                    ],
                                    lineHeight: 1.4,
                                    fontSize: 10,
                                },
                            ],
                        },
                        {
                            width: '45%',
                            table: {
                                widths: ['60%', '40%'],
                                body: [
                                    [
                                        { text: 'Métrica', bold: true, fillColor: '#EEEEEE' },
                                        { text: 'Valor', bold: true, fillColor: '#EEEEEE' },
                                    ],
                                    ['Total de Testes', `${summary.totalTests}`],
                                    ['Total Executado', `${executedTests}`],
                                    ['Total Passou', `${summary.passed}`],
                                    ['Total Falhou', `${summary.failed}`],
                                    ['Total Bloqueado', `${summary.blocked}`],
                                    ['% Aprovação', `${approvalRate.toFixed(1)}%`],
                                    ['% Sem Bloqueios', `${adjustedRate.toFixed(1)}%`],
                                ],
                            },
                            fontSize: 9,
                        },
                    ],
                    margin: [0, 0, 0, 20],
                },
                {
                    text: 'Gráfico de Execução',
                    style: 'sectionHeader',
                    margin: [0, 10, 0, 5],
                },
                {
                    canvas: [
                        { type: 'rect', x: 0, y: 0, w: 460, h: 18, color: '#e2e8f0' },
                        ...(summary.totalTests > 0 ? chartCanvas : []),
                    ],
                    margin: [0, 0, 0, 10],
                },
                {
                    columns: chartSegments
                        .filter((s) => s.count > 0)
                        .map((segment) => ({
                        width: 'auto',
                        stack: [
                            { text: segment.label, bold: true, fontSize: 9 },
                            {
                                text: `${segment.count} (${summary.totalTests > 0 ? ((segment.count / summary.totalTests) * 100).toFixed(0) : 0}%)`,
                                fontSize: 9,
                                color: segment.color,
                            },
                        ],
                        margin: [0, 0, 16, 0],
                    })),
                    margin: [0, 0, 0, 20],
                },
                {
                    text: 'Detalhamento por Suíte',
                    style: 'sectionHeader',
                    margin: [0, 10, 0, 5],
                },
                ...report.executions.map((ex) => [
                    ex.suite ? {
                        text: `${ex.suite.jiraKey} — ${ex.suite.title}`,
                        style: 'suiteHeader',
                        margin: [0, 10, 0, 5],
                    } : {
                        text: 'Execução do Lote',
                        style: 'suiteHeader',
                        margin: [0, 10, 0, 5],
                    },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['10%', '45%', '15%', '15%', '15%'],
                            body: [
                                [
                                    { text: 'Key', bold: true, fillColor: '#D9E1F2' },
                                    { text: 'Caso de Teste', bold: true, fillColor: '#D9E1F2' },
                                    { text: 'Status', bold: true, fillColor: '#D9E1F2' },
                                    { text: 'Responsável', bold: true, fillColor: '#D9E1F2' },
                                    { text: 'Issues', bold: true, fillColor: '#D9E1F2' },
                                ],
                                ...ex.testCases.map((tc) => {
                                    const statusColor = tc.status === 'PASSED'
                                        ? '#E2EFDA'
                                        : tc.status === 'FAILED'
                                            ? '#FCE4D6'
                                            : tc.status === 'BLOCKED'
                                                ? '#FFF2CC'
                                                : '#DDEBF7';
                                    const issueText = tc.issues.map((i) => i.jiraKey || i.title).join(', ') ||
                                        '-';
                                    return [
                                        {
                                            text: tc.testCase.jiraKey,
                                            color: 'blue',
                                            decoration: 'underline',
                                        },
                                        tc.testCase.title,
                                        { text: tc.status, fillColor: statusColor },
                                        tc.responsible || '-',
                                        issueText,
                                    ];
                                }),
                            ],
                        },
                        fontSize: 8,
                        margin: [0, 0, 0, 15],
                    },
                ]),
                {
                    text: 'Bugs e Melhorias Reportados',
                    style: 'sectionHeader',
                    margin: [0, 10, 0, 5],
                },
                allIssues.length === 0
                    ? {
                        text: 'Nenhum bug ou melhoria reportado neste batch.',
                        italics: true,
                        fontSize: 9,
                    }
                    : {
                        table: {
                            headerRows: 1,
                            widths: ['15%', '15%', '40%', '15%', '15%'],
                            body: [
                                [
                                    { text: 'Tipo', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'ID/Key', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'Título', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'Severidade', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'Status', bold: true, fillColor: '#F2F2F2' },
                                ],
                                ...allIssues.map((issue) => [
                                    issue.type,
                                    issue.key,
                                    issue.title,
                                    issue.severity,
                                    issue.status,
                                ]),
                            ],
                        },
                        fontSize: 8,
                    },
            ],
            defaultStyle: { font: 'DejaVuSans' },
            styles: {
                docTitle: { fontSize: 16, bold: true },
                sectionHeader: { fontSize: 12, bold: true, color: '#1F4E78' },
                suiteHeader: { fontSize: 11, bold: true, color: '#334155' },
            },
        };
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.end();
        return await new Promise((resolve) => {
            pdfDoc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }
    async generatePdf(executionId) {
        const execution = await this.prisma.execution.findUnique({
            where: { id: executionId },
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
            throw new common_1.HttpException('Ciclo de execução não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        const totalTests = execution.testCases.length;
        const passedTests = execution.testCases.filter((tc) => tc.status === 'PASSED').length;
        const failedTests = execution.testCases.filter((tc) => tc.status === 'FAILED').length;
        const blockedTests = execution.testCases.filter((tc) => tc.status === 'BLOCKED').length;
        const executedTests = passedTests + failedTests + blockedTests;
        const approvalRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        const adjustedRate = totalTests - blockedTests > 0
            ? (passedTests / (totalTests - blockedTests)) * 100
            : 0;
        const pendingTests = totalTests - executedTests;
        const chartSegments = [
            { label: 'Passou', count: passedTests, color: '#22c55e' },
            { label: 'Falhou', count: failedTests, color: '#ef4444' },
            { label: 'Bloqueado', count: blockedTests, color: '#ffd15a' },
            { label: 'Pendente', count: pendingTests, color: '#0066ff' },
        ];
        const chartWidth = 460;
        let chartCurrentX = 0;
        const chartCanvas = [];
        if (totalTests > 0) {
            chartCanvas.push({
                type: 'rect',
                x: 0,
                y: 0,
                w: chartWidth,
                h: 16,
                color: '#f8fafc',
            });
            chartSegments.forEach((segment) => {
                if (segment.count <= 0) {
                    return;
                }
                const width = Math.max((segment.count / totalTests) * chartWidth, 12);
                chartCanvas.push({
                    type: 'rect',
                    x: chartCurrentX,
                    y: 0,
                    w: width,
                    h: 16,
                    color: segment.color,
                });
                chartCurrentX += width;
            });
        }
        const allIssues = [];
        execution.testCases.forEach((etc) => {
            etc.issues.forEach((issue) => {
                allIssues.push({
                    type: issue.type === 'BUG' ? 'Bug' : 'Melhoria',
                    key: issue.jiraKey || 'N/A',
                    title: issue.title,
                    severity: issue.severity || '-',
                    status: issue.status || 'Open',
                    responsible: issue.responsible || '-',
                });
            });
        });
        const docDefinition = {
            content: [
                {
                    text: 'RELATÓRIO DE EXECUÇÃO DE TESTES',
                    style: 'docTitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 15],
                },
                {
                    columns: [
                        {
                            width: '55%',
                            stack: [
                                {
                                    text: [
                                        { text: 'Sprint: ', bold: true },
                                        `${execution.sprint}\n`,
                                        { text: 'Versão do sistema: ', bold: true },
                                        `${execution.version}\n`,
                                        { text: 'Data de início: ', bold: true },
                                        `${this.formatDate(execution.startDate)}\n`,
                                        { text: 'Data de fim: ', bold: true },
                                        `${this.formatDate(execution.endDate)}\n`,
                                        { text: 'Funcionalidade: ', bold: true },
                                        `${execution.testedFeature}\n`,
                                        { text: 'Responsável: ', bold: true },
                                        `${execution.responsible}\n`,
                                    ],
                                    lineHeight: 1.4,
                                    fontSize: 10,
                                },
                            ],
                        },
                        {
                            width: '45%',
                            table: {
                                widths: ['60%', '40%'],
                                body: [
                                    [
                                        { text: 'Métrica', bold: true, fillColor: '#EEEEEE' },
                                        { text: 'Valor', bold: true, fillColor: '#EEEEEE' },
                                    ],
                                    ['Total de Testes', `${totalTests}`],
                                    ['Total Executado', `${executedTests}`],
                                    ['Total Passou', `${passedTests}`],
                                    ['Total Falhou', `${failedTests}`],
                                    ['Total Bloqueado', `${blockedTests}`],
                                    ['% Aprovação', `${approvalRate.toFixed(1)}%`],
                                    ['% Sem Bloqueios', `${adjustedRate.toFixed(1)}%`],
                                ],
                            },
                            fontSize: 9,
                        },
                    ],
                    margin: [0, 0, 0, 20],
                },
                {
                    text: 'Gráfico de Execução',
                    style: 'sectionHeader',
                    margin: [0, 10, 0, 5],
                },
                {
                    canvas: [
                        { type: 'rect', x: 0, y: 0, w: 460, h: 18, color: '#e2e8f0' },
                        ...(totalTests > 0 ? chartCanvas : []),
                    ],
                    margin: [0, 0, 0, 10],
                },
                {
                    columns: [
                        ...chartSegments
                            .filter((s) => s.count > 0)
                            .map((segment) => ({
                            width: 'auto',
                            stack: [
                                { text: segment.label, bold: true, fontSize: 9 },
                                {
                                    text: `${segment.count} (${totalTests > 0 ? ((segment.count / totalTests) * 100).toFixed(0) : 0}%)`,
                                    fontSize: 9,
                                    color: segment.color,
                                },
                            ],
                            margin: [0, 0, 16, 0],
                        })),
                    ],
                    margin: [0, 0, 0, 20],
                },
                {
                    text: 'Detalhamento dos Casos de Teste',
                    style: 'sectionHeader',
                    margin: [0, 10, 0, 5],
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['10%', '45%', '15%', '15%', '15%'],
                        body: [
                            [
                                { text: 'Key', bold: true, fillColor: '#D9E1F2' },
                                { text: 'Caso de Teste', bold: true, fillColor: '#D9E1F2' },
                                { text: 'Status', bold: true, fillColor: '#D9E1F2' },
                                { text: 'Responsável', bold: true, fillColor: '#D9E1F2' },
                                { text: 'Issues', bold: true, fillColor: '#D9E1F2' },
                            ],
                            ...execution.testCases.map((tc) => {
                                const statusColor = tc.status === 'PASSED'
                                    ? '#E2EFDA'
                                    : tc.status === 'FAILED'
                                        ? '#FCE4D6'
                                        : tc.status === 'BLOCKED'
                                            ? '#FFF2CC'
                                            : '#DDEBF7';
                                const issueText = tc.issues.map((i) => i.jiraKey || i.title).join(', ') || '-';
                                return [
                                    {
                                        text: tc.testCase.jiraKey,
                                        color: 'blue',
                                        decoration: 'underline',
                                    },
                                    tc.testCase.title,
                                    { text: tc.status, fillColor: statusColor },
                                    tc.responsible || '-',
                                    issueText,
                                ];
                            }),
                        ],
                    },
                    fontSize: 8,
                    margin: [0, 0, 0, 20],
                },
                {
                    text: 'Bugs e Melhorias Reportados',
                    style: 'sectionHeader',
                    margin: [0, 10, 0, 5],
                },
                allIssues.length === 0
                    ? {
                        text: 'Nenhum bug ou melhoria reportado neste ciclo.',
                        italics: true,
                        fontSize: 9,
                    }
                    : {
                        table: {
                            headerRows: 1,
                            widths: ['15%', '15%', '40%', '15%', '15%'],
                            body: [
                                [
                                    { text: 'Tipo', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'ID/Key', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'Título', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'Severidade', bold: true, fillColor: '#F2F2F2' },
                                    { text: 'Status', bold: true, fillColor: '#F2F2F2' },
                                ],
                                ...allIssues.map((issue) => [
                                    issue.type,
                                    issue.key,
                                    issue.title,
                                    issue.severity,
                                    issue.status,
                                ]),
                            ],
                        },
                        fontSize: 8,
                    },
            ],
            defaultStyle: {
                font: 'DejaVuSans',
            },
            styles: {
                docTitle: {
                    fontSize: 16,
                    bold: true,
                },
                sectionHeader: {
                    fontSize: 12,
                    bold: true,
                    color: '#1F4E78',
                },
            },
        };
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.end();
        return await new Promise((resolve) => {
            pdfDoc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map