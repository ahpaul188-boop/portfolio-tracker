export const OPENROUTER_MODEL_OPTIONS = [
  {
    id: "inclusionai/ling-3.0-flash-fin:free",
    label: "Ling 3.0 Flash Fin (free, finance)",
  },
  {
    id: "minimax/minimax-m3:free",
    label: "MiniMax M3 (free)",
  },
  {
    id: "z-ai/glm-5.2:free",
    label: "GLM 5.2 (free)",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek Chat (paid)",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini (paid)",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash (paid)",
  },
] as const;

export function isAllowedOpenRouterModel(id: string): boolean {
  return OPENROUTER_MODEL_OPTIONS.some((m) => m.id === id);
}
