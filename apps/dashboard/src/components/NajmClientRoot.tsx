'use client'

import { NMultiDialog, Toaster } from 'najm-kit'

const NajmClientRoot = () => (
  <>
    <NMultiDialog />
    {/* Top, not the default bottom corner: dialogs keep their confirm and
        update buttons at the bottom, and a toast there covered them. */}
    <Toaster richColors position="top-center" />
  </>
)

export default NajmClientRoot
