import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ExecutionsService,
  CreateBatchExecutionDto,
  CreateBatchExecutionItemDto,
} from './executions.service';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('batch')
@UseGuards(ProjectAccessGuard)
export class BatchController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ProjectAccess('direct')
  async findAll(@Query('projectId') projectId?: string) {
    return this.executionsService.findAllBatches(projectId);
  }

  @Post()
  @ProjectAccess('direct')
  async create(@Body() dto: CreateBatchExecutionDto) {
    return this.executionsService.createBatch(dto);
  }

  @Get(':id')
  @ProjectAccess('batch', 'id')
  async findOne(@Param('id') id: string) {
    return this.executionsService.findBatch(id);
  }

  @Delete(':id/test-cases/:tcId')
  @ProjectAccess('batch', 'id')
  async removeTestCase(
    @Param('id') id: string,
    @Param('tcId') tcId: string,
  ) {
    return this.executionsService.removeTestCaseFromBatch(id, tcId);
  }

  @Post(':id/executions')
  @ProjectAccess('batch', 'id')
  async createExecution(
    @Param('id') id: string,
    @Body() dto: CreateBatchExecutionItemDto,
  ) {
    return this.executionsService.createBatchExecution(id, dto);
  }

  @Delete(':id')
  @ProjectAccess('batch', 'id')
  async delete(@Param('id') id: string) {
    return this.executionsService.deleteBatch(id);
  }
}
