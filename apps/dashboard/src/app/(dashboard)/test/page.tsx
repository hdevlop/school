'use client'
import { NBadge } from 'najm-kit';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { STATUS_COLOR_MAP, STATUS_ICON_MAP } from '@/lib/statusBadge';

type BadgeLook = 'solid' | 'outline' | 'soft' | 'minimal' | 'text';
type BadgeSize = 'sm' | 'md' | 'lg';

export default function NBadgePreview() {
  const [selectedLook, setSelectedLook] = useState<BadgeLook>('solid');
  const [selectedSize, setSelectedSize] = useState<BadgeSize>('md');

  const statuses = ['active', 'pending', 'processing', 'completed', 'cancelled', 'inactive'];
  const looks: BadgeLook[] = ['solid', 'outline', 'soft', 'minimal', 'text'];
  const sizes: BadgeSize[] = ['sm', 'md', 'lg'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Interactive Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Interactive Demo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Look</label>
              <select
                value={selectedLook}
                onChange={(e) => setSelectedLook(e.target.value as BadgeLook)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {looks.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value as BadgeSize)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {sizes.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {statuses.map(status => (
              <NBadge
                key={status}
                status={status}
                statusMap={STATUS_COLOR_MAP}
                look={selectedLook}
                size={selectedSize}
              />
            ))}
          </div>
        </div>

        <NBadge status="active" statusMap={STATUS_COLOR_MAP} />

        <NBadge status="active" statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} showIcon />

        <NBadge status="processing" statusMap={STATUS_COLOR_MAP} showIcon icon={Loader2} />

        <NBadge status="pending" statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} look="outline" showIcon />
        <NBadge status="approved" statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} look="soft" showIcon />
        <NBadge status="cancelled" statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} look="minimal" showIcon />
        <NBadge status="completed" statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} look="text" showIcon />

      </div>
    </div>
  );
}
