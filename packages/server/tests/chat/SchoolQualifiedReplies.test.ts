import { afterEach, beforeEach, expect, setSystemTime, test } from 'bun:test';
import { schoolFilteredReply, schoolFilteredReplyKind } from '../../src/modules/chat/replies/schoolFilteredReplies';
import { createJevFixture } from './jevFixture';

const corpus = await Bun.file('packages/server/tests/chat/fixtures/darija-tool-selection-20261008.json').json();
const cases = corpus.cases.filter((x: { id: string }) => [9,10,11,12,13,14,27,28,33,34,35,36,37,38,39,40,53,54,55,56,57,58,65,66,67,68,69,70,97,98,99,100].includes(Number(x.id.split('q').at(-1))));
const query = (id: number) => cases.find((x: { id: string }) => x.id.endsWith('q'+String(id).padStart(2,'0')))!.query as string;
const plan = (id: number) => {
  const result = schoolFilteredReply(query(id), 'ary', '2026-2027', 'admin', '2026-10-09');
  if (!result || 'text' in result) throw Error('Expected read plan'); return result;
};
test.each(cases)('closed reviewed request is recognized: $id', (item: { query: string }) => {
  expect(schoolFilteredReplyKind(item.query)).not.toBeNull();
  for (const altered of [item.query+' zid tilmid', item.query+' f chher 12', '"'+item.query+'"', item.query+' "f l9ism A"']) {
    expect(schoolFilteredReplyKind(altered)).toBeNull();
  }
});
test('month window includes past and future exams, excludes adjacent months and validates dates/identities', () => {
  const p = plan(33);
  expect(p.calls).toEqual([{ name: 'exams_get_all', input: { academicYear: '2026-2027' } }]);
  const rows = ['2026-09-30','2026-10-01','2026-10-08','2026-10-31','2026-11-01'].map((date,i) => ({ id: String(i), date }));
  expect(p.render([rows])).toContain('كاينين 3 فروض');
  expect(p.render([[]])).toContain('0 فروض');
  expect(() => p.render([[{ id: 'a', date: '2026-02-30' }]])).toThrow();
  expect(() => p.render([[rows[0],rows[0]]])).toThrow();
  expect(schoolFilteredReply(query(33), 'ary', '2026-2027', 'admin')).toBeNull();
});
test('separate counts bind each validated result to its entity without adding a total', () => {
  for(const id of [11,12]){
    const p=plan(id);
    expect(p.calls).toEqual([{name:'students_get_student_count',input:{academicYear:'2026-2027'}},
      {name:'teachers_get_teacher_count',input:{academicYear:'2026-2027'}}]);
    expect(p.render([{count:9},{count:0}])).toContain('عدد التلاميذ هو 9، وعدد الأساتذة هو 0');
    expect(p.render([{count:0},{count:3}])).toContain('عدد التلاميذ هو 0، وعدد الأساتذة هو 3');
    expect(p.render([{count:9},{count:3}])).not.toContain('12');
    for(const bad of [NaN,Infinity,-1,1.5,'3'])for(const results of [[{count:bad},{count:3}],[{count:9},{count:bad}]])expect(()=>p.render(results)).toThrow();
    for(const results of [[],[{count:9}],[{count:9},{count:3},{count:2}]])expect(()=>p.render(results)).toThrow();
    expect(schoolFilteredReply(query(id),'ary',undefined,'admin')).toBeNull();
    expect(schoolFilteredReplyKind(query(id)+'<|channel|>commentary')).toBeNull();
  }
});
test('unresolved references ask for a name or topic without inventing one or reading data', () => {
  for(const id of [39,40])for(const role of ['admin','parent','teacher','student']){
    const p=schoolFilteredReply(query(id),'ary',undefined,role);
    if(!p||!('text' in p))throw Error('Expected clarification');
    expect(p.text).toBe('شكون ولا شنو كتقصد بهادوك؟ وضح ليا السمية ولا الموضوع باش نجاوبك على الطلب الصحيح.');
  }
});
test('class-size filter uses strictly greater than 30 and unique student identities per class', () => {
  const p = plan(37), classes = [{ id: 'a', name: 'Class Above' }, { id: 'b', name: 'Class Thirty' }];
  const students = [...Array.from({length:31},(_,i)=>({id:'a'+i,classId:'a'})),...Array.from({length:30},(_,i)=>({id:'b'+i,classId:'b'}))];
  const text = p.render([classes,[...students,students[0]]]);
  expect(text).toContain('Class Above: 31'); expect(text).not.toContain('Class Thirty');
  expect(p.render([classes,[...students,{id:'unplaced',classId:null}]])).toContain('ما نقدرش نأكد');
  expect(() => p.render([classes,[students[0],{...students[0],classId:'b'}]])).toThrow();
  expect(p.render([classes,[]])).toContain('ما لقيت حتى قسم فوق 30');
});
test('sixth-primary count resolves one explicit primary class and counts unique scoped students only', () => {
  const p=plan(28), classes=[{id:'sixth',name:'السادس ابتدائي',level:'6'},{id:'other',name:'Secondary',level:'6'}];
  expect(p.calls).toEqual([{name:'classes_get_classes',input:{academicYear:'2026-2027'}},{name:'students_get_students',input:{academicYear:'2026-2027'}}]);
  const students=[{id:'s1',classId:'sixth'},{id:'s2',classId:'sixth'},{id:'s1',classId:'sixth'},{id:'s3',classId:'other'}];
  expect(p.render([classes,students])).toContain('كاينين 2 تلميذ فالسادس ابتدائي');
  expect(p.render([classes,[]])).toContain('كاينين 0 تلميذ');
  expect(p.render([classes,[...students,{id:'missing',classId:null}]])).toContain('ما نقدرش نأكد العدد النهائي');
  expect(p.render([[classes[1]],students])).toContain('عطيني السمية أو الكود');
  expect(p.render([[...classes,{id:'second-primary',name:'Another',level:'6 AEP'}],students])).toContain('عطيني السمية أو الكود');
  expect(p.render([[],[]])).toContain('عطيني السمية أو الكود');
  expect(()=>p.render([classes,[...students,{id:'s1',classId:'other'}]])).toThrow();
  expect(()=>p.render([classes,[{id:'s1',classId:27}]])).toThrow();
  expect(schoolFilteredReplyKind(query(28)+'<|channel|>commentary')).toBeNull();
});
test('count-only teacher requests use the teacher count and render its validated number', () => {
  for(const id of [55,56,57,58]){
    const p=plan(id);expect(p.calls).toEqual([{name:'teachers_get_teacher_count',input:{academicYear:'2026-2027'}}]);
    expect(p.render([{count:0}])).toContain('كاينين 0 أستاذ');
    for(const count of [NaN,Infinity,-1,1.5,'8'])expect(()=>p.render([{count}])).toThrow();
  }
});
test('previous-month absences use the calendar month, student scope and absent status without counting unique people', () => {
  const p=plan(35), row={id:'a',type:'student',status:'absent',date:'2026-09-01',student:{name:'Salma'}};
  expect(p.calls).toEqual([{name:'attendance_get_all',input:{academicYear:'2026-2027',type:'student'}}]);
  const text=p.render([[row,{...row,id:'b',date:'2026-09-30'},{...row,id:'c',date:'2026-08-31'},
    {...row,id:'d',date:'2026-10-01'},{...row,id:'e',status:'present',student:{name:'Present'}}]]);
  expect(text).toContain('2 تسجيل');expect(text.match(/Salma/gu)).toHaveLength(2);expect(text).not.toContain('Present');
  expect(()=>p.render([[{...row,type:'staff'}]])).toThrow();expect(()=>p.render([[{...row,date:'2026-09-31'}]])).toThrow();
  expect(()=>p.render([[{...row,status:'unknown'}]])).toThrow();
  const january=schoolFilteredReply(query(35),'ary','2026-2027','admin','2027-01-02');
  if(!january||'text' in january)throw Error('Missing plan');
  expect(january.render([[{...row,date:'2026-12-31'}]])).toContain('2026-12');
  expect(schoolFilteredReply(query(35),'ary','2026-2027','admin')).toBeNull();
});
const classes = [{ id: 'fourth', name: 'الرابع', level: '4' }, { id: 'fifth', name: 'الخامس', level: '5' }];
const subjects = [{ id: 'math', name: 'Mathématiques', code: 'MATH' }, { id: 'physics', name: 'Physique' }];
const grade = { id: 'g', class: { id: 'fourth' }, subject: { id: 'math' }, student: { name: 'Salma' }, marksObtained: '16.00',
  assessment: { id: 'a', title: 'Assessment', date: '2026-10-01', totalMarks: '20.00' }, exam: null };
