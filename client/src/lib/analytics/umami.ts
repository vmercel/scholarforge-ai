type UmamiConfig = {
  endpoint: string;
  websiteId: string;
};

function getUmamiConfig(): UmamiConfig | null {
  const endpoint = (import.meta.env.VITE_ANALYTICS_ENDPOINT ?? "").trim();
  const websiteId = (import.meta.env.VITE_ANALYTICS_WEBSITE_ID ?? "").trim();

  if (!endpoint || !websiteId) return null;

  return { endpoint, websiteId };
}

export function initUmamiAnalytics(): void {
  if (typeof document === "undefined") return;

  const config = getUmamiConfig();
  if (!config) return;

  const normalizedEndpoint = config.endpoint.endsWith("/")
    ? config.endpoint.slice(0, -1)
    : config.endpoint;

  const src = `${normalizedEndpoint}/umami`;

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"][data-website-id="${config.websiteId}"]`
  );
  if (existing) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = src;
  script.dataset.websiteId = config.websiteId;
  document.head.appendChild(script);
}
