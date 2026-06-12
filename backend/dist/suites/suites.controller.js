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
exports.SuitesController = void 0;
const common_1 = require("@nestjs/common");
const suites_service_1 = require("./suites.service");
let SuitesController = class SuitesController {
    suitesService;
    constructor(suitesService) {
        this.suitesService = suitesService;
    }
    async findAll() {
        return this.suitesService.findAll();
    }
    async findOne(id) {
        return this.suitesService.findOne(id);
    }
    async importSuite(jiraKey) {
        if (!jiraKey) {
            throw new common_1.HttpException('A chave do Jira é obrigatória.', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.suitesService.importFromJira(jiraKey);
    }
    async deleteSuite(id) {
        return this.suitesService.deleteSuite(id);
    }
    async deleteTestCase(id) {
        return this.suitesService.deleteTestCase(id);
    }
};
exports.SuitesController = SuitesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuitesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuitesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('import'),
    __param(0, (0, common_1.Body)('jiraKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuitesController.prototype, "importSuite", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuitesController.prototype, "deleteSuite", null);
__decorate([
    (0, common_1.Delete)('test-cases/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuitesController.prototype, "deleteTestCase", null);
exports.SuitesController = SuitesController = __decorate([
    (0, common_1.Controller)('suites'),
    __metadata("design:paramtypes", [suites_service_1.SuitesService])
], SuitesController);
//# sourceMappingURL=suites.controller.js.map