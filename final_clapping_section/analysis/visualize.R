library(tidyverse)
library(lubridate)

data_dir <- "final_clapping_section"
out_dir <- file.path(data_dir, "analysis")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

stats <- read_csv(file.path(data_dir, "final_section_stats.csv"), show_col_types = FALSE) %>%
  rename(participant = index) %>%
  mutate(
    start_seconds = period_to_seconds(hms(start_time)),
    end_seconds = period_to_seconds(hms(end_time)),
    clap_rate_per_minute = 60 / median_interclap_interval
  )

events <- read_csv(file.path(data_dir, "final_stage_events.csv"), show_col_types = FALSE) %>%
  rename(time_seconds = TIME, label = LABEL) %>%
  mutate(label = str_trim(label))

elapsed_seconds <- function(x) {
  as.numeric(as.POSIXct(x, format = "%Y-%m-%d %H:%M:%OS", tz = "UTC"))
}

trimmed <- read_csv(
  file.path(data_dir, "final_section_trimmed.csv"),
  col_types = cols(index = col_character(), .default = col_guess()),
  show_col_types = FALSE
) %>%
  mutate(time_seconds = elapsed_seconds(index))

participant_order <- stats %>%
  arrange(is.na(start_seconds), start_seconds, participant) %>%
  mutate(participant_rank = row_number()) %>%
  select(participant, participant_rank)

motion_long <- trimmed %>%
  pivot_longer(-c(index, time_seconds), names_to = "participant", values_to = "motion") %>%
  left_join(participant_order, by = "participant")

time_summary <- motion_long %>%
  group_by(time_seconds) %>%
  summarise(
    n_active = sum(!is.na(motion)),
    median_motion = if (n_active > 0) median(motion, na.rm = TRUE) else NA_real_,
    q25 = if (n_active > 0) quantile(motion, 0.25, na.rm = TRUE) else NA_real_,
    q75 = if (n_active > 0) quantile(motion, 0.75, na.rm = TRUE) else NA_real_,
    .groups = "drop"
  )

valid_stats <- stats %>% filter(!is.na(duration))

metrics <- tibble(
  metric = c(
    "Clapping duration (seconds)",
    "Median interclap interval (seconds)",
    "Median interclap rate (claps/minute)",
    "Average RMS during clapping",
    "Average RMS entire concert"
  ),
  values = list(
    valid_stats$duration,
    valid_stats$median_interclap_interval,
    valid_stats$clap_rate_per_minute,
    valid_stats$avr_rms,
    stats$avr_rms_entire
  )
) %>%
  mutate(
    n = map_int(values, ~sum(is.finite(.x))),
    mean = map_dbl(values, ~mean(.x, na.rm = TRUE)),
    median = map_dbl(values, ~median(.x, na.rm = TRUE)),
    sd = map_dbl(values, ~sd(.x, na.rm = TRUE)),
    q1 = map_dbl(values, ~quantile(.x, 0.25, na.rm = TRUE)),
    q3 = map_dbl(values, ~quantile(.x, 0.75, na.rm = TRUE)),
    min = map_dbl(values, ~min(.x, na.rm = TRUE)),
    max = map_dbl(values, ~max(.x, na.rm = TRUE))
  ) %>%
  select(-values)

write_csv(metrics, file.path(out_dir, "summary_statistics.csv"))
write_csv(stats, file.path(out_dir, "participant_statistics.csv"))
write_csv(time_summary, file.path(out_dir, "ensemble_activity_by_time.csv"))

theme_report <- theme_minimal(base_size = 11) +
  theme(
    panel.grid.minor = element_blank(),
    plot.title = element_text(face = "bold"),
    plot.caption = element_text(hjust = 0),
    text = element_text(color = "#222222"),
    axis.text = element_text(color = "#333333"),
    plot.background = element_rect(fill = "white", color = NA),
    panel.background = element_rect(fill = "white", color = NA),
    legend.background = element_rect(fill = "white", color = NA)
  )

event_lines <- geom_vline(
  data = events,
  aes(xintercept = time_seconds),
  color = "#c0392b",
  alpha = 0.65,
  linewidth = 0.35
)

motion_limits <- quantile(motion_long$motion, c(0.01, 0.99), na.rm = TRUE)

