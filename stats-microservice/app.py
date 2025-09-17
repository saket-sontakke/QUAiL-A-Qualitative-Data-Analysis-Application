import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from scipy import stats
from waitress import serve
from dotenv import load_dotenv
import math
import json

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
CORS(app)

class NaNEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle NaN values"""
    def encode(self, obj):
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return 'null'
        return super().encode(obj)

    def iterencode(self, obj, _one_shot=False):
        """Encode the given object and yield each string representation as available."""
        if isinstance(obj, dict):
            yield '{'
            first = True
            for key, value in obj.items():
                if not first:
                    yield ', '
                first = False
                yield json.dumps(str(key))
                yield ': '
                if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                    yield 'null'
                else:
                    yield from self.iterencode(value, True)
            yield '}'
        elif isinstance(obj, list):
            yield '['
            first = True
            for value in obj:
                if not first:
                    yield ', '
                first = False
                if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                    yield 'null'
                else:
                    yield from self.iterencode(value, True)
            yield ']'
        elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            yield 'null'
        else:
            yield json.dumps(obj)

# --- HELPER FUNCTION ---
def get_interpretation(p_value, subtype, positive_conclusion, negative_conclusion, test_notes=""):
    """Generates a contextual interpretation based on the p-value."""
    if p_value < 0.05:
        return (f"The result is statistically significant (p < 0.05). "
                f"Therefore, we reject the null hypothesis. {positive_conclusion} {test_notes}")
    else:
        return (f"The result is not statistically significant (p >= 0.05). "
                f"Therefore, we fail to reject the null hypothesis. {negative_conclusion} {test_notes}")

def safe_float_conversion(value):
    """Safely convert a value to float, handling NaN and infinity cases"""
    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(value)
    return value

def calculate_cramers_v(chi2, n, table):
    """Calculates Cramér's V for a contingency table."""
    if chi2 is None or n == 0:
        return None
    
    rows, cols = table.shape
    
    phi2 = chi2 / n
    
    min_dim = min(rows - 1, cols - 1)
    
    if min_dim == 0:
        return 0.0
        
    return math.sqrt(phi2 / min_dim)

def run_chi_square_goodness_of_fit(data):
    """
    Performs the Chi-Square Goodness-of-Fit Test.
    """
    try:
        observed = np.array(data.get('observed', []), dtype=float)
        distribution = data.get('distribution', {})
        codes = data.get('codes', [])
        category_labels = data.get('categoryLabels', [])
        
        if len(observed) == 0:
            raise ValueError("No observed data provided")
        
        total_observed = np.sum(observed)
        
        if total_observed == 0:
            raise ValueError("Total observed count is zero")
        
        if distribution.get('type') == 'uniform':
            expected = np.full_like(observed, total_observed / len(observed), dtype=float)
            dist_text = "uniform"
        elif distribution.get('type') == 'custom':
            proportions_dict = distribution.get('proportions', {})
            proportions = np.array([float(proportions_dict.get(str(code_id), 0)) / 100.0 for code_id in codes])
            expected = total_observed * proportions
            dist_text = "specified custom"
        else:
            raise ValueError("Invalid distribution type specified.")

        categories_text = ", ".join(f"'{label}'" for label in category_labels)
        null_hypothesis = f"The observed frequencies of the categories ({categories_text}) match the expected {dist_text} distribution."
        alternative_hypothesis = f"The observed frequencies of the categories ({categories_text}) do not match the expected {dist_text} distribution."

        chi2, p = stats.chisquare(f_obs=observed, f_exp=expected)
        
        gof_positive = f"The frequencies of your categories ({categories_text}) are significantly different from the expected {dist_text} distribution."
        gof_negative = f"There is no statistical evidence that the frequencies of your categories ({categories_text}) differ from the expected {dist_text} distribution."
        
        test_notes = ""
        if np.any(expected < 5):
            test_notes = "Note: At least one category had an expected frequency below 5, which can reduce the accuracy of this test."

        interpretation = get_interpretation(p, "Goodness-of-Fit", gof_positive, gof_negative, test_notes)
        
        return {
            "test": "Chi-Square Test",
            "subtype": "Goodness-of-Fit",
            "statistic": safe_float_conversion(chi2),
            "pValue": safe_float_conversion(p),
            "df": len(observed) - 1,
            "sampleSize": int(total_observed),
            "observedCounts": observed.tolist(),
            "expectedCounts": expected.tolist(),
            "categoryLabels": category_labels,
            "nullHypothesis": null_hypothesis,
            "alternativeHypothesis": alternative_hypothesis,
            "interpretation": interpretation,
        }
    except Exception as e:
        app.logger.error(f"Error in goodness-of-fit test: {e}")
        raise

