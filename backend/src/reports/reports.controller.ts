import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(['executions/:id/xlsx', ':id/xlsx'])
  async downloadXlsx(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.reportsService.generateXlsx(id);

      res.status(HttpStatus.OK);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=relatorio_execucao_${id}.xlsx`,
      );
      res.end(buffer);
    } catch (error) {
      console.error('Error exporting XLSX:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erro ao gerar planilha XLSX.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Get(['executions/:id/pdf', ':id/pdf'])
  async downloadPdf(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.reportsService.generatePdf(id);

      res.status(HttpStatus.OK);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=relatorio_execucao_${id}.pdf`,
      );
      res.end(buffer);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erro ao gerar relatório PDF.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Get('batch/:id')
  async getBatchReport(@Param('id') id: string) {
    return this.reportsService.getBatchReport(id);
  }

  @Get('batch/:id/xlsx')
  async downloadBatchXlsx(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.reportsService.generateBatchXlsx(id);

      res.status(HttpStatus.OK);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=relatorio_batch_${id}.xlsx`,
      );
      res.end(buffer);
    } catch (error) {
      console.error('Error exporting batch XLSX:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erro ao gerar planilha XLSX do batch.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Get('batch/:id/pdf')
  async downloadBatchPdf(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.reportsService.generateBatchPdf(id);

      res.status(HttpStatus.OK);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=relatorio_batch_${id}.pdf`,
      );
      res.end(buffer);
    } catch (error) {
      console.error('Error exporting batch PDF:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erro ao gerar relatório PDF do batch.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
