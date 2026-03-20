export const calculateDailyClosure = (ledgerTransactions, dateString) => {
    let income = 0;
    let expense = 0;

    ledgerTransactions.forEach(tx => {
        const isToday = tx.transaction_date.startsWith(dateString);
        if (!isToday) return;

        if (tx.transaction_type === 'income') {
            income += Number(tx.amount);
        } else if (tx.transaction_type === 'expense') {
            expense += Number(tx.amount);
        }
    });

    return {
        income,
        expense,
        balance: income - expense
    };
};
