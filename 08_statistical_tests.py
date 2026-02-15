import numpy as np
from scipy import stats

# NEW DATA (n=14, without NEUHOF2)
n = 14
k1, k2 = 2, 5

# Model 1
beta1 = -1.0264
se1 = 2.0706
r2_1 = 0.0201

# Model 2
beta2 = 2.6046
se2 = 1.0037
r2_2 = 0.8778
density_beta = 0.0316
density_se = 0.0426
crown_beta = 0.0007
crown_se = 0.0015
impervious_beta = 0.1184
impervious_se = 0.0167

def t_test(beta, se, n, k):
    t_stat = beta / se
    df = n - k
    p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))
    return t_stat, p_value, df

print("="*60)
print("SIGNIFICANCE TESTS (n=14, without NEUHOF2)")
print("="*60)

# T-TESTS
print("\n1. T-TESTS")

t1, p1, df1 = t_test(beta1, se1, n, k1)
print(f"\nModel 1 - Shannon:")
print(f"  β = {beta1:.4f}, SE = {se1:.4f}")
print(f"  t = {t1:.3f}, p = {p1:.4f}, df = {df1}")
print(f"  Result: {'SIGNIFICANT' if p1 < 0.05 else 'Not significant'}")

t2, p2, df2 = t_test(beta2, se2, n, k2)
print(f"\nModel 2 - Shannon:")
print(f"  β = {beta2:.4f}, SE = {se2:.4f}")
print(f"  t = {t2:.3f}, p = {p2:.4f}, df = {df2}")
print(f"  Result: {'SIGNIFICANT' if p2 < 0.05 else 'Not significant'}")

t_imp, p_imp, _ = t_test(impervious_beta, impervious_se, n, k2)
print(f"\nModel 2 - Impervious:")
print(f"  β = {impervious_beta:.4f}, SE = {impervious_se:.4f}")
print(f"  t = {t_imp:.3f}, p = {p_imp:.6f}")
print(f"  Result: {'HIGHLY SIGNIFICANT' if p_imp < 0.001 else 'Significant' if p_imp < 0.05 else 'Not significant'}")

# CLOGG TEST
print("\n2. CLOGG TEST")
z_stat = (beta1 - beta2) / np.sqrt(se1**2 + se2**2)
p_clogg = 2 * (1 - stats.norm.cdf(abs(z_stat)))
print(f"Shannon: {beta1:.4f} -> {beta2:.4f}")
print(f"Z = {z_stat:.3f}, p = {p_clogg:.4f}")
print(f"Result: {'SIGNIFICANT' if p_clogg < 0.05 else 'Not significant'}")

# F-TEST
print("\n3. F-TEST")
delta_r2 = r2_2 - r2_1
q = k2 - k1
f_stat = (delta_r2 / q) / ((1 - r2_2) / (n - k2))
p_f = 1 - stats.f.cdf(f_stat, q, n - k2)
print(f"R²: {r2_1:.4f} -> {r2_2:.4f}")
print(f"F({q}, {n-k2}) = {f_stat:.2f}, p = {p_f:.6f}")
print(f"Result: {'HIGHLY SIGNIFICANT' if p_f < 0.001 else 'Significant' if p_f < 0.05 else 'Not significant'}")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Diversity alone: NOT significant (p={p1:.3f})")
print(f"Diversity with controls: SIGNIFICANT (p={p2:.3f})")
print(f"Suppression change: NOT significant (p={p_clogg:.3f})")
print(f"Model improvement: HIGHLY SIGNIFICANT (p<{0.001:.3f})")
print(f"Impervious dominates: HIGHLY SIGNIFICANT (p<{0.001:.3f})")