def run_chi_square_independence(data):
    """
    Performs Chi-Square Test of Independence.
    """
    try:
        observed_list = data.get('observed', [])
        row_labels = data.get('rowLabels', [])
        col_labels = data.get('colLabels', [])

        observed = np.array(observed_list, dtype=float)
        
        if observed.size == 0:
            raise ValueError("No observed data provided")
            
        if np.sum(observed) == 0:
            raise ValueError("All observed values are zero")

        if observed.ndim != 2:
            raise ValueError("Observed data must be a 2D contingency table")
        
        chi2, p, df, expected = stats.chi2_contingency(observed)

        n = np.sum(observed)
        cramers_v = calculate_cramers_v(chi2, n, observed)

        var1_name = "Codes"
        var2_name = "Documents"
        null_hypothesis = f"There is no association between the variables '{var1_name}' and '{var2_name}'."
        alternative_hypothesis = f"There is a significant association between the variables '{var1_name}' and '{var2_name}'."
        positive_conclusion = f"The analysis suggests a significant association exists between your selected codes and documents."
        negative_conclusion = f"There is no statistical evidence of an association between your selected codes and documents."
        
        test_notes = ""
        if np.any(expected < 5):
            test_notes = "Note: The accuracy of this test may be reduced because one or more cells had an expected frequency below 5."

        interpretation = get_interpretation(p, "independence", positive_conclusion, negative_conclusion, test_notes)

        return {
            "test": "Chi-Square Test",
            "subtype": "Independence",
            "statistic": safe_float_conversion(chi2),
            "pValue": safe_float_conversion(p),
            "df": int(df),
            "cramersV": safe_float_conversion(cramers_v),
            "sampleSize": int(np.sum(observed)),
            "observedTable": observed.tolist(),
            "expectedTable": expected.tolist(),
            "rowLabels": row_labels,
            "colLabels": col_labels,
            "nullHypothesis": null_hypothesis,
            "alternativeHypothesis": alternative_hypothesis,
            "interpretation": interpretation,
        }
    except Exception as e:
        app.logger.error(f"Error in independence test: {e}")
        raise

def run_chi_square_homogeneity(data):
    """
    Performs Chi-Square Test of Homogeneity.
    """
    try:
        observed_list = data.get('observed', [])
        row_labels = data.get('rowLabels', [])
        col_labels = data.get('colLabels', [])

        observed = np.array(observed_list, dtype=float)
        
        if observed.size == 0:
            raise ValueError("No observed data provided")
            
        if np.sum(observed) == 0:
            raise ValueError("All observed values are zero")

        if observed.ndim != 2:
            raise ValueError("Observed data must be a 2D contingency table")
        
        chi2, p, df, expected = stats.chi2_contingency(observed)

        n = np.sum(observed)
        cramers_v = calculate_cramers_v(chi2, n, observed)

        group_name = ", ".join(f"'{name}'" for name in col_labels)
        unique_vars = sorted(list(set(label.split(':')[0] for label in row_labels)))
        var_name = ", ".join(f"'{v}'" for v in unique_vars)
        codes_label = f"code{'s' if len(unique_vars) > 1 else ''}"

        null_hypothesis = f"The distribution of the {codes_label} ({var_name}) is the same across all groups ({group_name})."
        alternative_hypothesis = f"The distribution of the {codes_label} ({var_name}) is different for at least one group in ({group_name})."
        
        positive_conclusion = f"The analysis suggests that the frequency distribution of codes is significantly different across the defined groups."
        negative_conclusion = f"There is no statistical evidence that the frequency distribution of codes differs across the defined groups."
        
        test_notes = ""
        if np.any(expected < 5):
            test_notes = "Note: The accuracy of this test may be reduced because one or more cells had an expected frequency below 5."

        interpretation = get_interpretation(p, "homogeneity", positive_conclusion, negative_conclusion, test_notes)

        return {
            "test": "Chi-Square Test",
            "subtype": "Homogeneity",
            "statistic": safe_float_conversion(chi2),
            "pValue": safe_float_conversion(p),
            "df": int(df),
            "cramersV": safe_float_conversion(cramers_v),
            "sampleSize": int(np.sum(observed)),
            "observedTable": observed.tolist(),
            "expectedTable": expected.tolist(),
            "rowLabels": row_labels,
            "colLabels": col_labels,
            "nullHypothesis": null_hypothesis,
            "alternativeHypothesis": alternative_hypothesis,
            "interpretation": interpretation,
        }
    except Exception as e:
        app.logger.error(f"Error in homogeneity test: {e}")
        raise