p_heatmap <- ggplot(motion_long, aes(x = time_seconds, y = participant_rank, fill = motion)) +
  geom_raster() +
  event_lines +
  scale_fill_viridis_c(
    option = "C",
    na.value = "grey95",
    name = "Motion\n(normalized)",
    limits = motion_limits,
    oob = scales::squish
  ) +
  scale_x_continuous(breaks = seq(0, 120, 10), expand = c(0, 0)) +
  scale_y_reverse(expand = c(0, 0)) +
  labs(
    title = "Clapping activity across participants",
    subtitle = "Trimmed accelerometer signals; participants ordered by clapping start time",
    x = "Time in audio interval (seconds)",
    y = "Participant (ordered)",
    caption = "Red lines mark stage-event times. Color scale is clipped at the 1st/99th percentiles; alignment is estimated at approximately 100 ms."
  ) +
  theme_report
ggsave(file.path(out_dir, "figure_participant_timeline.png"), p_heatmap, width = 12, height = 8, dpi = 220)

p_ensemble <- ggplot(time_summary, aes(x = time_seconds, y = median_motion)) +
  geom_ribbon(aes(ymin = q25, ymax = q75), fill = "#4c78a8", alpha = 0.22, na.rm = TRUE) +
  geom_line(color = "#1f4e79", linewidth = 0.65, na.rm = TRUE) +
  event_lines +
  geom_text(
    data = events,
    aes(x = time_seconds, y = Inf, label = label),
    angle = 90,
    vjust = 1.15,
    hjust = 1,
    size = 2.7,
    color = "#922b21",
    check_overlap = TRUE,
    inherit.aes = FALSE
  ) +
  scale_x_continuous(breaks = seq(0, 120, 10), expand = c(0, 0)) +
  labs(
    title = "Median participant motion through the applause",
    subtitle = "Across-participant median and interquartile range at each time point",
    x = "Time in audio interval (seconds)",
    y = "Median-normalized motion",
    caption = "Only non-missing trimmed observations contribute at each time. Red markers/labels are stage events."
  ) +
  theme_report +
  theme(plot.margin = margin(18, 12, 8, 8))
ggsave(file.path(out_dir, "figure_ensemble_activity.png"), p_ensemble, width = 12, height = 6.5, dpi = 220)

p_duration <- ggplot(valid_stats, aes(x = duration)) +
  geom_histogram(binwidth = 5, boundary = 0, fill = "#4c78a8", color = "white") +
  geom_vline(xintercept = median(valid_stats$duration), linetype = "dashed", color = "#c0392b") +
  labs(
    title = "Participant clapping durations",
    subtitle = paste0("n = ", nrow(valid_stats), "; dashed line is median = ",
                      round(median(valid_stats$duration), 1), " seconds"),
    x = "Duration (seconds)",
    y = "Participants"
  ) +
  theme_report
ggsave(file.path(out_dir, "figure_duration_distribution.png"), p_duration, width = 8, height = 5, dpi = 220)

p_interval <- ggplot(valid_stats, aes(x = median_interclap_interval)) +
  geom_histogram(binwidth = 0.025, boundary = 0, fill = "#59a14f", color = "white") +
  geom_vline(xintercept = median(valid_stats$median_interclap_interval), linetype = "dashed", color = "#c0392b") +
  labs(
    title = "Participant median interclap intervals",
    subtitle = paste0(
      "n = ", sum(!is.na(valid_stats$median_interclap_interval)),
      "; dashed line is median = ",
      round(median(valid_stats$median_interclap_interval, na.rm = TRUE), 2), " seconds"
    ),
    x = "Median interval between detected claps (seconds)",
    y = "Participants"
  ) +
  theme_report
ggsave(file.path(out_dir, "figure_interclap_intervals.png"), p_interval, width = 8, height = 5, dpi = 220)

p_scatter <- ggplot(
  valid_stats,
  aes(x = median_interclap_interval, y = avr_rms, color = duration)
) +
  geom_point(size = 2.6, alpha = 0.85) +
  geom_smooth(method = "lm", formula = y ~ x, se = TRUE, color = "grey30", linewidth = 0.7) +
  scale_color_viridis_c(name = "Duration\n(seconds)") +
  labs(
    title = "Clap regularity and motion level",
    subtitle = "Exploratory participant-level association",
    x = "Median interclap interval (seconds)",
    y = "Average RMS during clapping",
    caption = "RMS and intervals are computed from the supplied accelerometer-derived measures."
  ) +
  theme_report
ggsave(file.path(out_dir, "figure_interval_vs_rms.png"), p_scatter, width = 8, height = 6, dpi = 220)
