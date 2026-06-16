import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import {
  ExecutionsService,
  CreateBatchExecutionDto,
  CreateBatchExecutionItemDto,
} from './executions.service';

@Controller('batch')
export class BatchController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  async findAll() {
    return this.executionsService.findAllBatches();
  }

  @Post()
  async create(@Body() dto: CreateBatchExecutionDto) {
    return this.executionsService.createBatch(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.executionsService.findBatch(id);
  }

  @Delete(':id/test-cases/:tcId')
  async removeTestCase(
    @Param('id') id: string,
    @Param('tcId') tcId: string,
  ) {
    return this.executionsService.removeTestCaseFromBatch(id, tcId);
  }

  @Post(':id/executions')
  async createExecution(
    @Param('id') id: string,
    @Body() dto: CreateBatchExecutionItemDto,
  ) {
    return this.executionsService.createBatchExecution(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.executionsService.deleteBatch(id);
  }
}
