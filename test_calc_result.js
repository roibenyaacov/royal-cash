/**
 * Test function for calcResult() algorithm
 * Run this in the browser console to verify the calculation logic
 */

function testCalcResult() {
    console.log('🧪 Testing calcResult() Algorithm\n');
    console.log('='.repeat(60));
    
    // Test Data
    const buyIn = 100;
    const players = [
        { name: 'Yossi', rebuys: 2, cashOut: 150, foodCredit: 0, foodDebt: 100/3 },
        { name: 'Dani', rebuys: 1, cashOut: 50, foodCredit: 100, foodDebt: 0 },
        { name: 'Roi', rebuys: 3, cashOut: 550, foodCredit: 0, foodDebt: 100/3 },
        { name: 'Michal', rebuys: 1, cashOut: 0, foodCredit: 0, foodDebt: 100/3 }
    ];
    
    // Calculate net for each player
    const tempPlayers = players.map(p => {
        const invested = p.rebuys * buyIn;
        const foodBalance = p.foodCredit - p.foodDebt;
        const net = (p.cashOut - invested) + foodBalance;
        
        return {
            name: p.name,
            cashOut: p.cashOut,
            invested: invested,
            foodCredit: p.foodCredit,
            foodDebt: p.foodDebt,
            foodBalance: foodBalance,
            net: net
        };
    });
    
    // Display calculations
    console.log('\n📊 Player Calculations:');
    console.log('-'.repeat(60));
    tempPlayers.forEach(p => {
        console.log(`\n${p.name}:`);
        console.log(`  Cash Out: ${p.cashOut}₪`);
        console.log(`  Invested: ${p.invested}₪`);
        console.log(`  Food Credit: ${p.foodCredit}₪`);
        console.log(`  Food Debt: ${p.foodDebt.toFixed(2)}₪`);
        console.log(`  Food Balance: ${p.foodBalance.toFixed(2)}₪`);
        console.log(`  Net: ${p.net.toFixed(2)}₪ ${p.net >= 0 ? '✅' : '❌'}`);
    });
    
    // Validate total
    const total = tempPlayers.reduce((sum, p) => sum + p.net, 0);
    console.log('\n' + '='.repeat(60));
    console.log(`\n💰 Total Balance: ${total.toFixed(2)}₪`);
    if (Math.abs(total) < 0.5) {
        console.log('✅ Balance is correct (within tolerance)');
    } else {
        console.log('❌ Balance discrepancy detected!');
    }
    
    // Calculate transfers (same algorithm as calcResult)
    const debtors = tempPlayers
        .filter(p => p.net < -0.5)
        .map(p => ({ ...p, net: p.net })) // Create copy
        .sort((a, b) => a.net - b.net);
    
    const creditors = tempPlayers
        .filter(p => p.net > 0.5)
        .map(p => ({ ...p, net: p.net })) // Create copy
        .sort((a, b) => b.net - a.net);
    
    console.log('\n' + '='.repeat(60));
    console.log('\n💸 Transfer Calculation:');
    console.log('-'.repeat(60));
    
    console.log('\n📉 Debtors (sorted):');
    debtors.forEach(d => {
        console.log(`  ${d.name}: ${d.net.toFixed(2)}₪`);
    });
    
    console.log('\n📈 Creditors (sorted):');
    creditors.forEach(c => {
        console.log(`  ${c.name}: ${c.net.toFixed(2)}₪`);
    });
    
    // Calculate transfers
    const transfers = [];
    let d = 0, c = 0;
    
    while (d < debtors.length && c < creditors.length) {
        const amount = Math.min(Math.abs(debtors[d].net), creditors[c].net);
        
        transfers.push({
            from: debtors[d].name,
            to: creditors[c].name,
            amount: amount
        });
        
        // Update balances (working with copies, so safe)
        debtors[d].net += amount;
        creditors[c].net -= amount;
        
        if (Math.abs(debtors[d].net) < 0.5) d++;
        if (creditors[c].net < 0.5) c++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Expected Transfers:');
    console.log('-'.repeat(60));
    
    if (transfers.length === 0) {
        console.log('✅ Everyone is balanced!');
    } else {
        transfers.forEach((t, idx) => {
            console.log(`\n${idx + 1}. ${t.from} → ${t.to}: ${Math.round(t.amount)}₪`);
        });
    }
    
    // Verify final balances
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Final Verification:');
    console.log('-'.repeat(60));
    
    const finalDebtors = debtors.filter(d => Math.abs(d.net) >= 0.5);
    const finalCreditors = creditors.filter(c => c.net >= 0.5);
    
    if (finalDebtors.length === 0 && finalCreditors.length === 0) {
        console.log('✅ All players balanced!');
    } else {
        console.log('❌ Some players still have balance:');
        finalDebtors.forEach(d => {
            console.log(`  ${d.name}: ${d.net.toFixed(2)}₪`);
        });
        finalCreditors.forEach(c => {
            console.log(`  ${c.name}: ${c.net.toFixed(2)}₪`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 Expected Results Summary:');
    console.log('-'.repeat(60));
    console.log('\nNet Balances:');
    tempPlayers.forEach(p => {
        console.log(`  ${p.name}: ${p.net.toFixed(2)}₪`);
    });
    console.log('\nTransfers:');
    transfers.forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.from} מעביר ${Math.round(t.amount)}₪ ל-${t.to}`);
    });
    
    return {
        players: tempPlayers,
        transfers: transfers,
        total: total
    };
}

// Run the test
console.log('\n🚀 Running test...\n');
const result = testCalcResult();



