import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Patch,
  HttpCode,
  Query,
  UseGuards,
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
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('executions')
@UseGuards(ProjectAccessGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ProjectAccess('direct')
  async findRecent(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.executionsService.findRecentExecutions(
      projectId,
      boardId,
      status,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @ProjectAccess('execution')
  async findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }

  @Post()
  @ProjectAccess('suite', 'suiteId', 'body')
  async create(@Body() dto: CreateExecutionDto) {
    return this.executionsService.create(dto);
  }

  @Delete(':id')
  @ProjectAccess('execution')
  async delete(@Param('id') id: string) {
    return this.executionsService.delete(id);
  }

  @Patch(':id/status')
  @ProjectAccess('execution')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.executionsService.updateStatus(id, status);
  }

  @Patch(':executionId/test-cases/:id')
  @ProjectAccess('execution')
  async updateTestCase(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.executionsService.updateTestCase(id, dto);
  }

  @Post(':executionId/test-cases/:id/issues')
  @ProjectAccess('execution')
  async addIssue(@Param('id') id: string, @Body() dto: CreateIssueDto) {
    return this.executionsService.addIssue(id, dto);
  }

  @Delete(':executionId/test-cases/:etcId')
  @ProjectAccess('execution')
  async removeTestCase(
    @Param('executionId') executionId: string,
    @Param('etcId') etcId: string,
  ) {
    return this.executionsService.removeTestCaseFromExecution(executionId, etcId);
  }

  @Patch(':executionId/test-cases/:etcId/issues/:id')
  @ProjectAccess('execution')
  async updateIssue(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    return this.executionsService.updateIssue(id, dto);
  }

  @Delete(':executionId/test-cases/:etcId/issues/:id')
  @ProjectAccess('execution')
  async removeIssue(@Param('id') id: string) {
    return this.executionsService.removeIssue(id);
  }

  // ── Scenarios ────────────────────────────────────────────────────────────────

  @Post(':executionId/test-cases/:etcId/scenarios')
  @ProjectAccess('execution')
  async createScenario(
    @Param('etcId') etcId: string,
    @Body() dto: CreateScenarioDto,
  ) {
    return this.executionsService.createScenario(etcId, dto);
  }

  @Post(':executionId/test-cases/:etcId/scenarios/batch')
  @ProjectAccess('execution')
  async createScenarioBatch(
    @Param('etcId') etcId: string,
    @Body('names') names: string[],
  ) {
    return this.executionsService.createScenarioBatch(etcId, names);
  }

  @Patch(':executionId/test-cases/:etcId/scenarios/:scenarioId')
  @ProjectAccess('execution')
  async updateScenario(
    @Param('etcId') etcId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateScenarioDto,
  ) {
    return this.executionsService.updateScenario(etcId, scenarioId, dto);
  }

  @Delete(':executionId/test-cases/:etcId/scenarios/:scenarioId')
  @ProjectAccess('execution')
  async deleteScenario(
    @Param('etcId') etcId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.executionsService.deleteScenario(etcId, scenarioId);
  }

  @Delete(':executionId/test-cases/:etcId/scenarios')
  @HttpCode(200)
  @ProjectAccess('execution')
  async deleteScenarioBatch(
    @Param('etcId') etcId: string,
    @Body('ids') ids: string[],
  ) {
    return this.executionsService.deleteScenarioBatch(etcId, ids);
  }

  @Post(':executionId/test-cases/:etcId/scenarios/:scenarioId/issues')
  @ProjectAccess('execution')
  async addScenarioIssue(
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.executionsService.addScenarioIssue(scenarioId, dto);
  }

  @Patch(':executionId/test-cases/:etcId/scenarios/:scenarioId/issues/:issueId')
  @ProjectAccess('execution')
  async updateScenarioIssue(
    @Param('scenarioId') scenarioId: string,
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.executionsService.updateScenarioIssue(scenarioId, issueId, dto);
  }

  @Delete(':executionId/test-cases/:etcId/scenarios/:scenarioId/issues/:issueId')
  @ProjectAccess('execution')
  async removeScenarioIssue(
    @Param('scenarioId') scenarioId: string,
    @Param('issueId') issueId: string,
  ) {
    return this.executionsService.removeScenarioIssue(scenarioId, issueId);
  }
}
