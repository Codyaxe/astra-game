"""
Scoring service — compute game scores from session telemetry.

Score = f(wrong_connections, total_clicks, time_elapsed, wand_travel_distance)

The formula is designed so that:
  - Fewer mistakes  → higher score
  - Less time       → higher score
  - Less wand travel → higher score (efficient movement)
  - Fewer clicks    → higher score

This multi-variable approach avoids tie-breaking issues.
"""


# Tunable weights (sum to 1.0)
W_MISTAKES    = 0.35
W_TIME        = 0.30
W_WAND_DIST   = 0.20
W_CLICKS      = 0.15

# Normalisers — max expected values (used to scale 0-1)
MAX_WRONG_CONNECTIONS = 20
MAX_TIME_SEC          = 60
MAX_WAND_DISTANCE     = 5000.0   # arbitrary pixel-distance units
MAX_CLICKS            = 40


def compute_score(
    wrong_connections: int,
    total_clicks: int,
    time_elapsed_ms: int,
    wand_travel_dist: float,
    time_limit_sec: int,
) -> float:
    """
    Return a score between 0 and 100.

    Parameters
    ----------
    wrong_connections : number of incorrect node-pair attempts
    total_clicks      : raw click / tap count
    time_elapsed_ms   : milliseconds taken to complete
    wand_travel_dist  : cumulative pixel distance the wand pointer moved
    time_limit_sec    : the time limit for this challenge

    Returns
    -------
    float  0 – 100
    """
    time_sec = time_elapsed_ms / 1000.0

    # Each factor is 1.0 when perfect, 0.0 when worst
    f_mistakes = max(0.0, 1.0 - wrong_connections / MAX_WRONG_CONNECTIONS)
    f_time     = max(0.0, 1.0 - time_sec / max(time_limit_sec, MAX_TIME_SEC))
    f_wand     = max(0.0, 1.0 - wand_travel_dist / MAX_WAND_DISTANCE)
    f_clicks   = max(0.0, 1.0 - total_clicks / MAX_CLICKS)

    raw = (
        W_MISTAKES  * f_mistakes
        + W_TIME    * f_time
        + W_WAND_DIST * f_wand
        + W_CLICKS  * f_clicks
    )

    return round(raw * 100, 2)
