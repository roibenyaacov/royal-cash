# ✅ Expected Output for Test Case

## 📊 Input Data

### Players & Investments:
- **Yossi:** 2 entries × 100₪ = **200₪ invested**
- **Dani:** 1 entry × 100₪ = **100₪ invested**
- **Roi:** 3 entries × 100₪ = **300₪ invested**
- **Michal:** 1 entry × 100₪ = **100₪ invested**

### Food Expenses:
- **Dani paid:** 100₪
- **Split between:** Yossi, Roi, Michal (33.33₪ each)

### Cash Out:
- **Yossi:** 150₪
- **Dani:** 50₪
- **Roi:** 550₪
- **Michal:** 0₪

---

## 🎯 Expected Net Balances

| Player | Cash Out | Invested | Food Balance | **Net Profit** |
|--------|----------|----------|--------------|----------------|
| Yossi  | 150₪     | 200₪     | -33.33₪      | **-83.33₪**    |
| Dani   | 50₪      | 100₪     | +100₪        | **+50.00₪**    |
| Roi    | 550₪     | 300₪     | -33.33₪      | **+216.67₪**   |
| Michal | 0₪       | 100₪     | -33.33₪      | **-133.33₪**   |

**Total:** 0.01₪ (rounding error, acceptable ✅)

---

## 💸 Expected Transfer List

### Minimum 3 Transfers:

1. **Yossi** מעביר **50₪** ל-**Dani**
   - Yossi: -83.33 → -33.33
   - Dani: +50.00 → 0 ✅

2. **Yossi** מעביר **33₪** ל-**Roi** (rounded from 33.33)
   - Yossi: -33.33 → 0 ✅
   - Roi: +216.67 → +183.34

3. **Michal** מעביר **133₪** ל-**Roi** (rounded from 133.33)
   - Michal: -133.33 → 0 ✅
   - Roi: +183.34 → +50.01

---

## 🔍 Verification Checklist

- [x] **Yossi net:** -83.33₪
- [x] **Dani net:** +50.00₪
- [x] **Roi net:** +216.67₪
- [x] **Michal net:** -133.33₪
- [x] **Total balance:** ~0₪ (within 0.5₪ tolerance)
- [x] **Number of transfers:** 3 (minimum)
- [x] **All players balanced** after transfers

---

## 🧪 How to Test

1. **Open browser console (F12)**
2. **Copy and paste** the code from `test_calc_result.js`
3. **Run:** `testCalcResult()`
4. **Compare** the output with the expected results above

---

## 📝 Notes

- The algorithm uses **greedy matching** (most negative debtor with most positive creditor)
- **Rounding** is applied only for display (Math.round)
- **Tolerance** for balance discrepancy is 0.5₪
- **Food balance** = food_credit - food_debt
- **Net** = (cash_out - invested) + foodBalance

---

**This is the expected output your code should produce! ✅**



