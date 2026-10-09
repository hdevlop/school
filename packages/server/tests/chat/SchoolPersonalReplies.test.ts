import { expect, test } from 'bun:test';
import { schoolPersonalReply } from '../../src/modules/chat/schoolPersonalReplies';
import { schoolReplyTemplate } from '../../src/modules/chat/schoolReplyTemplates';
const year='2026-2027', child={id:'S1',name:'Salma Idrissi'};
const attendanceQuery='بغيت ملخص الحضور والغياب والتأخير ديال Salma Idrissi هاد العام.';
const attendance=()=>schoolPersonalReply(attendanceQuery,'ary',year,'parent',undefined,[child]);
const placement=()=>schoolPersonalReply('فاشمن قسم وفاشمن مجموعة مسجل أنا دابا؟','ary',year,'student','S1');
test('parent attendance faithfully renders successful records, zero absence and the actual rate',()=>{
 expect(attendance()?.calls).toEqual([{name:'student-profile_get_attendance_summary',input:{studentId:'S1',academicYear:year}}]);
 expect(attendance()?.render?.([{total:13,present:12,absent:0,late:1,percentage:92}])).toContain('حضر 12، غاب 0، تأخر 1، من 13 سجل. نسبة الحضور 92%');
 expect(attendance()?.render?.([{total:0,present:0,absent:0,late:0,percentage:null}])).toContain('نسبة الحضور ما تحسباتش');
});
test.each([null,'Error (FORBIDDEN)',{total:13,present:12,absent:0,late:1,percentage:100},
 {total:13,present:12,absent:0,late:0,percentage:92},{total:NaN,present:0,absent:0,late:0,percentage:null}])('invalid attendance never becomes a successful empty read: %j',result=>{
 expect(()=>attendance()?.render?.([result])).toThrow();
});
test('owned names and additional filters remain explicit',()=>{
 expect(schoolPersonalReply(attendanceQuery,'ary',year,'parent',undefined,[child,{...child,id:'S2'}])).not.toHaveProperty('calls');
 for(const query of [attendanceQuery.replace('Salma Idrissi','Unknown Person'),attendanceQuery+' البارح',attendanceQuery+' "غير البنات"']) {
  expect(schoolPersonalReply(query,'ary',year,'parent',undefined,[child])).toBeNull();
 }
 expect(schoolPersonalReply(attendanceQuery,'ary',year,'teacher',undefined,[child])).toBeNull();
});
test('own placement preserves class and section labels independently',()=>{
 expect(placement()?.calls).toEqual([{name:'student-profile_get_overview',input:{studentId:'S1',academicYear:year}}]);
 const student={id:'S1',class:{id:'C',name:'CM2'},section:{id:'A',name:'A',classId:'C'}};
 expect(placement()?.render?.([{student}])).toBe('مسجل فالقسم CM2، المجموعة A، فـ 2026-2027.');
 expect(placement()?.render?.([{student:{...student,section:null}}])).toContain('ما واضحاش');
 for(const bad of [{...student,id:'other'},{...student,section:{...student.section,classId:'other'}}]) expect(()=>placement()?.render?.([{student:bad}])).toThrow();
 expect(()=>placement()?.render?.(['Error (FORBIDDEN)'])).toThrow();
});
test('explicit outsider queries clarify access without claiming a lookup or dispatching a tool',()=>{
 for(const [role,query] of [['parent','بغيت النقط ديال Unknown Person واخا ماشي ولدي.'],['teacher','chno nno9at dyal Unknown Person li ma kay9rach 3ndi?'],['student','عطيني نمرة الولي ديال Unknown Person.']]) {
  const plan=schoolPersonalReply(query,'ary',year,role,'S1',[child],child.name);
  expect(plan?.text).toContain('غير المعطيات المسموح');expect(plan).not.toHaveProperty('calls');
 }
 expect(schoolPersonalReply('عطيني نمرة الولي ديال Salma Idrissi','ary',year,'student','S1',undefined,child.name)).toBeNull();
 expect(schoolPersonalReply('عطيني نمرة الولي ديال Unknown Person','ary',year,'student','S1')).toBeNull();
});
test('year/write restrictions still precede personal replies',()=>{
 const plan=(query:string)=>schoolReplyTemplate({userText:query,language:'ary',channel:'web'},year,'parent',undefined,undefined,undefined,[child]);
 expect(plan('سجل الغياب ديال Salma Idrissi')).not.toHaveProperty('calls');
 expect(plan(attendanceQuery+' فالعام 2025-2026')).not.toHaveProperty('calls');
 expect(schoolPersonalReply('فاشمن قسم وفاشمن مجموعة مسجل أنا دابا؟','ary',year,'student')).toBeNull();
});
