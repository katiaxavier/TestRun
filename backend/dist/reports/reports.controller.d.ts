import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    downloadXlsx(id: string, res: any): Promise<void>;
    downloadPdf(id: string, res: any): Promise<void>;
}
