import {
  Controller,
  Get,
  Post,
  Put,
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
}
