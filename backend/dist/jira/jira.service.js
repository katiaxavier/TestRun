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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraService = void 0;
const common_1 = require("@nestjs/common");
const config_service_1 = require("../config/config.service");
let JiraService = class JiraService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    getAuthHeader(email, token) {
        const creds = `${email}:${token}`;
        return `Basic ${Buffer.from(creds).toString('base64')}`;
    }
    async testConnection() {
        const config = this.configService.getJiraConfig();
        if (!config.url || !config.email || !config.token) {
            throw new common_1.HttpException('Configurações do Jira incompletas. Por favor, configure a URL, e-mail e API Token.', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const auth = this.getAuthHeader(config.email, config.token);
            const response = await fetch(`${config.url}/rest/api/3/myself`, {
                method: 'GET',
                headers: {
                    Authorization: auth,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Jira connection test failed:', error);
            return false;
        }
    }
    async importSuite(suiteKey) {
        const config = this.configService.getJiraConfig();
        if (!config.url || !config.email || !config.token) {
            throw new common_1.HttpException('Configurações do Jira incompletas. Por favor, configure a URL, e-mail e API Token.', common_1.HttpStatus.BAD_REQUEST);
        }
        const auth = this.getAuthHeader(config.email, config.token);
        const issueUrl = `${config.url}/rest/api/3/issue/${suiteKey}`;
        try {
            const response = await fetch(issueUrl, {
                method: 'GET',
                headers: {
                    Authorization: auth,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    throw new common_1.HttpException(`Suíte de teste com chave '${suiteKey}' não encontrada no Jira.`, common_1.HttpStatus.NOT_FOUND);
                }
                throw new common_1.HttpException(`Erro ao consultar Jira (${response.statusText}). Verifique as credenciais.`, common_1.HttpStatus.BAD_REQUEST);
            }
            const issueData = await response.json();
            const suiteTitle = issueData.fields?.summary || `Suíte ${suiteKey}`;
            const testCases = [];
            const links = issueData.fields?.issuelinks || [];
            for (const link of links) {
                const type = link.type;
                const inward = type?.inward?.toLowerCase() || '';
                const outward = type?.outward?.toLowerCase() || '';
                const typeName = type?.name?.toLowerCase() || '';
                const isParentRelation = inward.includes('parent') ||
                    outward.includes('parent') ||
                    typeName.includes('parent') ||
                    inward.includes('mãe') ||
                    outward.includes('mãe') ||
                    inward.includes('pai') ||
                    outward.includes('pai');
                if (isParentRelation) {
                    let targetIssue = link.outwardIssue || link.inwardIssue;
                    if (link.outwardIssue && (outward.includes('parent') || outward.includes('pai') || outward.includes('mãe'))) {
                        targetIssue = link.outwardIssue;
                    }
                    else if (link.inwardIssue && (inward.includes('parent') || inward.includes('pai') || inward.includes('mãe'))) {
                        targetIssue = link.inwardIssue;
                    }
                    if (targetIssue && targetIssue.key !== suiteKey) {
                        testCases.push({
                            key: targetIssue.key,
                            title: targetIssue.fields?.summary || `Caso de Teste ${targetIssue.key}`,
                            link: `${config.url}/browse/${targetIssue.key}`,
                        });
                    }
                }
            }
            if (testCases.length === 0 && links.length > 0) {
                console.warn('Nenhum relacionamento do tipo "parent" identificado. Importando links disponíveis como fallback...');
                for (const link of links) {
                    const targetIssue = link.outwardIssue || link.inwardIssue;
                    if (targetIssue && targetIssue.key !== suiteKey) {
                        testCases.push({
                            key: targetIssue.key,
                            title: targetIssue.fields?.summary || `Caso de Teste ${targetIssue.key}`,
                            link: `${config.url}/browse/${targetIssue.key}`,
                        });
                    }
                }
            }
            return {
                suiteKey,
                suiteTitle,
                testCases,
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('Error importing suite from Jira:', error);
            throw new common_1.HttpException(`Falha ao conectar com o Jira: ${error instanceof Error ? error.message : String(error)}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.JiraService = JiraService;
exports.JiraService = JiraService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.ConfigService])
], JiraService);
//# sourceMappingURL=jira.service.js.map