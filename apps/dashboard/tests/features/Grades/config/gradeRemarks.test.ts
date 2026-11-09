import { expect, it } from 'bun:test';
import { gradeRemark } from '@/features/Grades/config/gradeRemarks';

it('gives the Moroccan remark of a mark read on /20, at each bound', () => {
  const remark = (marksObtained: number | string, totalMarks: number | string = 20) => gradeRemark({ marksObtained, totalMarks, status: 'graded' });
  expect([20, 18, 17.99, 16, 15.5, 14, 12, 11.75, 10, 9.99, 0].map(mark => remark(mark)))
    .toEqual(['excellent', 'excellent', 'veryGood', 'veryGood', 'good', 'good', 'fairlyGood', 'average', 'average', 'insufficient', 'insufficient']);
  // Primary marks are /10: 7.5/10 is 15/20. Stored marks come as text.
  expect(remark(7.5, 10)).toBe('good');
  expect(remark('19.00', '20.00')).toBe('excellent');
});

it('gives no remark without a mark to judge', () => {
  expect(gradeRemark({ marksObtained: 0, totalMarks: 20, status: 'missed' })).toBeNull();
  expect(gradeRemark({ marksObtained: null, totalMarks: 20, status: 'pending' })).toBeNull();
  expect(gradeRemark({ marksObtained: 12, totalMarks: 0, status: 'graded' })).toBeNull();
});
