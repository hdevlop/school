# Student names and Massar codes

`studentCode` is the student's existing unique identifier and appears on cards as
the Massar code. It remains a string to preserve the entered code.

`name` remains the primary name. `arabicName` is an optional, separate string of
up to 100 characters, trimmed during validation. It is accepted by create/edit
and bulk DTOs, the student form, and the `arabicName` spreadsheet column. Empty
values are allowed, including clearing a previously saved name.

Cards show the Arabic name beneath the primary name with Arabic language and
right-to-left direction. Massar codes use left-to-right direction. Empty optional
values are hidden. Student name searches also include the Arabic name, and the
student table can export it as `arabicName` for a subsequent import.

Migration `0069_student_arabic_name` adds the nullable column. Earlier imports
discarded the unrecognized Arabic-name column; applying the migration does not
recover that data. Existing students can receive their Arabic name through edit.
