import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? ENV.forgeApiUrl.trim()
    : "https://api.openai.com/v1/chat/completions";

const resolveChatCompletionsUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/$/, "");
  if (trimmed.endsWith("/v1/chat/completions")) return trimmed;
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
};

const resolveProvider = (url: string): "openai" | "manus_forge" | "custom" => {
  try {
    const host = new URL(url).host.toLowerCase();
    if (host.includes("api.openai.com")) return "openai";
    if (host.includes("forge.manus.im")) return "manus_forge";
    return "custom";
  } catch {
    return "custom";
  }
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }
};

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const getNumberEnv = (raw: string, fallback: number) => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

function getDefaultModel(provider: ReturnType<typeof resolveProvider>) {
  if (ENV.forgeModel && ENV.forgeModel.trim().length > 0) return ENV.forgeModel.trim();
  if (provider === "manus_forge") return "gemini-2.5-flash";
  return "gpt-4o-mini";
}

function getMaxTokens(provider: ReturnType<typeof resolveProvider>) {
  const configured = getNumberEnv(ENV.llmMaxTokens, 0);
  if (configured) return configured;
  return provider === "manus_forge" ? 32768 : 4096;
}

function shouldUseMockMode(): boolean {
  const mode = (ENV.llmMode ?? "").trim().toLowerCase();
  return mode === "mock" || mode === "fake" || mode === "offline";
}

function mockJsonForSchema(schemaName: string) {
  if (schemaName === "novelty_assessment") {
    return { score: 0.65, classification: "moderate", reasoning: "Mocked assessment (LLM_MODE=mock)." };
  }
  if (schemaName === "quality_assessment") {
    return { score: 80, feedback: "Mocked review (LLM_MODE=mock)." };
  }
  return { ok: true };
}

function makeMockResult(content: string): InvokeResult {
  return {
    id: "mock",
    created: Math.floor(Date.now() / 1000),
    model: "mock",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  if (shouldUseMockMode()) {
    const normalizedResponseFormat = normalizeResponseFormat({
      responseFormat,
      response_format,
      outputSchema,
      output_schema,
    });

    if (normalizedResponseFormat?.type === "json_schema") {
      return makeMockResult(JSON.stringify(mockJsonForSchema(normalizedResponseFormat.json_schema.name)));
    }

    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const promptPreview =
      typeof lastUser?.content === "string"
        ? lastUser.content.slice(0, 200)
        : "Mocked response.";

    return makeMockResult(
      `# Mocked Output\n\nLLM_MODE=mock is enabled.\n\nPrompt preview:\n\n${promptPreview}`
    );
  }

  assertApiKey();

  const apiBase = resolveApiUrl();
  const url = resolveChatCompletionsUrl(apiBase);
  const provider = resolveProvider(url);

  const payload: Record<string, unknown> = {
    model: getDefaultModel(provider),
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = params.maxTokens ?? params.max_tokens ?? getMaxTokens(provider);

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const timeoutMs = getNumberEnv(ENV.llmTimeoutMs, 120_000);
  const maxRetries = getNumberEnv(ENV.llmMaxRetries, 4);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.ok) {
        return (await response.json()) as InvokeResult;
      }

      const isRetryable = response.status === 429 || response.status >= 500;
      const errorText = await response.text().catch(() => "");

      if (!isRetryable || attempt === maxRetries) {
        throw new Error(
          `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
        );
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const retryAfterMs = Number.isFinite(retryAfterSeconds)
        ? Math.max(0, Math.floor(retryAfterSeconds * 1000))
        : null;
      const backoffBase = 500 * 2 ** attempt;
      const jitter = Math.floor(Math.random() * 250);
      await sleep(Math.min(30_000, retryAfterMs ?? backoffBase + jitter));
    } catch (error) {
      const isLast = attempt === maxRetries;
      const isAbort = error instanceof Error && error.name === "AbortError";

      if (isLast) {
        const hint =
          provider === "openai"
            ? "Check network access and that your OpenAI key/model are valid."
            : "If you’re using OpenAI, set BUILT_IN_FORGE_API_URL=https://api.openai.com and BUILT_IN_FORGE_MODEL=gpt-4o-mini.";
        throw new Error(
          `LLM invoke failed: ${isAbort ? "timeout" : String(error)} (${hint})`
        );
      }

      await sleep(Math.min(30_000, 500 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("LLM invoke failed: retry loop exited unexpectedly");
}
