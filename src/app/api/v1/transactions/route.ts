import { NextRequest } from 'next/server';

export const revalidate = 86400;

interface Transaction {
  ref: string;
  location: string;
  type: string;
  listed_price: number;
  sold_price: number;
  discount_pct: number;
  days_on_market: number;
  date: string;
  avm_accuracy: number;
}

export async function GET(_req: NextRequest) {
  const transactions: Transaction[] = [
    { ref: 'AV-TRV-2401', location: 'Torrevieja', type: 'apartment', listed_price: 189000, sold_price: 182500, discount_pct: 3.4, days_on_market: 45, date: '2026-03-28', avm_accuracy: 97.2 },
    { ref: 'AV-OHC-2402', location: 'Orihuela Costa', type: 'apartment', listed_price: 245000, sold_price: 238000, discount_pct: 2.9, days_on_market: 62, date: '2026-03-22', avm_accuracy: 95.8 },
    { ref: 'AV-GDM-2403', location: 'Guardamar', type: 'villa', listed_price: 385000, sold_price: 365000, discount_pct: 5.2, days_on_market: 98, date: '2026-03-15', avm_accuracy: 93.1 },
    { ref: 'AV-SPL-2404', location: 'Santa Pola', type: 'apartment', listed_price: 165000, sold_price: 162000, discount_pct: 1.8, days_on_market: 28, date: '2026-03-10', avm_accuracy: 98.5 },
    { ref: 'AV-ALT-2405', location: 'Alicante', type: 'apartment', listed_price: 220000, sold_price: 215000, discount_pct: 2.3, days_on_market: 41, date: '2026-03-05', avm_accuracy: 96.4 },
    { ref: 'AV-TRV-2406', location: 'Torrevieja', type: 'penthouse', listed_price: 275000, sold_price: 260000, discount_pct: 5.5, days_on_market: 85, date: '2026-02-28', avm_accuracy: 92.7 },
    { ref: 'AV-VLM-2407', location: 'Villamartin', type: 'townhouse', listed_price: 198000, sold_price: 192000, discount_pct: 3.0, days_on_market: 53, date: '2026-02-20', avm_accuracy: 96.1 },
    { ref: 'AV-PIR-2408', location: 'Pilar de la Horadada', type: 'villa', listed_price: 420000, sold_price: 398000, discount_pct: 5.2, days_on_market: 112, date: '2026-02-14', avm_accuracy: 91.8 },
    { ref: 'AV-CAM-2409', location: 'Campoamor', type: 'apartment', listed_price: 205000, sold_price: 200000, discount_pct: 2.4, days_on_market: 37, date: '2026-02-08', avm_accuracy: 97.0 },
    { ref: 'AV-BJR-2410', location: 'Benijofar', type: 'villa', listed_price: 345000, sold_price: 330000, discount_pct: 4.3, days_on_market: 76, date: '2026-01-30', avm_accuracy: 94.5 },
  ];

  const totalTransactions = transactions.length;
  const avgDiscount = Number((transactions.reduce((s, t) => s + t.discount_pct, 0) / totalTransactions).toFixed(1));
  const avgDaysOnMarket = Math.round(transactions.reduce((s, t) => s + t.days_on_market, 0) / totalTransactions);
  const avgAvmAccuracy = Number((transactions.reduce((s, t) => s + t.avm_accuracy, 0) / totalTransactions).toFixed(1));

  return Response.json({
    transactions,
    aggregate_stats: {
      total_transactions: totalTransactions,
      avg_discount_pct: avgDiscount,
      avg_days_on_market: avgDaysOnMarket,
      total_volume_eur: transactions.reduce((s, t) => s + t.sold_price, 0),
    },
    avm_validation: {
      accuracy_score: avgAvmAccuracy,
      sample_size: totalTransactions,
      methodology: 'sold_price_vs_avm_estimate_comparison',
    },
    status: 'simulated — live Catastro/Registro integration pending',
    note: 'When live: auto-updates AVM accuracy metrics from registry data',
    methodology: 'transaction_radar_with_avm_backtesting',
  });
}
