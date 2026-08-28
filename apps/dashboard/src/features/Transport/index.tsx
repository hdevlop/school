'use client'

import { Bus } from 'lucide-react'
import { NPageHeader, NPageHeaderActions, NSkeleton, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit'
import { useVehicles } from '@/features/Vehicles/hooks/useVehicles'
import { VehicleStudentsPanel } from './components/VehicleStudentsPanel'
import { useTranslation } from '@/hooks/useLanguage'
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions'

const TAB_STYLES =
  'border-0 cursor-pointer data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:!border-b-2 data-[state=active]:!border-primary rounded-none px-6 py-3 data-[state=active]:!text-primary text-muted-foreground hover:text-primary transition-colors'

const TransportVehiclesSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex flex-col gap-4 rounded-xl border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <NSkeleton className="h-10 w-10 rounded-xl" />
            <div className="flex flex-col gap-2">
              <NSkeleton className="h-4 w-32" />
              <NSkeleton className="h-3 w-44" />
            </div>
          </div>
          <NSkeleton className="h-6 w-16 rounded-full" />
        </div>

        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((__, rowIndex) => (
            <div key={rowIndex} className="rounded-lg border bg-gray-50/50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <NSkeleton className="h-4 w-36" />
                  <NSkeleton className="h-3 w-20" />
                </div>
                <NSkeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        <NSkeleton className="h-8 w-full rounded-md" />
      </div>
    ))}
  </div>
)

export default function TransportPage() {
  const { t } = useTranslation()
  const { vehicles, isVehiclesLoading } = useVehicles()

  const activeVehicles = (vehicles || []).filter((v: any) => v.status === 'active')

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <NPageHeader
        icon={Bus}
        title={t('navigation.transport')}
        subtitle={t('transport.panel.manageSubtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <Tabs defaultValue="routes">
        <div className="border-b">
          <TabsList className="bg-transparent rounded-none justify-start h-auto p-0 border-0">
            <TabsTrigger value="routes" className={TAB_STYLES}>
              <Bus className="w-4 h-4 mr-2" />
              Student Routes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="routes" className="pt-4">
          {isVehiclesLoading ? (
            <TransportVehiclesSkeleton />
          ) : activeVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bus className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No active vehicles found</p>
              <p className="text-xs mt-1">Add vehicles in the Vehicles section first</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeVehicles.map((vehicle: any) => (
                <VehicleStudentsPanel key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
