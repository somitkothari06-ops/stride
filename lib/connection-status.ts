export type Providers = {
  nebius: boolean;
  tavily: boolean;
  model: string | null;
  nebiusVerifiedAt?: string | null;
  nebiusLastFailureAt?: string | null;
};

export function nebiusPresentation(provider: Providers) {
  if (!provider.nebius)
    return {
      label: "Not connected",
      shortLabel: "Local guidance",
      description:
        "Built-in guidance is available. Live AI assistance is not connected yet.",
    };
  if (!provider.nebiusVerifiedAt)
    return {
      label: "Configured",
      shortLabel: "AI configured",
      description:
        "The server is configured. A successful live response will confirm the connection.",
    };
  const timestamp = new Date(provider.nebiusVerifiedAt).toLocaleString("en-IN");
  const failedSince =
    provider.nebiusLastFailureAt &&
    provider.nebiusLastFailureAt > provider.nebiusVerifiedAt;
  return {
    label: failedSince ? "Check connection" : "Verified live",
    shortLabel: failedSince ? "AI needs attention" : "AI connected",
    description: `Last successful live response: ${timestamp}.${failedSince ? " A later request failed; your saved work is safe. Try again shortly." : " Live NVIDIA assistance is available."}`,
  };
}
