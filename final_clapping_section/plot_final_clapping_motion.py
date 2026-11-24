from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


DATA_DIRECTORY = Path(__file__).resolve().parent
MOTION_FILE = DATA_DIRECTORY / "final_section_motion.csv"
EVENTS_FILE = DATA_DIRECTORY / "final_stage_events.csv"
OUTPUT_FILE = DATA_DIRECTORY / "final_clapping_motion_stage_events.png"


def main():
    motion = pd.read_csv(MOTION_FILE)
    if "index" not in motion.columns:
        raise ValueError(f"Expected an 'index' time column in {MOTION_FILE}")

    timestamps = pd.to_datetime(motion.pop("index"), errors="coerce")
    if timestamps.isna().all():
        raise ValueError(f"Could not parse timestamps in {MOTION_FILE}")

    elapsed_seconds = (timestamps - timestamps.min()).dt.total_seconds()
    participant_columns = motion.columns
    motion = motion.apply(pd.to_numeric, errors="coerce")
    motion["second"] = elapsed_seconds.floordiv(1)

    per_participant_per_second = motion.groupby("second")[participant_columns].mean()
    median = per_participant_per_second.median(axis=1)
    lower_quartile = per_participant_per_second.quantile(0.25, axis=1)
    upper_quartile = per_participant_per_second.quantile(0.75, axis=1)
    participant_count = per_participant_per_second.notna().sum(axis=1)

    events = pd.read_csv(EVENTS_FILE)
    if not {"TIME", "LABEL"}.issubset(events.columns):
        raise ValueError(f"Expected TIME and LABEL columns in {EVENTS_FILE}")

    figure, (motion_axis, count_axis) = plt.subplots(
        2,
        1,
        figsize=(12, 7),
        sharex=True,
        gridspec_kw={"height_ratios": [3, 1]},
    )

    motion_axis.fill_between(
        median.index,
        lower_quartile,
        upper_quartile,
        color="#84b6d9",
        alpha=0.35,
        label="25th–75th percentile across participants",
    )
    motion_axis.plot(
        median.index,
        median,
        color="#176b87",
        linewidth=2,
        label="Median across participants",
    )
    motion_axis.set_ylabel("Normalized motion (dataset units)")
    motion_axis.set_title("Audience clapping motion over time — final section")
    motion_axis.legend(loc="lower left")
    motion_axis.grid(axis="y", alpha=0.25)

    count_axis.plot(
        participant_count.index,
        participant_count,
        color="#777777",
        linewidth=1.5,
    )
    count_axis.set_ylabel("Participants\nwith data")
    count_axis.set_xlabel("Time from start of final section (seconds)")
    count_axis.grid(axis="y", alpha=0.25)

    for event in events.itertuples(index=False):
        event_time = float(event.TIME)
        for axis in (motion_axis, count_axis):
            axis.axvline(
                event_time,
                color="#a87000",
                linestyle="--",
                linewidth=0.9,
                alpha=0.45,
            )
        motion_axis.text(
            event_time,
            0.98,
            str(event.LABEL),
            transform=motion_axis.get_xaxis_transform(),
            rotation=90,
            ha="right",
            va="top",
            fontsize=7,
            bbox={"facecolor": "white", "alpha": 0.65, "edgecolor": "none", "pad": 1},
        )

    figure.tight_layout()
    figure.savefig(OUTPUT_FILE, dpi=180, bbox_inches="tight")
    print(f"Plot saved to: {OUTPUT_FILE}")
    plt.show()


if __name__ == "__main__":
    main()
