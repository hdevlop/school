'use client'

import { useEffect, useRef, useMemo } from 'react'
import { BookOpen, User, GraduationCap, Layers } from 'lucide-react'
import { DynamicArray, NButton, NForm, usePrefix } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react'
import { useFormContext, useWatch } from 'react-hook-form'
import { createTeacherSchemas } from '../config/teacherSchemas'
import { expandTeacherAssignments, parseTeacherSectionKey, subjectsForTeacherClasses, teacherSectionKey } from '../config/teacherAssignments'

// ==================== COMPONENTS ====================

const EMPTY_IDS: string[] = []

const AssignmentItem = ({ classes, subjects }) => {
   const { t } = useTranslation()
   const { getValues, setValue } = useFormContext()
   const prefix = usePrefix()
   const prevClassIdsRef = useRef<string[] | null>(null)

   const selectedClassIds: string[] = useWatch({ name: `${prefix}.classIds` }) ?? EMPTY_IDS
   const selectedSubjectIds: string[] = useWatch({ name: `${prefix}.subjectIds` }) ?? EMPTY_IDS
   const selectedClassKey = selectedClassIds.join('|')

   const classOptions = classes.map(cls => ({
      value: cls.id,
      label: cls.name
   }))

   // In the order the classes were chosen, so each class's sections stay together.
   const selectedClasses = useMemo(
      () => selectedClassIds.map(id => classes.find(cls => cls.id === id)).filter(Boolean),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedClassKey stands for selectedClassIds
      [classes, selectedClassKey],
   )
   const allClassesSelected = classes.length > 0 && classes.every(cls => selectedClassIds.includes(cls.id))

   const availableSubjectIds = new Set(subjectsForTeacherClasses(subjects, selectedClasses.map(cls => cls.level)).map(subject => subject.id))
   // Previously saved assignments stay readable until the administrator changes
   // them. Removing an old selection keeps it out of the new subject choices.
   const subjectOptions = subjects.filter(subject => availableSubjectIds.has(subject.id) || selectedSubjectIds.includes(subject.id)).map(sbj => ({
      value: sbj.id,
      label: sbj.name
   }))

   // With several classes, a section is named with its class: "CP · A".
   const sectionOptions = selectedClasses.flatMap(cls => (cls.sections ?? []).map(section => ({
      value: teacherSectionKey(cls.id, section.id),
      label: selectedClasses.length > 1 ? `${cls.name} · ${section.name}` : section.name
   })))

   // A class the administrator adds arrives with all its sections, which they
   // narrow; a class removed takes its sections with it. Loaded values are left
   // as they are.
   useEffect(() => {
      const previous = prevClassIdsRef.current
      prevClassIdsRef.current = selectedClassIds
      if (previous === null) return

      const added = selectedClassIds.filter(id => !previous.includes(id))
      const removed = new Set(previous.filter(id => !selectedClassIds.includes(id)))
      if (added.length === 0 && removed.size === 0) return

      const currentSections: string[] = getValues(`${prefix}.sectionIds`) ?? []
      const kept = currentSections.filter(key => !removed.has(parseTeacherSectionKey(key)?.classId ?? ''))
      const addedSections = added.flatMap(id => (classes.find(cls => cls.id === id)?.sections ?? []).map(section => teacherSectionKey(id, section.id)))
      setValue(`${prefix}.sectionIds`, [...new Set([...kept, ...addedSections])], { shouldValidate: currentSections.length > 0 || addedSections.length > 0 })

      if (added.length > 0) {
         const allowed = new Set(subjectsForTeacherClasses(subjects, selectedClasses.map(cls => cls.level)).map(subject => subject.id))
         const currentSubjects: string[] = getValues(`${prefix}.subjectIds`) ?? []
         if (currentSubjects.some(id => !allowed.has(id))) {
            setValue(`${prefix}.subjectIds`, currentSubjects.filter(id => allowed.has(id)))
         }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedClassKey stands for selectedClassIds
   }, [selectedClassKey, selectedClasses, classes, subjects, prefix, getValues, setValue])

   const toggleAllClasses = () => {
      setValue(`${prefix}.classIds`, allClassesSelected ? [] : classes.map(cls => cls.id), { shouldDirty: true, shouldValidate: true })
   }

   return (
      <div className='space-y-3'>
         <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div className='space-y-1'>
               <FormInput
                  name='classIds'
                  type='multiselect'
                  formLabel={t('teachers.form.classes')}
                  items={classOptions}
                  placeholder={t('teachers.form.classesPlaceholder')}
                  icon={GraduationCap}
                  maxDisplay={4}
                  required={true}
               />
               {classes.length > 1 && (
                  <NButton type='button' variant='link' size='sm' className='h-auto px-0' onClick={toggleAllClasses}>
                     {allClassesSelected ? t('teachers.form.clearClasses') : t('teachers.form.allClasses')}
                  </NButton>
               )}
            </div>

            <FormInput
               name='sectionIds'
               type='multiselect'
               formLabel={t('teachers.form.sections')}
               items={sectionOptions}
               placeholder={t('teachers.form.sectionsPlaceholder')}
               icon={Layers}
               maxDisplay={6}
               disabled={selectedClassIds.length === 0}
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
            disabled={selectedClassIds.length === 0}
            required={true}
         />
      </div>
   )
}

export const AssignmentFormContent = ({ classes, subjects }) => {
   const { t } = useTranslation()

   const handleAddAssignment = (append) => {
      append({
         classIds: [],
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
      pop({ ...assignmentData, assignments: expandTeacherAssignments(assignmentData.assignments ?? []) })
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
