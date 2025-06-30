import posthog from "posthog-js";

export function usePostHog() {
  posthog.init("phc_smQR7Y5on881N1bV39mLYFtVTg0t2MwDIgKk3FAYxeE", {
    api_host: "https://eu.i.posthog.com",
    defaults: "2025-05-24",
    persistence: "localStorage",
    person_profiles: "always",
    session_recording: {
      maskAllInputs: true,
    },
  });

  return { posthog };
}
