export const memoryUsage = () => {
  const value = process.memoryUsage().heapUsed / 1024 / 1024
  return Math.round(value * 100) / 100
}
