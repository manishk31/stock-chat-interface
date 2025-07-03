function filterStocksByCriteria(stocks: Record<string, unknown>[], query: string): Record<string, unknown>[] {
  // ... existing code ...
  return stocks.slice(0, 10); // Ensure a value is always returned
}
export default filterStocksByCriteria; 