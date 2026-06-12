import { ConfigService } from '../config/config.service';
export interface JiraImportResult {
    suiteKey: string;
    suiteTitle: string;
    testCases: Array<{
        key: string;
        title: string;
        link: string;
    }>;
}
export declare class JiraService {
    private readonly configService;
    constructor(configService: ConfigService);
    private getAuthHeader;
    testConnection(): Promise<boolean>;
    importSuite(suiteKey: string): Promise<JiraImportResult>;
}
