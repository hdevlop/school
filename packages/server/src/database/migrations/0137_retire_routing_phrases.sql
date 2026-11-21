-- Routing phrases School no longer ships. najm-rag's seed only adds phrases a
-- database lacks, so a phrase removed from routing/semantics*.json stays stored
-- (and keeps pulling questions to its tool) until it is deleted here.
--
-- Class tests (fard, contrôle, devoir surveillé) are exams of type "test", not
-- assessments: their phrases moved to grades_get_by_exam and exams_get_today_exams,
-- and grades_get_by_exam gave up four final-exam phrases to stay at twelve.
-- academic-dashboard_get_kpis returns marks recorded, not marks still pending:
-- its four pending-marks phrases sent such questions to a read that cannot answer.
DELETE FROM "chatbot_tool_semantics" AS s
USING (VALUES
  ('grades_get_by_assessment', 'darija', 'بغيت النقط ديال الفرض الأول فالرياضيات ديال 5AP B'),
  ('grades_get_by_assessment', 'darija', 'وريني نتائج الفرض المحروس الثاني فالفرنسية'),
  ('grades_get_by_assessment', 'darija-latn', 'nno9at dyal lfard tani f l3arabiya dyal 6AP A'),
  ('grades_get_by_assessment', 'darija-fr', 'les notes dyal le contrôle numéro 2 en maths'),
  ('grades_get_by_assessment', 'fr', 'Les notes obtenues au devoir surveillé de français numéro 1'),
  ('grades_get_by_assessment', 'en', 'Show each student''s mark on the second French class test'),
  ('grades_get_by_exam', 'darija', 'وريني النقط اللي جابو التلاميذ فالامتحان الموحد ديال الفرنسية'),
  ('grades_get_by_exam', 'darija-latn', 'bghit nno9at dyal l imti7an nihai f sciences'),
  ('grades_get_by_exam', 'fr', 'Les notes des candidats à l''examen final de français'),
  ('grades_get_by_exam', 'en', 'Show the recorded results of the final maths exam'),
  ('academic-dashboard_get_kpis', 'darija', 'شحال من تقييم باقي بلا نقط على صعيد المدرسة؟'),
  ('academic-dashboard_get_kpis', 'darija-latn', 'bghit 3adad ta9yimat li ba9in bla nno9at f lmo2assasa kamla'),
  ('academic-dashboard_get_kpis', 'fr', 'La moyenne générale de l''établissement et le nombre de corrections en attente'),
  ('academic-dashboard_get_kpis', 'ar', 'ما متوسط الدرجات العام للمؤسسة وعدد التقييمات التي لم ترصد درجاتها؟'),
  ('assessments_get_today_assessments', 'darija', 'الفروض والكونطرولات ديال اليوم'),
  ('assessments_get_today_assessments', 'darija-latn', 'forod lyoum f l9ism'),
  ('assessments_get_today_assessments', 'fr', 'les contrôles et devoirs en classe d''aujourd''hui'),
  ('assessments_get_today_assessments', 'ar', 'فروض المراقبة المستمرة اليوم'),
  ('assessments_get_today_assessments', 'en', 'today''s quizzes and class tests')
) AS retired ("tool_name", "lang", "phrase")
WHERE s."tool_name" = retired."tool_name"
  AND s."lang" = retired."lang"
  AND s."phrase" = retired."phrase";
