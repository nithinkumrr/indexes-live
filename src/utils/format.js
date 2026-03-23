// src/utils/format.js

// Smart price formatting based on magnitude
export function formatPrice(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (value >= 100000) return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format absolute change with sign
export function formatChange(change) {
  if (change === null || change === undefined || isNaN(change)) return '—';
  const sign = change >= 0 ? '+' : '';
  if (Math.abs(change) >= 1000) return sign + change.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return sign + change.toFixed(2);
}

// Format percent change with sign
export function formatPct(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}
