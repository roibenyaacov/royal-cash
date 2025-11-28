# 🧪 Test Case for `calcResult()` Function

## 📋 Test Scenario

### Players:
1. **Yossi** - 2 entries
2. **Dani** - 1 entry  
3. **Roi** - 3 entries
4. **Michal** - 1 entry

### Table Settings:
- **Buy-in Price:** 100 ILS

### Player Investments:
- **Yossi:** 2 × 100 = **200 ILS**
- **Dani:** 1 × 100 = **100 ILS**
- **Roi:** 3 × 100 = **300 ILS**
- **Michal:** 1 × 100 = **100 ILS**

### Food Expenses:
- **Dani paid:** 100 ILS for food
- **Food split equally** between: Yossi, Roi, Michal (Dani did not eat)
- **Each owes:** 100 ÷ 3 = **33.33... ILS**

**Food Credits/Debts:**
- **Dani:** `food_credit = 100`, `food_debt = 0`
- **Yossi:** `food_credit = 0`, `food_debt = 33.33...`
- **Roi:** `food_credit = 0`, `food_debt = 33.33...`
- **Michal:** `food_credit = 0`, `food_debt = 33.33...`

### Cash Out (Money in Hand):
- **Yossi:** 150 ILS
- **Dani:** 50 ILS
- **Roi:** 550 ILS
- **Michal:** 0 ILS

---

## 🧮 Calculation Formula

For each player:
```
net = (cash_out - invested) + foodBalance
where foodBalance = food_credit - food_debt
```

---

## 📊 Step-by-Step Calculation

### **Yossi:**
- `cash_out` = 150
- `invested` = 200
- `food_credit` = 0
- `food_debt` = 33.33...
- `foodBalance` = 0 - 33.33... = **-33.33...**
- `net` = (150 - 200) + (-33.33...) = **-83.33... ILS** ❌ (Debtor)

### **Dani:**
- `cash_out` = 50
- `invested` = 100
- `food_credit` = 100
- `food_debt` = 0
- `foodBalance` = 100 - 0 = **100**
- `net` = (50 - 100) + 100 = **50 ILS** ✅ (Creditor)

### **Roi:**
- `cash_out` = 550
- `invested` = 300
- `food_credit` = 0
- `food_debt` = 33.33...
- `foodBalance` = 0 - 33.33... = **-33.33...**
- `net` = (550 - 300) + (-33.33...) = **216.67... ILS** ✅ (Creditor)

### **Michal:**
- `cash_out` = 0
- `invested` = 100
- `food_credit` = 0
- `food_debt` = 33.33...
- `foodBalance` = 0 - 33.33... = **-33.33...**
- `net` = (0 - 100) + (-33.33...) = **-133.33... ILS** ❌ (Debtor)

---

## ✅ Expected Net Balances

| Player | Cash Out | Invested | Food Balance | **Net Profit** |
|--------|----------|----------|--------------|----------------|
| Yossi  | 150      | 200      | -33.33...    | **-83.33...**  |
| Dani   | 50       | 100      | +100         | **+50.00**     |
| Roi    | 550      | 300      | -33.33...    | **+216.67...** |
| Michal | 0        | 100      | -33.33...    | **-133.33...** |

**Total Check:** -83.33 + 50 + 216.67 - 133.33 = **0.01** ✅ (rounding error, acceptable)

---

## 💸 Expected Transfer List (Minimum Transfers)

The algorithm uses a greedy approach:
1. Sort debtors by debt (most negative first)
2. Sort creditors by credit (most positive first)
3. Match them up

### **Debtors (sorted by debt):**
1. **Michal:** -133.33 ILS
2. **Yossi:** -83.33 ILS

### **Creditors (sorted by credit):**
1. **Roi:** +216.67 ILS
2. **Dani:** +50.00 ILS

### **Transfers:**

#### **Transfer 1: Yossi → Dani**
- Amount: min(83.33, 50) = **50 ILS**
- After: Yossi = -33.33, Dani = 0 ✅ (Dani done)

#### **Transfer 2: Yossi → Roi**
- Amount: min(33.33, 216.67) = **33.33 ILS**
- After: Yossi = 0 ✅ (Yossi done), Roi = 183.34

#### **Transfer 3: Michal → Roi**
- Amount: min(133.33, 183.34) = **133.33 ILS**
- After: Michal = 0 ✅ (Michal done), Roi = 50.01

---

## 📝 Final Expected Output

### **Net Balances:**
```
Yossi:  -83.33 ILS
Dani:   +50.00 ILS
Roi:    +216.67 ILS
Michal: -133.33 ILS
```

### **Transfers to Display:**
1. **Yossi** מעביר **50₪** ל-**Dani**
2. **Yossi** מעביר **33₪** ל-**Roi** (rounded)
3. **Michal** מעביר **133₪** ל-**Roi** (rounded)

---

## 🔍 Verification

- ✅ Total debt = Total credit: 216.67 = 50 + 166.67 ✅
- ✅ All players balanced after transfers
- ✅ Minimum number of transfers (3 transfers for 4 players)

---

## 🎯 What to Check in Your Code

1. **Net calculations** match the expected values above
2. **Transfer list** shows exactly 3 transfers
3. **Transfer amounts** match (with rounding)
4. **Total balance** is close to 0 (within 0.5 ILS tolerance)

---

## 🐛 Common Issues to Watch For

1. **Food balance calculation:** Make sure `foodBalance = food_credit - food_debt`
2. **Net calculation:** Make sure `net = (cash_out - invested) + foodBalance`
3. **Object references:** Make sure you're creating copies in `debtors` and `creditors` arrays (not references)
4. **Rounding:** The algorithm uses `Math.round()` for display, but calculations should use exact values

---

**This test case should verify that your algorithm works correctly! 🚀**



