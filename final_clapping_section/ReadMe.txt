03.01.2022
Emin

4 csv files that contain resampled (50 Hz), vector-normed and median-normalized accelerometer data for each participant during the final clapping section.
Extended by 7 seconds at both ends. Note: Due to difficult recording conditions, the temporal alignment of accelerometer measurements between participants is estimated to be around 100 ms on average or 5 samples. 

final_section_motion.csv
	Contains motion data for each participant.

final_section_trimmed.csv
	The trimmed version of the "final_section_motion.csv".
	For every participant, motionless time slots from both ends are filled with NaNs.

final_section_peaks.csv
	Contains times and heights of selected peaks for every participant.

final_section_stats.csv
	Contains some statistical information for the final clapping section.
	start_time                : Starting time of individual clapping.
	end_time                  : Ending time of individual clapping.
	duration                  : Duration of individual clapping in seconds.
	avr_rms_entire            : Average root mean square of the motion signal during the entire concert. (window size: 50, scrolling: 50)
	avr_rms                   : Average root mean square of the individual clapping motion. (window size: 50, scrolling: 50)
	mean                      : Mean of the motion individual clapping motion data.
	median 		          : Median of the motion individual clapping motion data.
	std                       : Standart deviation of the individual clapping motion data.
	median_interclap_interval : Median of distances between signal peaks.

***

Added 27.01.2022 by Finn

final_clapping.mp3
	Audio file from stereo mics in the concert hall during the interval corresponse to the accelerometer measurements. Note: Audio includes claps from non-participant audience members.

final_stage_events.csv
	Contains timing (in seconds) and label for stage events during the applause interval. Timing corresponses to audio file and clapping events to within half a second.