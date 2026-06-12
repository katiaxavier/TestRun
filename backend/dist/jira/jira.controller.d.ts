import { JiraService } from './jira.service';
export declare class JiraController {
    private readonly jiraService;
    constructor(jiraService: JiraService);
    testConnection(): Promise<{
        success: boolean;
        message: string;
    }>;
    importSuite(key: string): Promise<import("./jira.service").JiraImportResult>;
}
