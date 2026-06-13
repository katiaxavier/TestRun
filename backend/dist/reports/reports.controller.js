"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async downloadXlsx(id, res) {
        try {
            const buffer = await this.reportsService.generateXlsx(id);
            res.status(common_1.HttpStatus.OK);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=relatorio_execucao_${id}.xlsx`);
            res.end(buffer);
        }
        catch (error) {
            console.error('Error exporting XLSX:', error);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Erro ao gerar planilha XLSX.',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async downloadPdf(id, res) {
        try {
            const buffer = await this.reportsService.generatePdf(id);
            res.status(common_1.HttpStatus.OK);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=relatorio_execucao_${id}.pdf`);
            res.end(buffer);
        }
        catch (error) {
            console.error('Error exporting PDF:', error);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Erro ao gerar relatório PDF.',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async getBatchReport(id) {
        return this.reportsService.getBatchReport(id);
    }
    async downloadBatchXlsx(id, res) {
        try {
            const buffer = await this.reportsService.generateBatchXlsx(id);
            res.status(common_1.HttpStatus.OK);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=relatorio_batch_${id}.xlsx`);
            res.end(buffer);
        }
        catch (error) {
            console.error('Error exporting batch XLSX:', error);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Erro ao gerar planilha XLSX do batch.',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async downloadBatchPdf(id, res) {
        try {
            const buffer = await this.reportsService.generateBatchPdf(id);
            res.status(common_1.HttpStatus.OK);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=relatorio_batch_${id}.pdf`);
            res.end(buffer);
        }
        catch (error) {
            console.error('Error exporting batch PDF:', error);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Erro ao gerar relatório PDF do batch.',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)(['executions/:id/xlsx', ':id/xlsx']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "downloadXlsx", null);
__decorate([
    (0, common_1.Get)(['executions/:id/pdf', ':id/pdf']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Get)('batch/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getBatchReport", null);
__decorate([
    (0, common_1.Get)('batch/:id/xlsx'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "downloadBatchXlsx", null);
__decorate([
    (0, common_1.Get)('batch/:id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "downloadBatchPdf", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map