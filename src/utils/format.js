// src/utils/format.js

export function formatPrice(value, isCommodity = false) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (isCommodity) {
    // Commodities: show meaningful decimals
    if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (value >= 10)   return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  if (value >= 100000) return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  if (value >= 10000)  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1000)   return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatChange(change) {
  if (change === null || change === undefined || isNaN(change)) return '—';
  const sign = change >= 0 ? '+' : '';
  if (Math.abs(change) >= 1000) return sign + change.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return sign + change.toFixed(2);
}

export function formatPct(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  const abs = Math.abs(pct).toFixed(2) + '%';
  return abs;
}
