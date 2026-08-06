import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { FeeTypeService } from './FeeTypeService';
import { isFinancial } from '@server/auth';
import {
  createFeeTypeDto,
  feeTypeIdParam,
  updateFeeTypeDto,
  type CreateFeeTypeDto,
  type UpdateFeeTypeDto,
} from './FeeTypeDto';

@ToolGroup('fee-types')
@Controller('/fee-types')
export class FeeTypeController {
  constructor(
    private feeTypeService: FeeTypeService,
  ) { }

  @Get()
  @isFinancial()
  @McpTool('List all fee types')
  @ResMsg('feeTypes.success.retrieved')
  async getAll() {
    return this.feeTypeService.getAll();
  }

  @Get('/:id')
  @isFinancial()
  @Validate({ params: feeTypeIdParam })
  @McpTool('Get a fee type by ID')
  @ResMsg('feeTypes.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.feeTypeService.getById(id);
  }

  @Post()
  @isFinancial()
  @Validate(createFeeTypeDto)
  @McpTool('Create a new fee type')
  @ResMsg('feeTypes.success.created')
  async create(@Body() body: CreateFeeTypeDto) {
    return this.feeTypeService.create(body);
  }

  @Put('/:id')
  @isFinancial()
  @Validate({ params: feeTypeIdParam, body: updateFeeTypeDto })
  @McpTool('Update a fee type by ID')
  @ResMsg('feeTypes.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateFeeTypeDto) {
    return this.feeTypeService.update(id, body);
  }

  @Delete('/:id')
  @isFinancial()
  @Validate({ params: feeTypeIdParam })
  @McpTool('Delete a fee type by ID')
  @ResMsg('feeTypes.success.deleted')
  async delete(@Params('id') id: string) {
    return this.feeTypeService.delete(id);
  }
}
