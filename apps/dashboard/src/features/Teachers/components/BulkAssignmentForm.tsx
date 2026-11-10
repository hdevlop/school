'use client'

import { useEffect, useRef, useMemo } from 'react'
import { BookOpen, User, GraduationCap, Layers } from 'lucide-react'
import { DynamicArray, NForm, usePrefix } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react'
import { useFormContext, useWatch } from 'react-hook-form'
import { createTeacherSchemas } from '../config/teacherSchemas'
import { subjectsForTeacherClass } from '../config/teacherAssignments'

// ==================== COMPONENTS ====================

const AssignmentItem = ({ classes, subjects }) => {
   const { t } = useTranslation()
   const { getValues, setValue } = useFormContext()
   const prefix = usePrefix()
   const prevClassIdRef = useRef(null)

   const selectedClassId = useWatch({ name: `${prefix}.classId` })
   const selectedSubjectIds = useWatch({ name: `${prefix}.subjectIds` }) ?? []

   const classOptions = classes.map(cls => ({
      value: cls.id,
      label: cls.name
   }))

   const selectedClass = classes.find(cls => cls.id === selectedClassId)
   const availableSubjectIds = new Set(subjectsForTeacherClass(subjects, selectedClass?.level).map(subject => subject.id))
   // Previously saved assignments stay readable until the administrator changes
   // them. Removing an old selection keeps it out of the new subject choices.
   const subjectOptions = subjects.filter(subject => availableSubjectIds.has(subject.id) || selectedSubjectIds.includes(subject.id)).map(sbj => ({
      value: sbj.id,
      label: sbj.name
   }))

   const sectionOptions = selectedClass?.sections?.map(section => ({
      value: section.id,
      label: section.name
   })) ?? []

   useEffect(() => {
      if (prevClassIdRef.current !== null && prevClassIdRef.current !== selectedClassId) {
         setValue(`${prefix}.sectionIds`, [])
         const allowed = new Set(subjectsForTeacherClass(subjects, selectedClass?.level).map(subject => subject.id))
         const unavailable = new Set(subjects.filter(subject => !allowed.has(subject.id)).map(subject => subject.id))
         const currentSubjects: string[] = getValues(`${prefix}.subjectIds`) ?? []
         if (currentSubjects.some(id => unavailable.has(id))) {
            setValue(`${prefix}.subjectIds`, currentSubjects.filter(id => !unavailable.has(id)))
         }
      }
      prevClassIdRef.current = selectedClassId
   }, [selectedClassId, selectedClass?.level, subjects, prefix, getValues, setValue])

   return (
      <div className='space-y-3'>
         <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <FormInput
               name='classId'
               type='select'
               formLabel={t('teachers.form.class')}
               items={classOptions}
               placeholder={t('teachers.form.classPlaceholder')}
               icon={GraduationCap}
               required={true}
            />

            <FormInput
               name='sectionIds'
               type='multiselect'
               formLabel={t('teachers.form.sections')}
               items={sectionOptions}
               placeholder={t('teachers.form.sectionsPlaceholder')}
               icon={Layers}
               disabled={!selectedClassId}
               required={true}
            />
         </div>

         <FormInput
            name='subjectIds'
            type='multiselect'
            formLabel={t('teachers.form.subjects')}
            items={subjectOptions}
            placeholder={t('teachers.form.subjectsPlaceholder')}
            icon={BookOpen}
            disabled={!selectedClassId}
            required={true}
         />
      </div>
   )
}

export const AssignmentFormContent = ({ classes, subjects }) => {
   const { t } = useTranslation()

   const handleAddAssignment = (append) => {
      append({
         classId: '',
         sectionIds: [],
         subjectIds: [],
      })
   }

   return (
      <>
         <FormSectionHeader
            icon={BookOpen}
            title={t('teachers.form.assignmentInformation')}
         />

         <DynamicArray
            name="assignments"
            title={t('teachers.form.assignment')}
            addLabel={t('teachers.form.addAssignment')}
            emptyLabel={t('teachers.form.noAssignmentsAdded')}
            onAdd={handleAddAssignment}
         >
            <AssignmentItem classes={classes} subjects={subjects} />
         </DynamicArray>
      </>
   )
}

// ==================== MAIN FORM ====================

const BulkAssignmentForm = ({  classes = [], subjects = [], teachers = [] }) => {
   const { pop } = useDialog()
   const { t } = useTranslation()
   const assignmentsSchema = useMemo(() => createTeacherSchemas(t).assignments, [t]);

   const defaultValues = {
      teacherId: null,
      assignments: []
   }

   const handleSubmit = async (assignmentData) => {
      pop(assignmentData)
   }

   const teacherOptions = teachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} - ${teacher.cin}`
   }))

   return (
      <NForm
         id='assignment-form'
         schema={assignmentsSchema}
         defaultValues={defaultValues}
         onSubmit={handleSubmit}
      >
         <FormInput
            name='teacherId'
            type='combobox'
            formLabel={t('teachers.form.teacher')}
            placeholder={t('teachers.form.teacherPlaceholder')}
            searchPlaceholder={t('teachers.form.searchTeacher') || 'Search teacher...'}
            emptyMessage={t('teachers.form.noTeacherFound') || 'No teacher found.'}
            items={teacherOptions}
            icon={User}
            required={true}
         />

         <AssignmentFormContent
            classes={classes}
            subjects={subjects}
         />
      </NForm>
   )
}

export default BulkAssignmentForm
