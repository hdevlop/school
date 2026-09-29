import { describe, expect, it } from 'bun:test';
import { updateAlertDto } from '../../src/modules/alerts/AlertDto';
import { updateAssessmentDto } from '../../src/modules/assessments/AssessmentDto';
import { updateRoutinePeriodDto, updateRoutineScheduleDto } from '../../src/modules/classRoutines/ClassRoutineDto';
import { updateEventDto } from '../../src/modules/events/EventDto';
import { updateExamDto } from '../../src/modules/exams/ExamDto';
import { updateParentDto } from '../../src/modules/parents/ParentDto';
import { updateSectionDto } from '../../src/modules/sections/SectionDto';
import { updateStudentDto } from '../../src/modules/students/StudentDto';
import { updateTeacherDto } from '../../src/modules/teachers/TeacherDto';
import { updateVehicleDto } from '../../src/modules/transport/vehicles/VehicleDto';

describe('partial update DTOs', () => {
  const cases = [
    ['alert', updateAlertDto, { title: 'Changed alert' }],
    ['assessment', updateAssessmentDto, { title: 'Changed assessment' }],
    ['routine period', updateRoutinePeriodDto, { name: 'Lunch' }],
    ['routine schedule', updateRoutineScheduleDto, { name: 'Changed timetable' }],
    ['event', updateEventDto, { title: 'Changed event' }],
    ['exam', updateExamDto, { title: 'Changed exam' }],
    ['parent', updateParentDto, { name: 'Changed Parent' }],
    ['section', updateSectionDto, { name: 'B' }],
    ['student', updateStudentDto, { name: 'Changed Student' }],
    ['teacher', updateTeacherDto, { name: 'Changed Teacher' }],
    ['vehicle', updateVehicleDto, { name: 'Changed bus' }],
  ] as const;

  for (const [name, schema, patch] of cases) {
    it(`${name} changes only fields the request names`, () => {
      expect(schema.parse(patch)).toEqual(patch);
    });
  }
});
