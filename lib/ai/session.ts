import type { AIPlan, WorkspaceContext, VerificationQuestion } from "./types";

export function updateStatelessSession(
  plan: AIPlan,
  collectedValues: Record<string, unknown>,
  answers: Record<string, string | string[]>
): {
  plan: AIPlan;
  collectedValues: Record<string, unknown>;
  completed: boolean;
} {
  const newCollected = { ...collectedValues, ...answers };

  // Handle ambiguous_group selection
  if (typeof answers.ambiguous_group === "string" && plan.matchingGroups) {
    const selectedGroup = plan.matchingGroups.find((g) => g.name === answers.ambiguous_group);
    if (selectedGroup) {
      plan.extracted.audience = selectedGroup.id;
    }
  }

  // Handle audience selection
  if (answers.audience !== undefined) {
    plan.extracted.audience = answers.audience;
  }

  plan.missingFields = plan.missingFields.filter(
    (f) => !["audience", "ambiguous_group"].includes(f)
  );

  return {
    plan,
    collectedValues: newCollected,
    completed: plan.missingFields.length === 0,
  };
}

export function generateVerificationQuestions(
  plan: AIPlan,
  context: WorkspaceContext
): VerificationQuestion[] {
  const questions: VerificationQuestion[] = [];

  if (plan.matchingGroups && plan.matchingGroups.length > 1) {
    questions.unshift({
      id: "ambiguous_group",
      type: "select",
      label: "Which group did you mean?",
      options: plan.matchingGroups.map((g) => g.name),
    });
  }

  for (const field of plan.missingFields) {
    switch (field) {
      case "audience": {
        const options = context.groups.map((g) => g.name);
        questions.push({
          id: "audience",
          type: "select",
          label: "Who should receive this?",
          options: ["All Subscribers", ...options],
        });
        break;
      }
      case "name": {
        questions.push({
          id: "name",
          type: "text",
          label: "What would you like to name this?",
        });
        break;
      }
      case "topic": {
        questions.push({
          id: "topic",
          type: "text",
          label: "What's the main topic?",
        });
        break;
      }
    }
  }

  return questions;
}