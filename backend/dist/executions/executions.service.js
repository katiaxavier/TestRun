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
exports.ExecutionsService = exports.CreateIssueDto = exports.UpdateTestCaseDto = exports.CreateBatchExecutionDto = exports.CreateExecutionDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
class CreateExecutionDto {
    suiteId;
    sprint;
    version;
    startDate;
    endDate;
    responsible;
}
exports.CreateExecutionDto = CreateExecutionDto;
class CreateBatchExecutionDto {
    suiteIds;
    name;
    sprint;
    version;
    startDate;
    endDate;
    responsible;
}
exports.CreateBatchExecutionDto = CreateBatchExecutionDto;
class UpdateTestCaseDto {
    status;
    responsible;
    comments;
}
exports.UpdateTestCaseDto = UpdateTestCaseDto;
class CreateIssueDto {
    type;
    jiraKey;
    title;
    severity;
    status;
    responsible;
}
exports.CreateIssueDto = CreateIssueDto;
let ExecutionsService = class ExecutionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(id) {
        const execution = await this.prisma.execution.findUnique({
            where: { id },
            include: {
                suite: true,
                testCases: {
                    include: {
                        testCase: true,
                        issues: true,
                    },
                    orderBy: {
                        testCase: {
                            jiraKey: 'asc',
                        },
                    },
                },
            },
        });
        if (!execution) {
            throw new common_1.HttpException('Ciclo de execução não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        return execution;
    }
    async create(dto) {
        const suite = await this.prisma.suite.findUnique({
            where: { id: dto.suiteId },
            include: { testCases: true },
        });
        if (!suite) {
            throw new common_1.HttpException('Suíte de testes não encontrada.', common_1.HttpStatus.NOT_FOUND);
        }
        if (suite.testCases.length === 0) {
            throw new common_1.HttpException('A suíte de testes não possui nenhum caso de teste importado.', common_1.HttpStatus.BAD_REQUEST);
        }
        const execution = await this.prisma.execution.create({
            data: {
                suiteId: dto.suiteId,
                sprint: dto.sprint,
                version: dto.version || '',
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                responsible: dto.responsible,
                status: 'IN_PROGRESS',
            },
        });
        for (const tc of suite.testCases) {
            await this.prisma.executionTestCase.create({
                data: {
                    executionId: execution.id,
                    testCaseId: tc.id,
                    status: 'PENDING',
                    responsible: dto.responsible,
                },
            });
        }
        return this.findOne(execution.id);
    }
    async updateTestCase(execTestCaseId, dto) {
        const etc = await this.prisma.executionTestCase.findUnique({
            where: { id: execTestCaseId },
        });
        if (!etc) {
            throw new common_1.HttpException('Item de execução de teste não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        const updated = await this.prisma.executionTestCase.update({
            where: { id: execTestCaseId },
            data: {
                status: dto.status !== undefined ? dto.status.toUpperCase() : undefined,
                responsible: dto.responsible !== undefined ? dto.responsible : undefined,
                comments: dto.comments !== undefined ? dto.comments : undefined,
            },
            include: {
                testCase: true,
                issues: true,
            },
        });
        return updated;
    }
    async addIssue(execTestCaseId, dto) {
        const etc = await this.prisma.executionTestCase.findUnique({
            where: { id: execTestCaseId },
        });
        if (!etc) {
            throw new common_1.HttpException('Item de execução de teste não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        const issue = await this.prisma.issue.create({
            data: {
                executionTestCaseId: execTestCaseId,
                type: dto.type.toUpperCase(),
                jiraKey: dto.jiraKey || null,
                title: dto.title,
                severity: dto.severity || null,
                status: dto.status || 'Open',
                responsible: dto.responsible || null,
            },
        });
        return issue;
    }
    async removeIssue(issueId) {
        const issue = await this.prisma.issue.findUnique({
            where: { id: issueId },
        });
        if (!issue) {
            throw new common_1.HttpException('Issue não encontrada.', common_1.HttpStatus.NOT_FOUND);
        }
        await this.prisma.issue.delete({
            where: { id: issueId },
        });
        return { success: true, message: 'Issue removida com sucesso!' };
    }
    async delete(id) {
        const execution = await this.prisma.execution.findUnique({
            where: { id },
        });
        if (!execution) {
            throw new common_1.HttpException('Ciclo de execução não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        await this.prisma.execution.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Ciclo de execução excluído com sucesso!',
        };
    }
    async updateStatus(id, status) {
        const execution = await this.prisma.execution.findUnique({
            where: { id },
        });
        if (!execution) {
            throw new common_1.HttpException('Ciclo de execução não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        return this.prisma.execution.update({
            where: { id },
            data: { status: status.toUpperCase() },
        });
    }
    async createBatch(dto) {
        const suites = await this.prisma.suite.findMany({
            where: { id: { in: dto.suiteIds } },
            include: { testCases: { orderBy: { jiraKey: 'asc' } } },
        });
        if (suites.length !== dto.suiteIds.length) {
            throw new common_1.HttpException('Uma ou mais suites não foram encontradas.', common_1.HttpStatus.NOT_FOUND);
        }
        if (suites.some((s) => s.testCases.length === 0)) {
            throw new common_1.HttpException('Todas as suites devem possuir casos de teste importados.', common_1.HttpStatus.BAD_REQUEST);
        }
        const batch = await this.prisma.executionBatch.create({
            data: {
                name: dto.name || null,
                suiteIds: dto.suiteIds,
                sprint: dto.sprint,
                version: dto.version || '',
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                responsible: dto.responsible,
                status: 'IN_PROGRESS',
            },
        });
        const execution = await this.prisma.execution.create({
            data: {
                batchId: batch.id,
                sprint: dto.sprint,
                version: dto.version || '',
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                responsible: dto.responsible,
                status: 'IN_PROGRESS',
            },
        });
        for (const suite of suites) {
            for (const tc of suite.testCases) {
                await this.prisma.executionTestCase.create({
                    data: {
                        executionId: execution.id,
                        testCaseId: tc.id,
                        status: 'PENDING',
                        responsible: dto.responsible,
                    },
                });
            }
        }
        return this.prisma.executionBatch.findUnique({
            where: { id: batch.id },
            include: {
                executions: {
                    include: {
                        suite: true,
                        testCases: {
                            include: { testCase: true, issues: true },
                        },
                    },
                },
            },
        });
    }
    async findBatch(id) {
        const batch = await this.prisma.executionBatch.findUnique({
            where: { id },
            include: {
                executions: {
                    include: {
                        suite: true,
                        testCases: {
                            include: { testCase: true, issues: true },
                        },
                    },
                },
            },
        });
        if (!batch) {
            throw new common_1.HttpException('Batch não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        return batch;
    }
    async findAllBatches() {
        return this.prisma.executionBatch.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                executions: {
                    include: {
                        suite: true,
                        _count: { select: { testCases: true } },
                    },
                },
            },
        });
    }
    async deleteBatch(id) {
        const batch = await this.prisma.executionBatch.findUnique({
            where: { id },
        });
        if (!batch) {
            throw new common_1.HttpException('Batch não encontrado.', common_1.HttpStatus.NOT_FOUND);
        }
        await this.prisma.executionBatch.delete({
            where: { id },
        });
        return { success: true, message: 'Batch excluído com sucesso!' };
    }
};
exports.ExecutionsService = ExecutionsService;
exports.ExecutionsService = ExecutionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExecutionsService);
//# sourceMappingURL=executions.service.js.map