import { api } from './http'

export const getPayrollApi = async () => {
  const res = await api.get('/payroll')
  return res.data
}

export const getPayrollByIdApi = async (id) => {
  const res = await api.get(`/payroll/${id}`)
  return res.data
}

export const getPayrollByPeriodApi = async (period) => {
  const res = await api.get(`/payroll/period/${period}`)
  return res.data
}

export const runPayrollApi = async (period) => {
  const res = await api.post('/payroll/run', { period })
  return res.data
}

export const payPayslipApi = async ({ id, ...body }) => {
  const res = await api.post(`/payroll/${id}/pay`, body)
  return res.data
}

// One-click: create + pay a payslip for a staff member (no separate run step).
export const payStaffApi = async (body) => {
  const res = await api.post('/payroll/pay-staff', body)
  return res.data
}

export const payStaffBulkApi = async (body) => {
  const res = await api.post('/payroll/pay-staff-bulk', body)
  return res.data
}

// Undo a payment — keep the payslip history and return it to pending.
export const unpayStaffApi = async (body) => {
  const res = await api.post('/payroll/unpay-staff', body)
  return res.data
}

export const updatePayslipApi = async ({ id, ...body }) => {
  const res = await api.put(`/payroll/${id}`, body)
  return res.data
}

export const deletePayslipApi = async (id) => {
  const res = await api.delete(`/payroll/${id}`)
  return res.data
}

export const deleteBulkPayslipsApi = async (ids) => {
  const res = await api.delete('/payroll/bulk', { data: { ids } })
  return res.data
}
