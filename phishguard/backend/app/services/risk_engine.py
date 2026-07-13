def compute_risk_score(
    click_rate: float,
    quiz_score: float,
    report_rate: float,
    learning_progress: float,
    prev_score: float
) -> float:
    """
    Computes a weighted risk score between 0 and 100.
    Inputs click_rate, quiz_score, report_rate, and learning_progress are between 0 and 1.
    prev_score is between 0 and 100.
    Returns a float score between 0 and 100, where a higher score means the user is safer.
    """
    return (
        0.30 * (1.0 - click_rate) +
        0.20 * quiz_score +
        0.20 * report_rate +
        0.15 * learning_progress +
        (0.15 * prev_score / 100.0)
    ) * 100.0
