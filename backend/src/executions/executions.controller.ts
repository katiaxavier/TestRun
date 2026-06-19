import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ExecutionsService,
  CreateExecutionDto,
  UpdateTestCaseDto,
  CreateIssueDto,
  UpdateIssueDto,
  CreateScenarioDto,
  UpdateScenarioDto,
} from './executions.service';

@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateExecutionDto) {
    return this.executionsService.create(dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.executionsService.delete(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.executionsService.updateStatus(id, status);
  }

  @Patch(':executionId/test-cases/:id')
  async updateTestCase(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.executionsService.updateTestCase(id, dto);
  }

  @Post(':executionId/test-cases/:id/issues')
  async addIssue(@Param('id') id: string, @Body() dto: CreateIssueDto) {
    return this.executionsService.addIssue(id, dto);
  }

  @Delete(':executionId/test-cases/:etcId')
  async removeTestCase(
    @Param('executionId') executionId: string,
    @Param('etcId') etcId: string,
  ) {
    return this.executionsService.removeTestCaseFromExecution(executionId, etcId);
  }

  @Patch(':executionId/test-cases/:etcId/issues/:id')
  async updateIssue(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    return this.executionsService.updateIssue(id, dto);
  }

  @Delete(':executionId/test-cases/:etcId/issues/:id')
  async removeIssue(@Param('id') id: string) {
    return this.executionsService.removeIssue(id);
  }

  // ── Scenarios ────────────────────────────────────────────────────────────────

  @Post(':executionId/test-cases/:etcId/scenarios')
  async createScenario(
    @Param('etcId') etcId: string,
    @Body() dto: CreateScenarioDto,
  ) {
    return this.executionsService.createScenario(etcId, dto);
  }

  @Patch(':executionId/test-cases/:etcId/scenarios/:scenarioId')
  async updateScenario(
    @Param('etcId') etcId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateScenarioDto,
  ) {
    return this.executionsService.updateScenario(etcId, scenarioId, dto);
  }

  @Delete(':executionId/test-cases/:etcId/scenarios/:scenarioId')
  async deleteScenario(
    @Param('etcId') etcId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.executionsService.deleteScenario(etcId, scenarioId);
  }

  @Post(':executionId/test-cases/:etcId/scenarios/:scenarioId/issues')
  async addScenarioIssue(
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.executionsService.addScenarioIssue(scenarioId, dto);
  }

  @Patch(':executionId/test-cases/:etcId/scenarios/:scenarioId/issues/:issueId')
  async updateScenarioIssue(
    @Param('scenarioId') scenarioId: string,
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.executionsService.updateScenarioIssue(scenarioId, issueId, dto);
  }

  @Delete(':executionId/test-cases/:etcId/scenarios/:scenarioId/issues/:issueId')
  async removeScenarioIssue(
    @Param('scenarioId') scenarioId: string,
    @Param('issueId') issueId: string,
  ) {
    return this.executionsService.removeScenarioIssue(scenarioId, issueId);
  }
}
