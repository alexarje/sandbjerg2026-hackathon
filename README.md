# Sandbjerg hackathon data

This repository contains accelerometer data, audio, and stage-event annotations for the final clapping section of a concert. It is shared for the Sandbjerg hackathon.

## Files

All data are in [final_clapping_section](final_clapping_section/). The original descriptions are in [ReadMe.txt](final_clapping_section/ReadMe.txt).

- [final_section_motion.csv](final_clapping_section/final_section_motion.csv): resampled, vector-normed, and median-normalised accelerometer data, with one column per participant.
- [final_section_trimmed.csv](final_clapping_section/final_section_trimmed.csv): the same motion data with motionless periods at either end of each participant's clapping replaced by missing values.
- [final_section_peaks.csv](final_clapping_section/final_section_peaks.csv): selected peak heights for each participant, indexed by time.
- [final_section_stats.csv](final_clapping_section/final_section_stats.csv): one row per participant, with clapping start and end times, duration, RMS measures, summary statistics, and median interclap interval.
- [final_stage_events.csv](final_clapping_section/final_stage_events.csv): event times in seconds and labels for activity on stage.
- [final_clapping.mp3](final_clapping_section/final_clapping.mp3): stereo audio from the concert hall, including claps from audience members who were not participants.

## Timing and interpretation

The accelerometer data were resampled at 50 Hz. The supplied notes describe the section as extended by 7 seconds at each end. Alignment between participants is estimated to be accurate to around 100 ms on average, or 5 samples.

The `index` column in the motion and trimmed files uses timestamps formatted with a 1970 date; the peaks file uses elapsed-time strings. Treat these as time indices, not evidence that the concert took place in 1970. Empty cells in the motion and trimmed files indicate missing values, not zero motion. The peaks file records selected peaks; an empty cell does not denote a peak. The event times correspond to the audio and clapping events to within half a second, according to the supplied notes.

The statistics file uses participant identifiers as its `index`. The RMS measures use a window size and step of 50 samples. The original notes give further definitions of the statistics.

## Reuse

The recording provenance, licence, and conditions for reuse are not specified in the supplied files. Check these with the data owner before sharing or reusing the material beyond the hackathon.