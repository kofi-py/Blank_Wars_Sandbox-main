#!/bin/bash
# Fix over-aggressive snake_case conversions that created invalid variable names

cd "$(dirname "$0")/frontend/src"

# Fix max_a_p -> max_ap (already done manually, but ensuring)
# Fix requires_lo_s -> requires_los
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/requires_lo_s_to_origin/requiresLOSToOrigin/g' {} +

# Fix require_c_s_r_f -> requireCSRF
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/require_c_s_r_f/requireCSRF/g' {} +

# Fix _t_h_e_r_a_p_i_s_t__s_t_y_l_e_s -> this.therapist_styles
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/_t_h_e_r_a_p_i_s_t__s_t_y_l_e_s/this.therapist_styles/g' {} +

echo "Fixed over-converted snake_case variables"
