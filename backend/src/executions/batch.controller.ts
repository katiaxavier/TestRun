import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import {
  ExecutionsService,
  CreateBatchExecutionDto,
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

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.executionsService.deleteBatch(id);
  }
}