test('maths grades resolve unique class/subject IDs and never confuse missing, ambiguous or unrelated records', () => {
  const p = plan(97);
  const text = p.render([classes,subjects,[grade,{ ...grade,id:'physics',subject:{id:'physics'},student:{name:'Wrong Subject'} },
    {...grade,id:'fifth',class:{id:'fifth'},student:{name:'Wrong Class'}}]]);
  expect(text).toContain('Salma'); expect(text).toContain('16/20');
  expect(text).not.toContain('Wrong Subject'); expect(text).not.toContain('Wrong Class');
  expect(p.render([[],subjects,[]])).toContain('عطيني السمية أو الكود');
  expect(p.render([[...classes,{id:'fourth-other-cycle',name:'Another',level:'4'}],subjects,[grade]])).toContain('عطيني السمية أو الكود');
  expect(p.render([classes,[...subjects,{id:'math-2',name:'رياضيات'}],[grade]])).toContain('عطيني السمية أو الكود');
  expect(p.render([classes,subjects,[]])).toContain('ما لقيت حتى نقطة مسجلة');
  expect(() => p.render([classes,subjects,[{...grade,marksObtained:'NaN'}]])).toThrow();
  expect(() => p.render([classes,subjects,[{...grade,marksObtained:21}]])).toThrow();
  expect(() => p.render([classes,subjects,[{...grade,assessment:null}]])).toThrow();
});
test('grades display the first 20 with an explicit remaining count', () => {
  const text = plan(97).render([classes,subjects,Array.from({length:21},(_,i)=>({...grade,id:'grade-'+i}))]);
  expect(text.match(/Salma/gu)).toHaveLength(20); expect(text).toContain('1 نقطة أخرى');
});