def run_fishers_exact_test(data):
    """
    Performs Fisher's Exact Test for 2x2 contingency tables.
    """
    try:
        observed_list = data.get('observed', [])
        row_labels = data.get('rowLabels', [])
        col_labels = data.get('colLabels', [])
        
        observed = np.array(observed_list, dtype=float)

        if observed.shape != (2, 2):
            raise ValueError("Fisher's Exact Test is only applicable to 2x2 tables.")
        
        row_sums = np.sum(observed, axis=1)
        col_sums = np.sum(observed, axis=0)
        
        if np.any(row_sums == 0) or np.any(col_sums == 0):
            app.logger.warning("One or more rows/columns have zero totals. Odds ratio will be undefined.")
            odds_ratio = None
            p_value = 1.0 
            
            test_notes = "Note: The odds ratio cannot be calculated because one or more groups have zero observations."
        else:
            odds_ratio, p_value = stats.fisher_exact(observed)
            test_notes = ""
            
            if math.isnan(odds_ratio) or math.isinf(odds_ratio):
                app.logger.warning(f"Odds ratio calculation resulted in {odds_ratio}. Setting to None.")
                odds_ratio = None
                test_notes = "Note: The odds ratio cannot be reliably calculated for this data configuration."

        var1_name = "Variable 1"
        var2_name = "Variable 2"
        null_hypothesis = f"There is no association between '{var1_name}' ({row_labels[0]} vs {row_labels[1]}) and '{var2_name}' ({col_labels[0]} vs {col_labels[1]})."
        alternative_hypothesis = f"There is a non-random association between the two variables."

        positive_conclusion = "The analysis reveals a significant association between the variables."
        negative_conclusion = "There is no statistical evidence of an association between the variables."

        interpretation = get_interpretation(p_value, "fisher", positive_conclusion, negative_conclusion, test_notes)

        return {
            "test": "Fisher's Exact Test",
            "subtype": "Contingency",
            "statistic": safe_float_conversion(odds_ratio),
            "statisticLabel": "Odds Ratio",
            "pValue": safe_float_conversion(p_value),
            "df": "N/A",
            "sampleSize": int(np.sum(observed)),
            "observedTable": observed.tolist(),
            "rowLabels": row_labels,
            "colLabels": col_labels,
            "nullHypothesis": null_hypothesis,
            "alternativeHypothesis": alternative_hypothesis,
            "interpretation": interpretation,
        }
    except Exception as e:
        app.logger.error(f"Error in Fisher's exact test: {e}")
        raise

@app.route('/', methods=['POST'])
def handle_test_request():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid JSON payload"}), 400

        test_type = data.get('testType')
        subtype = data.get('subtype')

        app.logger.info(f"Received request - test_type: {test_type}, subtype: {subtype}")

        if test_type == 'chi-square':
            if subtype == 'goodness-of-fit':
                result = run_chi_square_goodness_of_fit(data)
            elif subtype == 'independence':
                result = run_chi_square_independence(data)
            elif subtype == 'homogeneity':
                result = run_chi_square_homogeneity(data)
            elif subtype == 'fishers-exact':
                result = run_fishers_exact_test(data)
            else:
                return jsonify({"message": f"Invalid Chi-Square subtype: {subtype}"}), 400
        else:
             return jsonify({"message": f"Unsupported test type: {test_type}"}), 400
        
        response_json = json.dumps(result, cls=NaNEncoder)
        
        parsed_result = json.loads(response_json)
        
        return jsonify(parsed_result)
            
    except ValueError as e:
        app.logger.error(f"Validation error: {e}")
        return jsonify({"message": f"Validation error: {str(e)}"}), 400
    except Exception as e:
        app.logger.error(f"An unexpected error occurred: {e}", exc_info=True)
        return jsonify({"message": f"An internal error occurred: {str(e)}"}), 500

# development
if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"Starting Python analysis server in DEBUG MODE on http://{host}:{port} ...")
    app.run(host=host, port=port, debug=True)

# production
# if __name__ == '__main__':
#     host = os.getenv('FLASK_HOST', '127.0.0.1')
#     port = int(os.getenv('FLASK_PORT', 5001))
#     print(f"Python analysis server starting on http://{host}:{port} ...")
#     serve(app, host=host, port=port)
