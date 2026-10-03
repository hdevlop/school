import { Controller, Get, Query, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SearchService } from './SearchService';
import { Can } from '../../auth';
import { Student } from '../students/StudentGuards';
import { Teacher } from '../teachers/TeacherGuards';
import { Parent } from '../parents/ParentGuards';
import { Policy, CanList } from '../../auth';
import { z } from 'zod';

const searchQueryDto = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

@ToolGroup('search')
@Controller('/search')
@Policy(Student)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @Can('read:students')
  @Can('read:teachers')
  @Can('read:parents')
  @Validate({ query: searchQueryDto })
  @McpTool({ description: 'Search globally across students, teachers, and parents', readOnly: true })
  @ResMsg('search.success')
  async searchGlobal(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchGlobal(q, limit);
  }

  @Get('/students')
  @CanList(Student)
  @Validate({ query: searchQueryDto })
  @McpTool({ description: 'Search students by name, code, CIN, email, or phone', readOnly: true })
  @ResMsg('search.success')
  async searchStudents(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchStudents(q, limit);
  }

  @Get('/teachers')
  @CanList(Teacher)
  @Validate({ query: searchQueryDto })
  @McpTool({ description: 'Search teachers by name, CIN, email, phone, or specialization', readOnly: true })
  @ResMsg('search.success')
  async searchTeachers(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchTeachers(q, limit);
  }

  @Get('/parents')
  @CanList(Parent)
  @Validate({ query: searchQueryDto })
  @McpTool({ description: 'Search parents by name, CIN, email, or phone', readOnly: true })
  @ResMsg('search.success')
  async searchParents(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchParents(q, limit);
  }
}
