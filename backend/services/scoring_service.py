"""
Scoring service — compute game scores from session telemetry.

Formula (out of 100 pts):

  1. TIME BONUS (40 pts max)
     - Full 40 pts if you finish in the first 30% of the time limit
     - Linear decay to 0 pts if you use the entire time limit
     - 0 pts if time expires (time_elapsed >= time_limit)

  2. ACCURACY BONUS (35 pts max)
     - Measures how closely the player traced the ideal constellation lines
     - 35 pts at 100% accuracy, 0 pts at 0% accuracy

  3. MISTAKE PENALTY (-7 pts each, floored at 0)
     - Each wrong connection deducts 7 pts from the total
     - Cannot drive total below 0

  4. SPEED BONUS (extra 5 pts)
     - Awarded if player finishes in under 40% of the time limit
     - Rewards lightning-fast completion

Score = time_bonus + accuracy_bonus + speed_bonus - mistake_deduction
Score is clamped to [0, 100].
"""

# Component weights
TIME_MAX_PTS      = 40.0   # max points from time
ACCURACY_MAX_PTS  = 35.0   # max points from tracing accuracy
SPEED_BONUS_PTS   = 5.0    # bonus for finishing in under 40% of time limit
MISTAKE_PTS_EACH  = 7.0    # deduction per wrong connection


def compute_score(
    wrong_connections: int,
    total_clicks: int,
    time_elapsed_ms: int,
    wand_travel_dist: float,
    time_limit_sec: int,
    accuracy: float = 100.0,
    completed_connections: int = 0,
    total_connections: int = 0,
) -> float:
    """
    Return a score between 0 and 100.

    Parameters
    ----------
    wrong_connections : number of incorrect node-pair attempts
    total_clicks      : raw click / tap count (not directly scored)
    time_elapsed_ms   : milliseconds taken to complete
    wand_travel_dist  : cumulative pixel distance moved (not directly scored)
    time_limit_sec    : the challenge's allotted time (seconds)
    accuracy          : tracing shape accuracy percentage (0.0 – 100.0)
    completed_connections : number of correct connections drawn
    total_connections : total required connections in the constellation

    Returns
    -------
    float  0 – 100
    """
    if total_connections > 0 and completed_connections == 0:
        return 0.0

    time_sec   = time_elapsed_ms / 1000.0
    time_limit = max(time_limit_sec, 1)

    # 1. Time bonus — linear from TIME_MAX_PTS (instant) to 0 (time limit hit)
    time_ratio  = min(1.0, time_sec / time_limit)   # 0 = instant, 1 = exactly at limit
    time_bonus  = TIME_MAX_PTS * max(0.0, 1.0 - time_ratio)

    # 2. Accuracy bonus — linear from ACCURACY_MAX_PTS (100%) to 0 (0%)
    acc_factor     = max(0.0, min(1.0, accuracy / 100.0))
    accuracy_bonus = ACCURACY_MAX_PTS * acc_factor

    # 3. Speed bonus — for finishing fast (under 40% of time limit)
    speed_bonus = SPEED_BONUS_PTS if time_ratio <= 0.40 else 0.0

    # 4. Mistake deduction — capped so it can't go below 0
    mistake_deduction = wrong_connections * MISTAKE_PTS_EACH

    raw_score = time_bonus + accuracy_bonus + speed_bonus - mistake_deduction
    
    # 5. Apply completion ratio for partial scores
    completion_ratio = 1.0
    if total_connections > 0:
        completion_ratio = max(0.0, min(1.0, completed_connections / total_connections))
        
    score = max(0.0, min(100.0, raw_score)) * completion_ratio

    print(
        f"[SCORE] time={time_sec:.1f}s/{time_limit}s -> time_bonus={time_bonus:.1f} | "
        f"accuracy={accuracy:.1f}% -> acc_bonus={accuracy_bonus:.1f} | "
        f"speed_bonus={speed_bonus} | mistakes={wrong_connections} -> -{mistake_deduction} | "
        f"completion={completed_connections}/{total_connections} ({completion_ratio*100:.1f}%) | "
        f"TOTAL={score:.2f}"
    )

    return round(score, 2)
