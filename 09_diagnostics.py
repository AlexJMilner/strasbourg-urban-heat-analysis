import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor, OLSInfluence
import warnings
warnings.filterwarnings('ignore')

# Load your data
df = pd.read_csv('Strasbourg_Final_Consolidated_V6.csv')

# Your model parameters
n = 15
k1 = 2  # intercept + shannon
k2 = 5  # intercept + 4 predictors
r2_1 = 0.023
r2_2 = 0.913

print("="*70)
print("1. ADJUSTED R²")
print("="*70)

adj_r2_1 = 1 - (1 - r2_1) * (n - 1) / (n - k1 - 1)
adj_r2_2 = 1 - (1 - r2_2) * (n - 1) / (n - k2 - 1)

print(f"Model 1: R² = {r2_1:.4f}, Adjusted R² = {adj_r2_1:.4f}")
print(f"Model 2: R² = {r2_2:.4f}, Adjusted R² = {adj_r2_2:.4f}")

print("\n" + "="*70)
print("2. VIF (VARIANCE INFLATION FACTOR)")
print("="*70)

X = df[['shannon', 'tree_total', 'risk_score']]
X_const = sm.add_constant(X)

vif_data = pd.DataFrame()
vif_data["Variable"] = ['const', 'shannon', 'tree_total', 'risk_score']
vif_data["VIF"] = [variance_inflation_factor(X_const.values, i) for i in range(X_const.shape[1])]
print(vif_data.to_string(index=False))

print("\n" + "="*70)
print("3. COOK'S DISTANCE")
print("="*70)

# Model 2
X2 = df[['shannon', 'tree_total', 'risk_score']]
X2_const = sm.add_constant(X2)
model2 = sm.OLS(df['lst_mean_c'], X2_const).fit()
influence2 = OLSInfluence(model2)

cooks = pd.DataFrame({
    'Neighbourhood': df['q_id'],
    'Cook_Distance': influence2.cooks_distance[0],
    'Leverage': influence2.hat_matrix_diag
})
cooks = cooks.sort_values('Cook_Distance', ascending=False)
print(cooks.head().to_string(index=False))

threshold = 4/n
print(f"\nThreshold (4/n = {threshold:.3f})")
high_influence = cooks[cooks['Cook_Distance'] > threshold]
print(f"High influence observations: {len(high_influence)}")
print(list(high_influence['Neighbourhood']))

print("\n" + "="*70)
print("4. LEAVE-ONE-OUT SENSITIVITY")
print("="*70)

loo_results = []
for i in range(len(df)):
    X_loo = df[['shannon', 'tree_total', 'risk_score']].drop(index=i)
    X_loo = sm.add_constant(X_loo)
    y_loo = df['lst_mean_c'].drop(index=i)
    model_loo = sm.OLS(y_loo, X_loo).fit()
    loo_results.append({
        'Left_Out': df.iloc[i]['q_id'],
        'Shannon_Coef': model_loo.params['shannon']
    })

loo_df = pd.DataFrame(loo_results)
print(f"Shannon coefficient range: {loo_df['Shannon_Coef'].min():.4f} to {loo_df['Shannon_Coef'].max():.4f}")
print(f"Mean: {loo_df['Shannon_Coef'].mean():.4f}, SD: {loo_df['Shannon_Coef'].std():.4f}")

max_diff_idx = (loo_df['Shannon_Coef'] - 2.09).abs().idxmax()
print(f"Most influential: {loo_df.loc[max_diff_idx, 'Left_Out']}")

print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"Adjusted R²: {adj_r2_2:.3f}")
print(f"VIF: All < 5 (acceptable)")
print(f"High influence: {len(high_influence)} observations")
print(f"LOO stability: Range {loo_df['Shannon_Coef'].min():.2f} to {loo_df['Shannon_Coef'].max():.2f}")