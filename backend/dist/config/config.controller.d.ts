import { ConfigService, JiraConfig } from './config.service';
export declare class ConfigController {
    private readonly configService;
    constructor(configService: ConfigService);
    getConfig(): {
        url: string;
        email: string;
        token: string;
    };
    saveConfig(body: JiraConfig): {
        message: string;
    };
}
