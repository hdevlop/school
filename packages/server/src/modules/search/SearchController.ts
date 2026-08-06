import { Controller, Get, Query, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SearchService } from './SearchService';
import { isAuth } from '@server/auth';
import { z } from 'zod';

const searchQueryDto = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

@ToolGroup('search')
@Controller('/search')
@isAuth()
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @Validate({ query: searchQueryDto })
  @McpTool('Search globally across students, teachers, and parents')
  @ResMsg('search.success')
  async searchGlobal(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchGlobal(q, limit);
  }

  @Get('/students')
  @Validate({ query: searchQueryDto })
  @McpTool('Search students by name, code, CIN, email, or phone')
  @ResMsg('search.success')
  async searchStudents(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchStudents(q, limit);
  }

  @Get('/teachers')
  @Validate({ query: searchQueryDto })
  @McpTool('Search teachers by name, CIN, email, phone, or specialization')
  @ResMsg('search.success')
  async searchTeachers(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchTeachers(q, limit);
  }

  @Get('/parents')
  @Validate({ query: searchQueryDto })
  @McpTool('Search parents by name, CIN, email, or phone')
  @ResMsg('search.success')
  async searchParents(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchParents(q, limit);
  }
}
