import Incident from "../../Models/DatabaseModels/Incident";
import AlertEpisode from "../../Models/DatabaseModels/AlertEpisode";
import ObjectID from "../../Types/ObjectID";
import AIService from "./AIService";
import LlmProviderService from "./LlmProviderService";
import ProjectCallSMSConfigService from "./ProjectCallSMSConfigService";
import ProjectCallSMSConfig from "../../Models/DatabaseModels/ProjectCallSMSConfig";
import LlmProvider from "../../Models/DatabaseModels/LlmProvider";
import { LLMMessage } from "../Utils/LLM/LLMService";
import CaptureSpan from "../Utils/Telemetry/CaptureSpan";

export default class AIVoiceService {
  @CaptureSpan()
  public static async generateIncidentVoiceMessage(
    projectId: ObjectID,
    incident: Incident,
  ): Promise<string | null> {
    const config: ProjectCallSMSConfig | null =
      await ProjectCallSMSConfigService.findOneBy({
        query: {
          projectId: projectId,
          isProjectDefault: true,
        },
        props: {
          isRoot: true,
        },
        select: {
          aiVoiceEnabled: true,
        },
      });

    if (!config || !config.aiVoiceEnabled) {
      return null;
    }

    const llmProvider: LlmProvider | null =
      await LlmProviderService.getLLMProviderForProject(projectId);

    if (!llmProvider) {
      return null;
    }

    const messages: Array<LLMMessage> = [
      {
        role: "system",
        content:
          "You are a voice assistant for incident alerts. Generate a short, friendly, and professional voice message about the incident. Keep it under 30 words. Speak naturally, as if reading to someone on the phone.",
      },
      {
        role: "user",
        content: `Generate a voice message for this incident: ${incident.title || "Untitled incident"}${incident.description ? ". Details: " + incident.description.substring(0, 200) : ""}`,
      },
    ];

    try {
      const response = await AIService.executeWithLogging({
        projectId: projectId,
        feature: "IncidentVoice",
        incidentId: incident.id as ObjectID,
        messages,
        maxTokens: 100,
        temperature: 0.7,
      });

      return response.content || null;
    } catch (_err) {
      return null;
    }
  }

  @CaptureSpan()
  public static async generateAlertVoiceMessage(
    projectId: ObjectID,
    alertEpisode: AlertEpisode,
  ): Promise<string | null> {
    const config: ProjectCallSMSConfig | null =
      await ProjectCallSMSConfigService.findOneBy({
        query: {
          projectId: projectId,
          isProjectDefault: true,
        },
        props: {
          isRoot: true,
        },
        select: {
          aiVoiceEnabled: true,
        },
      });

    if (!config || !config.aiVoiceEnabled) {
      return null;
    }

    const llmProvider: LlmProvider | null =
      await LlmProviderService.getLLMProviderForProject(projectId);

    if (!llmProvider) {
      return null;
    }

    const messages: Array<LLMMessage> = [
      {
        role: "system",
        content:
          "You are a voice assistant for alert notifications. Generate a short, friendly, and professional voice message about the alert. Keep it under 30 words. Speak naturally.",
      },
      {
        role: "user",
        content: `Generate a voice message for this alert: ${alertEpisode.title || "Untitled alert"}${alertEpisode.description ? ". Details: " + alertEpisode.description.substring(0, 200) : ""}`,
      },
    ];

    try {
      const response = await AIService.executeWithLogging({
        projectId: projectId,
        feature: "AlertVoice",
        alertId: alertEpisode.id as ObjectID,
        messages,
        maxTokens: 100,
        temperature: 0.7,
      });

      return response.content || null;
    } catch (_err) {
      return null;
    }
  }
}
