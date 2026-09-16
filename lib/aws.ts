import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const region = process.env.AWS_REGION ?? "us-east-1";

export type ExplainableDoorEvent = {
  eventType: string;
  detectedAt: string;
  repeatedCount: number;
  windowMinutes: number;
  hasMatchingVisit: boolean;
  deviceName: string;
};

export async function explainDoorEvent(event: ExplainableDoorEvent) {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) throw new Error("BEDROCK_MODEL_ID is not configured");

  const client = new BedrockRuntimeClient({ region });
  const command = new ConverseCommand({
    modelId,
    system: [{ text: "You write calm, factual doorstep-event explanations for family caregivers. Never identify a person, diagnose danger, or claim an emergency. Use only the supplied facts. Respond with one sentence under 24 words." }],
    messages: [{
      role: "user",
      content: [{ text: JSON.stringify(event) }],
    }],
    inferenceConfig: { maxTokens: 64, temperature: 0.1, topP: 0.9 },
  });
  const response = await client.send(command);
  const text = response.output?.message?.content?.find((item) => "text" in item)?.text?.trim();
  if (!text) throw new Error("Bedrock returned no explanation");
  return { text, modelId, requestId: response.$metadata.requestId };
}

export async function enqueueRingEvent(event: Record<string, unknown>) {
  const queueUrl = process.env.CAREDOOR_EVENTS_QUEUE_URL;
  if (!queueUrl) return { queued: false as const, reason: "queue_not_configured" as const };
  const client = new SQSClient({ region });
  const response = await client.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(event),
    MessageGroupId: process.env.CAREDOOR_EVENTS_FIFO === "true" ? "ring-events" : undefined,
    MessageDeduplicationId: process.env.CAREDOOR_EVENTS_FIFO === "true" ? String(event.requestId) : undefined,
  }));
  return { queued: true as const, messageId: response.MessageId };
}
