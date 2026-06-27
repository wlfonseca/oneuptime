import { describe, expect, test } from "@jest/globals";
import { getCallNotificationStrings } from "../../../Types/Call/CallNotificationTranslations";

describe("getCallNotificationStrings", () => {
  test("returns English strings for 'en'", () => {
    const t = getCallNotificationStrings("en");
    expect(t.greeting).toBe("This is a call from One Uptime");
    expect(t.newAlertCreated).toBe("A new alert has been created");
    expect(t.newIncidentCreated).toBe("A new incident has been created");
    expect(t.toAcknowledgeAlertPress1).toBe(
      "To acknowledge this alert press 1",
    );
    expect(t.acknowledgedAlert).toBe(
      "You have acknowledged this alert. Good bye",
    );
    expect(t.invalidInput).toBe("Invalid input. Good bye");
    expect(t.noInputReceived).toBe(
      "You have not entered any input. Good bye",
    );
  });

  test("returns Portuguese strings for 'pt'", () => {
    const t = getCallNotificationStrings("pt");
    expect(t.greeting).toBe("Esta é uma chamada do One Uptime");
    expect(t.newAlertCreated).toBe("Um novo alerta foi criado");
    expect(t.newIncidentCreated).toBe("Um novo incidente foi criado");
    expect(t.toAcknowledgeAlertPress1).toBe(
      "Para reconhecer este alerta pressione 1",
    );
    expect(t.acknowledgedAlert).toBe("Você reconheceu este alerta. Até logo");
  });

  test("returns Spanish strings for 'es'", () => {
    const t = getCallNotificationStrings("es");
    expect(t.greeting).toBe("Esta es una llamada de One Uptime");
    expect(t.newIncidentCreated).toBe("Se ha creado un nuevo incidente");
  });

  test("falls back to English for unknown language code", () => {
    const t = getCallNotificationStrings("xx");
    expect(t.greeting).toBe("This is a call from One Uptime");
  });

  test("falls back to English for empty string", () => {
    const t = getCallNotificationStrings("");
    expect(t.greeting).toBe("This is a call from One Uptime");
  });

  test("all supported languages have all required keys", () => {
    const languages = ["en", "pt", "es", "fr", "de", "it", "nl"];
    const requiredKeys = [
      "greeting",
      "newAlertCreated",
      "toAcknowledgeAlertPress1",
      "acknowledgedAlert",
      "newIncidentCreated",
      "toAcknowledgeIncidentPress1",
      "acknowledgedIncident",
      "newAlertEpisodeCreated",
      "toAcknowledgeAlertEpisodePress1",
      "acknowledgedAlertEpisode",
      "invalidInput",
      "noInputReceived",
    ];

    for (const lang of languages) {
      const t = getCallNotificationStrings(lang);
      for (const key of requiredKeys) {
        expect(
          (t as unknown as Record<string, string>)[key],
        ).toBeTruthy();
      }
    }
  });
});