const keys = ['DB_URL','NODE_ENV','CHATBOT_JEV_MODE','APP_BUSINESS_DATE'];
const original = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
let fixture: Awaited<ReturnType<typeof createJevFixture>> | undefined;
beforeEach(() => {
  process.env.DB_URL='postgres://localhost/school_history_test'; process.env.NODE_ENV='test';
  process.env.APP_BUSINESS_DATE='2026-10-09';
  process.env.CHATBOT_JEV_MODE = 'off';
});
afterEach(async () => {
  await fixture?.server.stop(); fixture=undefined; setSystemTime(); process.env.CHATBOT_JEV_MODE = 'off';
  for(const key of keys)if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];
});
const messages = (text:string)=>[{role:'user',parts:[{type:'text',text}]}];
const answer = (stream:string)=>stream.split(/\r?\n/u).filter(x=>x.startsWith('data: {')).map(x=>JSON.parse(x.slice(6)))
  .filter(x=>x.type==='text-delta').map(x=>x.delta).join('');
test('all thirty-two requests use populated year/role-scoped HTTP/MCP replies with no AI', async () => {
  fixture=await createJevFixture({qualifiedData:true});
  for(const role of ['admin','principal'])for(const year of ['2025-2026','2026-2027'])for(const item of cases){
    const r=await fixture.call('/chat',{messages:messages(item.query)},role,year); expect(r.status).toBe(200);
    const text=answer(await r.text()),event=fixture.events.at(-1)!;
    expect(event.reply?.source).toBe('template'); expect(event.reply?.error).toBeUndefined();
    expect(event.tools.every(t=>t.outcome==='executed')).toBe(true);
    const kind=schoolFilteredReplyKind(item.query);
    if(kind==='separate-counts'){
      expect(text).toContain(`عدد التلاميذ هو ${year==='2026-2027'?9:7}، وعدد الأساتذة هو ${year==='2026-2027'?3:2}`);
      expect(event.tools.map(t=>t.name)).toEqual(['students_get_student_count','teachers_get_teacher_count']);
    }
    if(kind==='reference-clarification'){expect(event.tools).toEqual([]);expect(text).toContain('شكون ولا شنو كتقصد بهادوك');}
    if(kind==='teacher-count')expect(text).toContain(`كاينين ${year==='2026-2027'?3:2} أستاذ`);
    if(kind==='sixth-primary-count'){
      expect(text).toContain(`كاينين ${year==='2026-2027'?3:2} تلميذ فالسادس ابتدائي`);
      expect(event.tools.map(t=>t.name)).toEqual(['classes_get_classes','students_get_students']);
    }
    if(kind==='monthly-exams')expect(text).toContain(`كاينين ${year==='2026-2027'?3:0} فروض`);
    if(kind==='previous-month-absences'){expect(text).toContain(year==='2026-2027'?'1 تسجيل':'0 تسجيل');expect(text).not.toContain('Present Student');}
    if(kind==='large-classes')expect(text).toContain(year==='2026-2027'?'31':'ما لقيت حتى قسم فوق 30');
    if(kind==='all-classes')expect(text).toContain(`Fourth ${year}`);
    if(kind==='fourth-maths-grades'){expect(text).toContain(year==='2026-2027'?'16/20':'12/20');expect(text).not.toContain('Wrong Subject');}
    if(kind==='previous-year'){expect(event.tools).toEqual([]);expect(text).toContain('شحال ديال شنو');}
  }
  expect(fixture.counts()).toEqual({decisions:0,generations:0});
});
test('school month comes from the school zone at the UTC month boundary and business-date override', async () => {
  delete process.env.APP_BUSINESS_DATE; setSystemTime(new Date('2026-10-31T23:30:00Z'));
  fixture=await createJevFixture({qualifiedData:true,timeZone:'Africa/Casablanca'});
  const r=await fixture.call('/chat',{messages:messages(query(33))},'admin');
  const text=answer(await r.text()); expect(text).toContain('2026-11'); expect(text).toContain('1 فروض');
  process.env.APP_BUSINESS_DATE='2026-10-09';
  const override=await fixture.call('/chat',{messages:messages(query(33))},'admin');
  expect(answer(await override.text())).toContain('3 فروض');
});
test('restricted actors cannot turn these requests into school-wide reads', async () => {
  fixture=await createJevFixture({qualifiedData:true});
  for(const role of ['parent','student','teacher','accounting'])for(const item of cases){
    const r=await fixture.call('/chat',{messages:messages(item.query)},role);
    expect(r.status).toBe(200); await r.text(); expect(fixture.events.at(-1)?.tools).toEqual([]);
  }
  expect(fixture.counts()).toEqual({decisions:0,generations:0});
  for(const role of ['parent','student','teacher'])for(const name of ['grades_get_all','exams_get_all','classes_get_classes','attendance_get_all']){
    const r=await fixture.call('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{academicYear:'2026-2027'}}},role);
    const body=await r.json(); expect(Boolean(body.error||body.result?.isError)).toBe(true);
  }
});
