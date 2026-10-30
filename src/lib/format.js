export const fmtNum = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
export const fmtGp = (n) => fmtNum(n) + ' gp'
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
