export interface AiAction {
  id: string;
  type: string;
  entity: string;
  entityId: string | null;
  input: unknown;
  output: unknown;
  confidence: number | null;
  modelUsed: string;
  humanOverride: boolean;
  overriddenBy: string | null;
  overriddenAt: string | null;
  createdAt: string;
  actorId: string | null;
  candidateName: string | null;
}

export interface AiActionsResponse {
  actions: AiAction[];
}
