# Backend Calculation Corrections

This document explains the corrections made to the backend result calculations to ensure accurate and meaningful metrics for the Maintenance Optimization Tool.

## Problem Statement

The original backend calculations were producing misleading results because they:
1. Mixed preventive and corrective maintenance in averages
2. Included red-state corrective decisions in intervention thresholds
3. Used ambiguous terminology ("Counter Level" instead of "Decision Period")

## Corrected Calculations

### 1. probNotRed (Probability of Not Being in Red State)

**Definition:** Probability that the system has NOT reached the red failure state.

**Correct Calculation:**
```python
prob_red = float(np.sum(SolutionMat[1, :, :]))
probNotRed = 1.0 - prob_red
```

**Why:**
- `SolutionMat[1, :, :]` contains all probabilities for red signal state (s=1)
- Sum gives total probability of being in red state
- `1 - prob_red` gives probability of being in NOT-RED (yellow) state

**Frontend Display:**
- Shows as percentage (e.g., "92.3%")
- Helper text: "Probability that the system has not reached failure"

---

### 2. maxInterventionLevel (Maximum Yellow Intervention Level)

**Definition:** The highest yellow/not-red decision period where preventive maintenance is recommended BEFORE failure occurs.

**Correct Calculation:**
```python
maxInterventionLevel = 0
threshold = 1e-6
for n in range(U + 1):
    preventive_prob = float(np.sum(SolutionMat[0, n, 1:C + 1]))
    if preventive_prob > threshold:
        maxInterventionLevel = n
```

**Why:**
- Only examines NOT-RED state (s=0)
- Only counts preventive intervention actions (a≥1)
- Does NOT include red-state corrective maintenance (s=1)
- Finds the LARGEST n where preventive intervention occurs
- This represents the optimal intervention threshold (n*)

**Frontend Display:**
- Shows as "Yellow Level n* = [value]"
- Helper text: "Highest yellow/healthy-warning period where preventive maintenance is recommended before red failure"

---

### 3. avgInterventionLevel (Average Intervention Level)

**Definition:** Average decision period at which preventive maintenance is performed, weighted by probability.

**Correct Calculation:**
```python
weighted_sum = 0.0
total_preventive_prob = 0.0
for n in range(U + 1):
    preventive_prob = float(np.sum(SolutionMat[0, n, 1:C + 1]))
    weighted_sum += n * preventive_prob
    total_preventive_prob += preventive_prob

avgInterventionLevel = weighted_sum / total_preventive_prob if total_preventive_prob > threshold else 0.0
```

**Why:**
- Only includes preventive maintenance in NOT-RED state (s=0, a≥1)
- Does NOT include corrective maintenance in red state (s=1)
- Uses probability-weighted average
- Reflects when users typically perform preventive maintenance
- Excludes emergency corrective actions that distort the average

**Frontend Display:**
- Shows as numeric value (e.g., "2.8")
- Helper text: "Average period at which the model recommends maintenance"

---

### 4. optimalPolicy (Policy Array)

**Definition:** Array showing recommended action at each decision period for yellow/not-red state only.

**Correct Calculation:**
```python
optimalPolicy = []
for n in range(U + 1):
    preventive_prob = float(np.sum(SolutionMat[0, n, 1:C + 1]))
    if preventive_prob > threshold:
        optimalPolicy.append(1)  # Preventive maintenance
    else:
        optimalPolicy.append(0)  # Wait
```

**Why:**
- Only reflects NOT-RED state decisions
- Action values: 0 = Wait, 1 = Preventive Maintenance
- Does NOT include action value 2 (corrective) because that's for red state
- Frontend table only shows yellow/not-red decisions

**Frontend Display:**
- Used to build policy table
- Shows "Wait" or "Perform Maintenance" badges
- Stops table after first intervention threshold

---

### 5. tableRows (Clean Table Data)

**Definition:** Structured table data for frontend display, showing only yellow/not-red state decisions.

