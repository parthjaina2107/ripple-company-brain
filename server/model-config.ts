export type ModelProvider = "gemini" | "openai" | "offline";

export class ModelError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
    this.name = "ModelError";
  }
}

export function getModelConfig(env: NodeJS.ProcessEnv = process.env) {
  const provider =
    env.AI_PROVIDER?.trim() ||
    (env.GEMINI_API_KEY?.trim()
      ? "gemini"
      : env.OPENAI_API_KEY?.trim()
        ? "openai"
        : "offline");
  if (!["gemini", "openai", "offline"].includes(provider)) {
    throw new ModelError("AI_PROVIDER must be gemini, openai, or offline.");
  }
  const model =
    provider === "gemini"
      ? env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite"
      : provider === "openai"
        ? env.OPENAI_MODEL?.trim() || "gpt-6.1-sol"
        : null;
  const configured =
    provider === "gemini"
      ? Boolean(env.GEMINI_API_KEY?.trim())
      : provider === "openai"
        ? Boolean(env.OPENAI_API_KEY?.trim())
        : false;
  return { provider: provider as ModelProvider, model, configured };
}

export function modelLabel() {
  const config = getModelConfig();
  return config.configured
    ? `${config.provider === "gemini" ? "Gemini" : "OpenAI"} · ${config.model}`
    : null;
}

export async function withModelErrors<T>(work: () => Promise<T>): Promise<T> {
  const config = getModelConfig();
  if (!config.configured)
    throw new ModelError(
      `The selected ${config.provider} provider has no API key configured.`,
    );
  try {
    return await work();
  } catch (error) {
    if (error instanceof ModelError) throw error;
    const status = (error as { status?: number })?.status;
    const provider = config.provider === "gemini" ? "Gemini" : "OpenAI";
    if (status === 429)
      throw new ModelError(
        `${provider} quota or rate limit reached. Check the API project's available quota and retry.`,
        429,
      );
    if (status === 401 || status === 403)
      throw new ModelError(
        `${provider} rejected API access. Check the API key and project permissions.`,
      );
    if (status === 404)
      throw new ModelError(
        `The configured ${provider} model is not available to this API project.`,
      );
    if (status === 503)
      throw new ModelError(
        `${provider} is temporarily unavailable or experiencing high demand. Retry later; no provider fallback was used.`,
      );
    // Raw provider exceptions can contain request metadata. Never forward them to the browser.
    throw new ModelError(
      `${provider} could not complete this request. Check the connection and retry. No provider fallback was used.`,
    );
  }
}
