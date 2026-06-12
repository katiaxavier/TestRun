"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuitesModule = void 0;
const common_1 = require("@nestjs/common");
const suites_service_1 = require("./suites.service");
const suites_controller_1 = require("./suites.controller");
const jira_module_1 = require("../jira/jira.module");
let SuitesModule = class SuitesModule {
};
exports.SuitesModule = SuitesModule;
exports.SuitesModule = SuitesModule = __decorate([
    (0, common_1.Module)({
        imports: [jira_module_1.JiraModule],
        providers: [suites_service_1.SuitesService],
        controllers: [suites_controller_1.SuitesController],
        exports: [suites_service_1.SuitesService],
    })
], SuitesModule);
//# sourceMappingURL=suites.module.js.map