**Correct Calculation:**
```python
tableRows = []
for n in range(U + 1):
    preventive_prob = float(np.sum(SolutionMat[0, n, 1:C + 1]))
    state_probability = float(np.sum(SolutionMat[0, n, :]))
    
    if preventive_prob > threshold:
        recommendedAction = "Perform Maintenance"
        actionType = "Preventive Maintenance"
    else:
        recommendedAction = "Wait"
        actionType = "No Action"
    
    tableRows.append({
        "decisionPeriod": n,
        "signalState": "Not-Red",
        "recommendedAction": recommendedAction,
        "actionType": actionType,
        "expectedCost": round(expected_cost, 2),
        "probability": round(state_probability, 4),
        "interventionProbability": round(preventive_prob, 4)
    })
    
    # Stop after first preventive intervention
    if preventive_prob > threshold:
        break
```

**Why:**
- Only includes NOT-RED state rows
- Stops after first intervention threshold for clarity
- Signal state always "Not-Red" (yellow state)
- Shows when to perform PREVENTIVE maintenance
- Does NOT show corrective maintenance rows

**Frontend Display:**
- Table columns: Decision Period (n), Recommended Action, Action Type, Expected Cost, Probability
- Highlights optimal intervention row with blue background
- Uses "Yellow Intervention Level (n)" terminology

---

## Terminology Updates

### Before (Ambiguous)
- "Counter Level" - unclear what this represents
- Mixed preventive and corrective in averages
- "Intervention Level" included both preventive and corrective

### After (Clear)
- "Decision Period (n)" or "Yellow Intervention Level (n)"
- Clear that n = time periods since last maintenance
- "Yellow" emphasizes NOT-RED (before failure) state
- Separate preventive (yellow) from corrective (red) actions

---

## Impact on Frontend

### KPI Cards
1. **Probability of Not Being in Red State** - Now correctly shows 1 - P(red)
2. **Maximum Yellow Intervention Level** - Shows n* for preventive maintenance only
3. **Average Intervention Level** - Weighted average of preventive interventions only
4. **Optimal Expected Cost** - Total long-run average cost (unchanged)

### Policy Table
- Only shows yellow/not-red state decisions
- Stops after optimal intervention threshold (n*)
- Column header: "Yellow Intervention Level (n)"
- Helper text: "Decision period since last maintenance"

### Charts
- X-axis: "Yellow Intervention Level (n)"
- Shows when to perform preventive maintenance
- Red dashed line marks n* (optimal intervention point)

---

## Mathematical Justification

The POMDP model has two signal states:
- **s=0**: Not-Red (Yellow) - no failure detected yet
- **s=1**: Red - at least one component has failed

The decision variable `SolutionMat[s, n, a]` represents:
- `s`: Signal state (0=Not-Red, 1=Red)
- `n`: Decision period since last maintenance
- `a`: Action (number of components to replace)

**Key insight:** The frontend should ONLY display yellow/not-red state decisions because:
1. Users want to know WHEN to perform preventive maintenance
2. Corrective maintenance (red state) is mandatory and not a strategic choice
3. Mixing preventive and corrective in averages is meaningless

Therefore:
- Use `SolutionMat[0, n, a≥1]` for preventive intervention calculations
- Ignore `SolutionMat[1, n, :]` for intervention threshold/average calculations
- Only show `s=0` (yellow) rows in the policy table

---

## Testing

To verify correct calculations:

1. **probNotRed should be close to 1.0** for good policies
   - If probNotRed < 0.5, system is failing frequently

2. **maxInterventionLevel should be < U** (truncation point)
   - If maxInterventionLevel = U, policy may be cut off

3. **avgInterventionLevel ≤ maxInterventionLevel**
   - Average should not exceed maximum

4. **optimalPolicy should have exactly one transition** from 0 to 1
   - Policy should show: [0, 0, ..., 0, 1, 1, ...]
   - Transition point is n*

5. **tableRows should stop after first intervention**
   - Table length = maxInterventionLevel + 1

---

## Summary

All calculations now correctly:
✅ Separate preventive (yellow/not-red) from corrective (red) maintenance
✅ Only use s=0 (not-red state) for intervention thresholds
✅ Calculate probNotRed as 1 - P(red state)
✅ Use probability-weighted averages for intervention levels
✅ Provide clean table data with clear terminology
✅ Stop table after optimal intervention threshold

The frontend now displays accurate, meaningful metrics that help users understand:
- **When to perform preventive maintenance** (Yellow Level n*)
- **How reliable the system is** (Probability of not being in red)
- **What the long-run cost is** (Optimal Expected Cost)
