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
exports.SuitesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jira_service_1 = require("../jira/jira.service");
let SuitesService = class SuitesService {
    prisma;
    jiraService;
    constructor(prisma, jiraService) {
        this.prisma = prisma;
        this.jiraService = jiraService;
    }
    async findAll() {
        return this.prisma.suite.findMany({
            include: {
                _count: {
                    select: { testCases: true, executions: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findOne(id) {
        const suite = await this.prisma.suite.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { testCases: true, executions: true },
                },
                testCases: {
                    orderBy: { jiraKey: 'asc' },
                },
                executions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: { testCases: true },
                        },
                    },
                },
            },
        });
        if (!suite) {
            throw new common_1.HttpException('Suíte não encontrada.', common_1.HttpStatus.NOT_FOUND);
        }
        return suite;
    }
    async importFromJira(jiraKey) {
        const key = jiraKey.trim().toUpperCase();
        const jiraData = await this.jiraService.importSuite(key);
        const suite = await this.prisma.suite.upsert({
            where: { jiraKey: key },
            update: { title: jiraData.suiteTitle },
            create: {
                jiraKey: key,
                title: jiraData.suiteTitle,
            },
        });
        const currentTestCases = await this.prisma.testCase.findMany({
            where: { suiteId: suite.id },
        });
        const currentKeys = new Set(currentTestCases.map((tc) => tc.jiraKey));
        for (const tc of jiraData.testCases) {
            if (!currentKeys.has(tc.key)) {
                await this.prisma.testCase.create({
                    data: {
                        jiraKey: tc.key,
                        title: tc.title,
                        link: tc.link,
                        priority: tc.priority,
                        suiteId: suite.id,
                    },
                });
            }
            else {
                await this.prisma.testCase.updateMany({
                    where: { suiteId: suite.id, jiraKey: tc.key },
                    data: { title: tc.title, link: tc.link, priority: tc.priority },
                });
            }
        }
        return this.findOne(suite.id);
    }
    async deleteSuite(id) {
        await this.findOne(id);
        await this.prisma.suite.delete({
            where: { id },
        });
        return { success: true, message: 'Suíte excluída com sucesso!' };
    }
    async deleteTestCase(id) {
        const tc = await this.prisma.testCase.findUnique({
            where: { id },
        });
        if (!tc) {
            throw new common_1.HttpException('Caso de teste não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        await this.prisma.testCase.delete({
            where: { id },
        });
        return { success: true, message: 'Caso de teste excluído localmente!' };
    }
};
exports.SuitesService = SuitesService;
exports.SuitesService = SuitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jira_service_1.JiraService])
], SuitesService);
//# sourceMappingURL=suites.service.js.map