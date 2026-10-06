import React from 'react';

import { Label } from 'najm-kit';
import { NAvatar } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

export const PaymentHeader = ({ student }) => {
    const { t } = useTranslation();
    const studentInfo = student.student;
    const { class: classInfo, section } = student.assignment;

    return (
        <div className="bg-linear-to-r from-pink-600 to-orange-500 text-white px-5 py-3 shrink-0">
            <div className="flex items-center gap-3">
                <NAvatar
                    src={studentInfo.image}
                    fallback={studentInfo.name}
                    size="sm"
                    className=" border-2  bg-white "
                />
                <div>
                    <Label className="text-xl font-bold text-white">{t('payments.dialogs.createButton')}</Label>
                    <Label className="text-pink-100 text-xs block mt-0.5">
                        {studentInfo.name} • {studentInfo.studentCode} • {classInfo.name}-{section.name}
                    </Label>
                </div>
            </div>
        </div>
    );
};
