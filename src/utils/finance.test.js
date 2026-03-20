import { describe, it, expect } from 'vitest';
import { calculateDailyClosure } from './finance';

describe('Financial Utility: calculateDailyClosure', () => {
    it('should correctly sum income and expenses for a specific date', () => {
        const mockLedger = [
            { amount: 100, transaction_type: 'income', transaction_date: '2026-03-19T10:00:00Z' },
            { amount: 50, transaction_type: 'expense', transaction_date: '2026-03-19T11:00:00Z' },
            { amount: 200, transaction_type: 'income', transaction_date: '2026-03-18T10:00:00Z' }, // different date
            { amount: 20, transaction_type: 'expense', transaction_date: '2026-03-19T12:00:00Z' }
        ];

        const result = calculateDailyClosure(mockLedger, '2026-03-19');

        expect(result.income).toBe(100);
        expect(result.expense).toBe(70);
        expect(result.balance).toBe(30);
    });

    it('should return 0 when there are no transactions for the date', () => {
        const mockLedger = [
            { amount: 100, transaction_type: 'income', transaction_date: '2026-03-18T10:00:00Z' }
        ];

        const result = calculateDailyClosure(mockLedger, '2026-03-19');

        expect(result.income).toBe(0);
        expect(result.expense).toBe(0);
        expect(result.balance).toBe(0);
    });
});
