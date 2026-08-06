import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Label } from 'najm-kit';

export const SelectedItemsSummary = ({ selectedInstallments, selectedCount }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="bg-linear-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-3">
            <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={16} />
                <Label className="text-sm font-semibold">Selected Items Summary ({selectedCount})</Label>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-28 overflow-y-auto">
                {Object.values(selectedInstallments).map((inst: any) => (
                    <div key={inst.id} className="bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">{inst.feeIcon}</span>
                            <div>
                                <Label className="text-xs font-medium text-gray-900">
                                    {inst.feeName} #{inst.number}
                                </Label>
                                <Label className="text-[10px] text-gray-600 block">{inst.dueDate}</Label>
                            </div>
                        </div>
                        <div className="text-right">
                            <Label className="text-xs font-bold text-green-600 block">
                                {inst.allocatedAmount.toFixed(2)}
                            </Label>
                            <Label className="text-[10px] text-gray-500 block">MAD</Label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
