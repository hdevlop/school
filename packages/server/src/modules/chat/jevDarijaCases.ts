import type { JevIntent } from './jevIntents';
/** Exact owner-reviewed wording; labels remain assistant-authored. */
export const jevDarijaCases: Array<{ id: string; query: string; language: 'ary' | 'ary-latn'; intent: JevIntent; familyId: string }> = [
    {
        "id":  "jev-operator-q01",
        "query":  "سلام عليكم، واش نقدر نسولك على شي حاجة؟",
        "language":  "ary",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f01"
    },
    {
        "id":  "jev-operator-q02",
        "query":  "salam 3likom, wach n9der nsowlek 3la chi 7aja?",
        "language":  "ary-latn",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f01"
    },
    {
        "id":  "jev-operator-q03",
        "query":  "الله يجازيك بخير، هادشي اللي كنت محتاج.",
        "language":  "ary",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f02"
    },
    {
        "id":  "jev-operator-q04",
        "query":  "lah yjazik bikhir, hadchi li kent me7taj.",
        "language":  "ary-latn",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f02"
    },
    {
        "id":  "jev-operator-q05",
        "query":  "وريني التواريخ ديال الفروض الجايين فالمدرسة كاملة.",
        "language":  "ary",
        "intent":  "upcoming_exams",
        "familyId":  "jev-operator-f03"
    },
    {
        "id":  "jev-operator-q06",
        "query":  "werini tawarikh dyal lforod jayin f lmdrasa kamla.",
        "language":  "ary-latn",
        "intent":  "upcoming_exams",
        "familyId":  "jev-operator-f03"
    },
    {
        "id":  "jev-operator-q07",
        "query":  "بغيت غير العدد ديال التلاميذ اللي عندنا كاملين، بلا لائحة ديال السميات.",
        "language":  "ary",
        "intent":  "student_count",
        "familyId":  "jev-operator-f04"
    },
    {
        "id":  "jev-operator-q08",
        "query":  "bghit ghir l3adad dyal tlamd li 3ndna kamlin, bla lista dyal smiyat.",
        "language":  "ary-latn",
        "intent":  "student_count",
        "familyId":  "jev-operator-f04"
    },
    {
        "id":  "jev-operator-q09",
        "query":  "شحال من أستاذ كيقري فالمدرسة ديالنا دابا؟",
        "language":  "ary",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f05"
    },
    {
        "id":  "jev-operator-q10",
        "query":  "ch7al mn ostad kay9erri f lmdrasa dyalna daba?",
        "language":  "ary-latn",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f05"
    },
    {
        "id":  "jev-operator-q11",
        "query":  "عطيني عدد التلاميذ بوحدو وعدد الأساتذة بوحدو، ديال المدرسة كاملة.",
        "language":  "ary",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f06"
    },
    {
        "id":  "jev-operator-q12",
        "query":  "3tini 3adad tlamd bo7do w 3adad lasatida bo7do, dyal lmdrasa kamla.",
        "language":  "ary-latn",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f06"
    },
    {
        "id":  "jev-operator-q13",
        "query":  "شنو هما الأقسام اللي عندنا فالمدرسة؟",
        "language":  "ary",
        "intent":  "class_list",
        "familyId":  "jev-operator-f07"
    },
    {
        "id":  "jev-operator-q14",
        "query":  "chno homa l2a9sam li 3ndna f lmdrasa?",
        "language":  "ary-latn",
        "intent":  "class_list",
        "familyId":  "jev-operator-f07"
    },
    {
        "id":  "jev-operator-q15",
        "query":  "وريني شكون اللي حاضر وشكون اللي غايب من التلاميذ اليوم فالمدرسة كاملة.",
        "language":  "ary",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f08"
    },
    {
        "id":  "jev-operator-q16",
        "query":  "werini chkoun li 7ader w chkoun li ghayeb mn tlamd lyoum f lmdrasa kamla.",
        "language":  "ary-latn",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f08"
    },
    {
        "id":  "jev-operator-q17",
        "query":  "زيد ليا تلميذ جديد فالقسم، من بعد نعطيك المعلومات ديالو.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f09"
    },
    {
        "id":  "jev-operator-q18",
        "query":  "zid liya tilmid jdid f l9ism, mn b3d n3tik lma3lomat dyalo.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f09"
    },
    {
        "id":  "jev-operator-q19",
        "query":  "بدل نمرة التيليفون ديال هاد ولي الأمر.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f10"
    },
    {
        "id":  "jev-operator-q20",
        "query":  "beddel nmra dyal tilifon dyal had wali l2amr.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f10"
    },
    {
        "id":  "jev-operator-q21",
        "query":  "حيد هاد الخلاص اللي تسجل بالغلط.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f11"
    },
    {
        "id":  "jev-operator-q22",
        "query":  "7iyed had lkhlas li tsejjel b lghalat.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f11"
    },
    {
        "id":  "jev-operator-q23",
        "query":  "سجل هاد التلميذ غايب اليوم.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f12"
    },
    {
        "id":  "jev-operator-q24",
        "query":  "sejjel had tilmid ghayeb lyoum.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f12"
    },
    {
        "id":  "jev-operator-q25",
        "query":  "إلى بغيت نزيد تلميذ جديد بوحدي، شنو خاصني ندير؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f13"
    },
    {
        "id":  "jev-operator-q26",
        "query":  "ila bghit nzid tilmid jdid b wa7di, chno khasni ndir?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f13"
    },
    {
        "id":  "jev-operator-q27",
        "query":  "شحال من تلميذ كاين غير فالسادس ابتدائي؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f14"
    },
    {
        "id":  "jev-operator-q28",
        "query":  "ch7al mn tilmid kayn ghir f ssadis ibtida2i?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f14"
    },
    {
        "id":  "jev-operator-q29",
        "query":  "جمع ليا عدد التلاميذ مع عدد الأساتذة وعطيني المجموع.",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f15"
    },
    {
        "id":  "jev-operator-q30",
        "query":  "jme3 liya 3adad tlamd m3a 3adad lasatida w 3tini lmajmou3.",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f15"
    },
    {
        "id":  "jev-operator-q31",
        "query":  "عطيني السميات ديال الأساتذة اللي كيقريو الرياضيات.",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f16"
    },
    {
        "id":  "jev-operator-q32",
        "query":  "3tini smiyat dyal lasatida li kay9erriw riyadiyat.",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f16"
    },
    {
        "id":  "jev-operator-q33",
        "query":  "شحال من فرض عند التلاميذ هاد الشهر؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f17"
    },
    {
        "id":  "jev-operator-q34",
        "query":  "ch7al mn fard 3nd tlamd had chher?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f17"
    },
    {
        "id":  "jev-operator-q35",
        "query":  "وريني الغياب ديال التلاميذ فالشهر اللي فات.",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f18"
    },
    {
        "id":  "jev-operator-q36",
        "query":  "werini lghiyab dyal tlamd f chher li fat.",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f18"
    },
    {
        "id":  "jev-operator-q37",
        "query":  "شنو هما الأقسام اللي فيهم كثر من تلاتين تلميذ؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f19"
    },
    {
        "id":  "jev-operator-q38",
        "query":  "chno homa l2a9sam li fihom kter mn tlatin tilmid?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f19"
    },
    {
        "id":  "jev-operator-q39",
        "query":  "وبالنسبة لهادوك، شنو بان ليك؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f20"
    },
    {
        "id":  "jev-operator-q40",
        "query":  "w b nnisba lhadok, chno ban lik?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f20"
    },
    {
        "id":  "jev-operator-q41",
        "query":  "صباح الخير، شنو تقدر تعاوني فيه؟",
        "language":  "ary",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f21"
    },
    {
        "id":  "jev-operator-q42",
        "query":  "sba7 lkhir, chno t9der t3awenni fih?",
        "language":  "ary-latn",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f21"
    },
    {
        "id":  "jev-operator-q43",
        "query":  "بسلامة، نتلاقاو غدا إن شاء الله.",
        "language":  "ary",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f22"
    },
    {
        "id":  "jev-operator-q44",
        "query":  "bslama, ntla9aw ghedda nchallah.",
        "language":  "ary-latn",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f22"
    },
    {
        "id":  "jev-operator-q45",
        "query":  "مزيان بزاف، شكرا على المساعدة.",
        "language":  "ary",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f23"
    },
    {
        "id":  "jev-operator-q46",
        "query":  "mzyan bzaf, chokran 3la lmousa3ada.",
        "language":  "ary-latn",
        "intent":  "small_talk",
        "familyId":  "jev-operator-f23"
    },
    {
        "id":  "jev-operator-q47",
        "query":  "شحال من تلميذ مسجل عندنا هاد العام؟",
        "language":  "ary",
        "intent":  "student_count",
        "familyId":  "jev-operator-f24"
    },
    {
        "id":  "jev-operator-q48",
        "query":  "ch7al mn tilmid msejjel 3ndna had l3am?",
        "language":  "ary-latn",
        "intent":  "student_count",
        "familyId":  "jev-operator-f24"
    },
    {
        "id":  "jev-operator-q49",
        "query":  "قولي غير شحال من تلميذ كاين فالمدرسة كاملة.",
        "language":  "ary",
        "intent":  "student_count",
        "familyId":  "jev-operator-f25"
    },
    {
        "id":  "jev-operator-q50",
        "query":  "gouli ghir ch7al mn tilmid kayn f lmdrasa kamla.",
        "language":  "ary-latn",
        "intent":  "student_count",
        "familyId":  "jev-operator-f25"
    },
    {
        "id":  "jev-operator-q51",
        "query":  "عافاك، بغيت نعرف شحال فينا ديال التلاميذ.",
        "language":  "ary",
        "intent":  "student_count",
        "familyId":  "jev-operator-f26"
    },
    {
        "id":  "jev-operator-q52",
        "query":  "3afak, bghit n3ref ch7al fina dyal tlamd.",
        "language":  "ary-latn",
        "intent":  "student_count",
        "familyId":  "jev-operator-f26"
    },
    {
        "id":  "jev-operator-q53",
        "query":  "شحال عندنا ديال الأساتذة فالمدرسة؟",
        "language":  "ary",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f27"
    },
    {
        "id":  "jev-operator-q54",
        "query":  "ch7al 3ndna dyal lasatida f lmdrasa?",
        "language":  "ary-latn",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f27"
    },
    {
        "id":  "jev-operator-q55",
        "query":  "عطيني غير العدد ديال الأساتذة، ماشي السميات ديالهم.",
        "language":  "ary",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f28"
    },
    {
        "id":  "jev-operator-q56",
        "query":  "3tini ghir l3adad dyal lasatida, machi smiyat dyalhom.",
        "language":  "ary-latn",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f28"
    },
    {
        "id":  "jev-operator-q57",
        "query":  "الأساتذة ديالنا شحال هوما كاملين؟",
        "language":  "ary",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f29"
    },
    {
        "id":  "jev-operator-q58",
        "query":  "lasatida dyalna ch7al homa kamlin?",
        "language":  "ary-latn",
        "intent":  "teacher_count",
        "familyId":  "jev-operator-f29"
    },
    {
        "id":  "jev-operator-q59",
        "query":  "شحال من تلميذ وشحال من أستاذ كاينين عندنا؟",
        "language":  "ary",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f30"
    },
    {
        "id":  "jev-operator-q60",
        "query":  "ch7al mn tilmid w ch7al mn ostad kaynin 3ndna?",
        "language":  "ary-latn",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f30"
    },
    {
        "id":  "jev-operator-q61",
        "query":  "بغيت العدد ديال التلاميذ والعدد ديال الأساتذة بجوج.",
        "language":  "ary",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f31"
    },
    {
        "id":  "jev-operator-q62",
        "query":  "bghit l3adad dyal tlamd w l3adad dyal lasatida bjouj.",
        "language":  "ary-latn",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f31"
    },
    {
        "id":  "jev-operator-q63",
        "query":  "عطيني الأرقام ديال المدرسة: التلاميذ شحال والأساتذة شحال.",
        "language":  "ary",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f32"
    },
    {
        "id":  "jev-operator-q64",
        "query":  "3tini l2ar9am dyal lmdrasa: tlamd ch7al w lasatida ch7al.",
        "language":  "ary-latn",
        "intent":  "student_and_teacher_count",
        "familyId":  "jev-operator-f32"
    },
    {
        "id":  "jev-operator-q65",
        "query":  "عطيني لائحة ديال الأقسام كاملين.",
        "language":  "ary",
        "intent":  "class_list",
        "familyId":  "jev-operator-f33"
    },
    {
        "id":  "jev-operator-q66",
        "query":  "3tini lista dyal l2a9sam kamlin.",
        "language":  "ary-latn",
        "intent":  "class_list",
        "familyId":  "jev-operator-f33"
    },
    {
        "id":  "jev-operator-q67",
        "query":  "شمن أقسام كاينين فالمدرسة؟",
        "language":  "ary",
        "intent":  "class_list",
        "familyId":  "jev-operator-f34"
    },
    {
        "id":  "jev-operator-q68",
        "query":  "chmen a9sam kaynin f lmdrasa?",
        "language":  "ary-latn",
        "intent":  "class_list",
        "familyId":  "jev-operator-f34"
    },
    {
        "id":  "jev-operator-q69",
        "query":  "وريني الأقسام ديال المدرسة.",
        "language":  "ary",
        "intent":  "class_list",
        "familyId":  "jev-operator-f35"
    },
    {
        "id":  "jev-operator-q70",
        "query":  "werini l2a9sam dyal lmdrasa.",
        "language":  "ary-latn",
        "intent":  "class_list",
        "familyId":  "jev-operator-f35"
    },
    {
        "id":  "jev-operator-q71",
        "query":  "شكون غايب اليوم من التلاميذ؟",
        "language":  "ary",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f36"
    },
    {
        "id":  "jev-operator-q72",
        "query":  "chkoun ghayeb lyoum mn tlamd?",
        "language":  "ary-latn",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f36"
    },
    {
        "id":  "jev-operator-q73",
        "query":  "بغيت نشوف الحضور ديال التلاميذ اليوم فالمدرسة.",
        "language":  "ary",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f37"
    },
    {
        "id":  "jev-operator-q74",
        "query":  "bghit nchof l7oudour dyal tlamd lyoum f lmdrasa.",
        "language":  "ary-latn",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f37"
    },
    {
        "id":  "jev-operator-q75",
        "query":  "كيفاش داير الحضور اليوم فالمدرسة؟",
        "language":  "ary",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f38"
    },
    {
        "id":  "jev-operator-q76",
        "query":  "kifach dayer l7oudour lyoum f lmdrasa?",
        "language":  "ary-latn",
        "intent":  "attendance_today",
        "familyId":  "jev-operator-f38"
    },
    {
        "id":  "jev-operator-q77",
        "query":  "إمتى الفرض الجاي؟",
        "language":  "ary",
        "intent":  "upcoming_exams",
        "familyId":  "jev-operator-f39"
    },
    {
        "id":  "jev-operator-q78",
        "query":  "imta lfard jay?",
        "language":  "ary-latn",
        "intent":  "upcoming_exams",
        "familyId":  "jev-operator-f39"
    },
    {
        "id":  "jev-operator-q79",
        "query":  "واش كاينين شي فروض هاد الأيام الجاية؟",
        "language":  "ary",
        "intent":  "upcoming_exams",
        "familyId":  "jev-operator-f40"
    },
    {
        "id":  "jev-operator-q80",
        "query":  "wach kaynin chi forod had liyam jaya?",
        "language":  "ary-latn",
        "intent":  "upcoming_exams",
        "familyId":  "jev-operator-f40"
    },
    {
        "id":  "jev-operator-q81",
        "query":  "سجل هاد التلميذة حاضرة اليوم.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f41"
    },
    {
        "id":  "jev-operator-q82",
        "query":  "sejjel had tilmida 7adra lyoum.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f41"
    },
    {
        "id":  "jev-operator-q83",
        "query":  "صيفط إعلان للواليدين بلي غدا عطلة.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f42"
    },
    {
        "id":  "jev-operator-q84",
        "query":  "sifet i3lan lwalidin bli ghedda 3otla.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f42"
    },
    {
        "id":  "jev-operator-q85",
        "query":  "زيد أستاذ جديد ديال الفرنسية.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f43"
    },
    {
        "id":  "jev-operator-q86",
        "query":  "zid ostad jdid dyal lfrancais.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f43"
    },
    {
        "id":  "jev-operator-q87",
        "query":  "مسح هاد الفرض من الجدول.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f44"
    },
    {
        "id":  "jev-operator-q88",
        "query":  "mse7 had lfard mn ljadwal.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f44"
    },
    {
        "id":  "jev-operator-q89",
        "query":  "بدل القسم ديال هاد التلميذ للخامس.",
        "language":  "ary",
        "intent":  "write_request",
        "familyId":  "jev-operator-f45"
    },
    {
        "id":  "jev-operator-q90",
        "query":  "beddel l9ism dyal had tilmid l lkhamis.",
        "language":  "ary-latn",
        "intent":  "write_request",
        "familyId":  "jev-operator-f45"
    },
    {
        "id":  "jev-operator-q91",
        "query":  "شحال من بنت كاينة فالمدرسة؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f46"
    },
    {
        "id":  "jev-operator-q92",
        "query":  "ch7al mn bent kayna f lmdrasa?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f46"
    },
    {
        "id":  "jev-operator-q93",
        "query":  "شحال خلص هاد الولي هاد الشهر؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f47"
    },
    {
        "id":  "jev-operator-q94",
        "query":  "ch7al khelles had lwali had chher?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f47"
    },
    {
        "id":  "jev-operator-q95",
        "query":  "كيفاش نبدل كلمة السر ديالي؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f48"
    },
    {
        "id":  "jev-operator-q96",
        "query":  "kifach nbeddel lmot de passe dyali?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f48"
    },
    {
        "id":  "jev-operator-q97",
        "query":  "شنو هوما النقط ديال القسم الرابع فالرياضيات؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f49"
    },
    {
        "id":  "jev-operator-q98",
        "query":  "chno homa nno9at dyal l9ism rrabi3 f riyadiyat?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f49"
    },
    {
        "id":  "jev-operator-q99",
        "query":  "وشحال كانو العام اللي فات؟",
        "language":  "ary",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f50"
    },
    {
        "id":  "jev-operator-q100",
        "query":  "w ch7al kano l3am li fat?",
        "language":  "ary-latn",
        "intent":  "needs_llm",
        "familyId":  "jev-operator-f50"
    }
];
