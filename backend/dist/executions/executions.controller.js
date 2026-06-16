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
exports.ExecutionsController = void 0;
const common_1 = require("@nestjs/common");
const executions_service_1 = require("./executions.service");
let ExecutionsController = class ExecutionsController {
    executionsService;
    constructor(executionsService) {
        this.executionsService = executionsService;
    }
    async findOne(id) {
        return this.executionsService.findOne(id);
    }
    async create(dto) {
        return this.executionsService.create(dto);
    }
    async delete(id) {
        return this.executionsService.delete(id);
    }
    async updateStatus(id, status) {
        return this.executionsService.updateStatus(id, status);
    }
    async updateTestCase(id, dto) {
        return this.executionsService.updateTestCase(id, dto);
    }
    async addIssue(id, dto) {
        return this.executionsService.addIssue(id, dto);
    }
    async removeIssue(id) {
        return this.executionsService.removeIssue(id);
    }
};
exports.ExecutionsController = ExecutionsController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [executions_service_1.CreateExecutionDto]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "delete", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':executionId/test-cases/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, executions_service_1.UpdateTestCaseDto]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "updateTestCase", null);
__decorate([
    (0, common_1.Post)(':executionId/test-cases/:id/issues'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, executions_service_1.CreateIssueDto]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "addIssue", null);
__decorate([
    (0, common_1.Delete)(':executionId/test-cases/:etcId/issues/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExecutionsController.prototype, "removeIssue", null);
exports.ExecutionsController = ExecutionsController = __decorate([
    (0, common_1.Controller)('executions'),
    __metadata("design:paramtypes", [executions_service_1.ExecutionsService])
], ExecutionsController);
//# sourceMappingURL=executions.controller.js.map