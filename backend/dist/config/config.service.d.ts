export declare class JiraConfig {
    url: string;
    email: string;
    token: string;
}
export declare class ConfigService {
    private readonly configPath;
    private readConfig;
    private writeConfig;
    getJiraConfig(): JiraConfig;
    saveJiraConfig(config: JiraConfig): void;
}
