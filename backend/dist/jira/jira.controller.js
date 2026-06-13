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
exports.JiraController = void 0;
const common_1 = require("@nestjs/common");
const jira_service_1 = require("./jira.service");
let JiraController = class JiraController {
    jiraService;
    constructor(jiraService) {
        this.jiraService = jiraService;
    }
    async testConnection() {
        const success = await this.jiraService.testConnection();
        if (!success) {
            throw new common_1.HttpException('Falha na conexão com o Jira. Verifique a URL, usuário e API Token.', common_1.HttpStatus.UNAUTHORIZED);
        }
        return {
            success: true,
            message: 'Conexão com o Jira estabelecida com sucesso!',
        };
    }
    async importSuite(key) {
        if (!key) {
            throw new common_1.HttpException('A chave da suíte é obrigatória.', common_1.HttpStatus.BAD_REQUEST);
        }
        return await this.jiraService.importSuite(key.trim().toUpperCase());
    }
};
exports.JiraController = JiraController;
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JiraController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)('import'),
    __param(0, (0, common_1.Body)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JiraController.prototype, "importSuite", null);
exports.JiraController = JiraController = __decorate([
    (0, common_1.Controller)('jira'),
    __metadata("design:paramtypes", [jira_service_1.JiraService])
], JiraController);
//# sourceMappingURL=jira.controller.js.map