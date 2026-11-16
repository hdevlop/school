import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { GradeService } from './GradeService';
import { classGradesSummary, gradesOverview, sourceGradesSummary } from './gradeChatSummary';
import { Grade, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './GradeGuards';
import { isAdmin, isAdministrator, CanSchoolWide } from '../../auth';
import {
  assessmentIdParam,
  createGradeDto,
  deleteBulkGradeDto,
  examIdParam,
  gradeIdParam,
  gradeSectionFilterDto,
  type GradeSectionFilterDto,
  seedGradesBulkDto,
  sectionIdParam,
  studentIdParam,
  subjectIdParam,
  teacherIdParam,
  type SeedGradeDto,
  updateGradeDto,
  type CreateGradeDto,
  type UpdateGradeDto,
  type DeleteBulkGradeDto,
  sectionGradesDto,
  type SectionGradesDto,
  type AssessmentIdDto,
  type ExamIdDto,
  type SubjectIdDto,
  type TeacherIdDto,
} from './GradeDto';

@ToolGroup('grades')
@Policy(Grade)
@Controller('/grades')
export class GradeController {
  constructor(private gradeService: GradeService) { }

  @Get()
  @CanList()
  @ResMsg('grades.success.retrieved')
  async listAll() {
    return this.gradeService.getAll();
  }

  // The MCP reads below return gradeChatSummary's summaries; the GET routes
  // keep every row for the dashboard.
  @Post('/mcp/all')
  @CanList()
  @McpTool({ description: "Summarize every recorded mark of the selected school year, across all classes, subjects and teachers: the count, the average, and figures per class and per subject. Only for the whole school's marks; when one student, class, subject, teacher, test or exam is named, a narrower grades read answers it. Toutes les notes de l'année, جميع النقط.", readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getAll() {
    return gradesOverview(await this.gradeService.getAll());
  }

  @Get('/assessment/:assessmentId')
  @CanList()
  @Validate({ params: assessmentIdParam })
  @ResMsg('grades.success.retrieved')
  async listByAssessment(@Params('assessmentId') assessmentId: string) {
    return this.gradeService.getByAssessment(assessmentId);
  }

  @Post('/mcp/assessment')
  @CanList()
  @Validate({ body: assessmentIdParam })
  @McpTool({ description: "Read the results of one class test, quiz or assignment by assessmentId: each student's mark on that test, the average and how many passed. A class test is a fard, contrôle or devoir surveillé; exam-session results are the exam read, and test dates are the exam calendar. Résultats d'un contrôle, نتائج الفرض.", readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getByAssessment(@Body() body: AssessmentIdDto) {
    return sourceGradesSummary(await this.gradeService.getByAssessment(body.assessmentId));
  }

  @Get('/exam/:examId')
  @CanList()
  @Validate({ params: examIdParam })
  @ResMsg('grades.success.retrieved')
  async listByExam(@Params('examId') examId: string) {
    return this.gradeService.getByExam(examId);
  }

  @Post('/mcp/exam')
  @CanList()
  @Validate({ body: examIdParam })
  @McpTool({ description: "Read the results of one exam by examId: each student's mark on that exam, the average and who passed. An exam is a scheduled exam session (imti7an, examen, midterm, final); class tests and quizzes are the assessment read, and exam dates are the exam calendar. Résultats d'un examen, نتائج الامتحان.", readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getByExam(@Body() body: ExamIdDto) {
    return sourceGradesSummary(await this.gradeService.getByExam(body.examId));
  }

  @Get('/student/:studentId')
  @CanList()
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Get all grades of one student by studentId. In the answer copy each subject.name verbatim and show marksObtained/assessment.totalMarks (or exam.totalMarks); never translate the subject label, even in Arabic. Notes d’un élève. نقاط ودرجات التلميذ.', readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.gradeService.getByStudent(studentId);
  }

  @Get('/student/:studentId/report')
  @CanList()
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Read one student\'s grade report or report card by studentId, including subject marks and assessment or exam results. Copy the returned subject names and marks/denominators verbatim. Mathématiques stays Mathématiques, never الرياضيات; do not translate or invent subject names. Use only returned summaries. Bulletin de notes, boletín de calificaciones, بيان النقط.', readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getStudentReport(@Params('studentId') studentId: string) {
    return this.gradeService.getStudentReport(studentId);
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: sectionIdParam, query: gradeSectionFilterDto })
  @ResMsg('grades.success.retrieved')
  async listBySection(@Params('sectionId') sectionId: string, @Query() filters: GradeSectionFilterDto = {}) {
    return this.gradeService.getAll({ sectionId, subjectId: filters.subjectId });
  }

  @Post('/mcp/section')
  @CanList()
  @Validate({ body: sectionGradesDto })
  @McpTool({ description: "Read the marks of one class section (for example 5AP B or 2AC 3) by sectionId, optionally only one subject with subjectId: each student's marks and average, the class average per subject, and its tests and exams. For section-and-subject grades supply both resolved IDs. Notes d'une classe, نقط القسم.", readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getBySection(@Body() body: SectionGradesDto) {
    return classGradesSummary(await this.gradeService.getAll({ sectionId: body.sectionId, subjectId: body.subjectId }));
  }

  @Get('/subject/:subjectId')
  @CanList()
  @Validate({ params: subjectIdParam })
  @ResMsg('grades.success.retrieved')
  async listBySubject(@Params('subjectId') subjectId: string) {
    return this.gradeService.getAll({ subjectId });
  }

  @Post('/mcp/subject')
  @CanList()
  @Validate({ body: subjectIdParam })
  @McpTool({ description: "Summarize every mark in one subject across the whole school by subjectId, for example all Mathématiques marks in every class: the average per class and the tests and exams. For one class in one subject, the section read with subjectId is narrower. Notes par matière, نقط المادة.", readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getBySubject(@Body() body: SubjectIdDto) {
    return gradesOverview(await this.gradeService.getAll({ subjectId: body.subjectId }));
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: teacherIdParam })
  @ResMsg('grades.success.retrieved')
  async listByTeacher(@Params('teacherId') teacherId: string) {
    return this.gradeService.getAll({ teacherId });
  }

  @Post('/mcp/teacher')
  @CanList()
  @Validate({ body: teacherIdParam })
  @McpTool({ description: 'Summarize the marks one teacher recorded on their own assessments and exams, by teacherId: the average per class and subject and their tests and exams. Notes saisies par un enseignant, النقط ديال الأستاذ.', readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getByTeacher(@Body() body: TeacherIdDto) {
    return gradesOverview(await this.gradeService.getAll({ teacherId: body.teacherId }));
  }

  // Grades without exactly one usable source date belong to no year. Declared
  // before '/:id' so the literal route wins over the dynamic one.
  @Get('/unassigned-sources')
  @isAdministrator()
  async listUnassignedSources() {
    return this.gradeService.listUnassignedSources();
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: gradeIdParam })
  @McpTool({ description: 'Get a grade by ID', readOnly: true })
  @ResMsg('grades.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.gradeService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createGradeDto)
  @McpTool({ description: 'Record a student\'s marksObtained score or note for an existing assessment or exam. Requires studentId and exactly one of assessmentId or examId; the source determines teacher and subject. Also called saisir une note, registrar una calificación, or إدخال نقطة.', confirm: { level: 'warning', message: 'confirm.grades.create' } })
  @ResMsg('grades.success.created')
  async create(@Body() body: CreateGradeDto, @User() user: { id: string; role?: string; teacherId?: string }) {
    return this.gradeService.create(body, user);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(seedGradesBulkDto)
  @McpTool({ description: 'Seed grades demo data', confirm: { level: 'danger', message: 'confirm.grades.seed' } })
  @ResMsg('grades.success.seeded')
  async seedDemoGrades(@Body() body: SeedGradeDto[]) {
    return this.gradeService.seedDemoGrades(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: gradeIdParam, body: updateGradeDto })
  @McpTool({ description: 'Update a grade by ID', confirm: { level: 'warning', message: 'confirm.grades.update' } })
  @ResMsg('grades.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateGradeDto, @User() user: { id: string; role?: string; teacherId?: string }) {
    return this.gradeService.update(id, body, user);
  }

  @Delete('/bulk')
  @CanSchoolWide('delete:grades')
  @Validate(deleteBulkGradeDto)
  @McpTool({ description: 'Delete multiple grades by IDs', confirm: { level: 'danger', message: 'confirm.grades.bulkDelete' } })
  @ResMsg('grades.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkGradeDto) {
    return this.gradeService.deleteBulk(body);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: gradeIdParam })
  @McpTool({ description: 'Delete a grade by ID', confirm: { level: 'danger', message: 'confirm.grades.delete' } })
  @ResMsg('grades.success.deleted')
  async deleteById(@Params('id') id: string) {
    return this.gradeService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool({ description: 'Delete all grades', confirm: { level: 'danger', message: 'confirm.grades.deleteAll' } })
  @ResMsg('grades.success.allDeleted')
  async deleteAll() {
    return this.gradeService.deleteAll();
  }
}
