export interface CallNotificationStrings {
  greeting: string;
  newAlertCreated: string;
  toAcknowledgeAlertPress1: string;
  acknowledgedAlert: string;
  newIncidentCreated: string;
  toAcknowledgeIncidentPress1: string;
  acknowledgedIncident: string;
  newAlertEpisodeCreated: string;
  toAcknowledgeAlertEpisodePress1: string;
  acknowledgedAlertEpisode: string;
  invalidInput: string;
  noInputReceived: string;
}

const translations: Record<string, CallNotificationStrings> = {
  en: {
    greeting: "This is a call from One Uptime",
    newAlertCreated: "A new alert has been created",
    toAcknowledgeAlertPress1: "To acknowledge this alert press 1",
    acknowledgedAlert: "You have acknowledged this alert. Good bye",
    newIncidentCreated: "A new incident has been created",
    toAcknowledgeIncidentPress1: "To acknowledge this incident press 1",
    acknowledgedIncident: "You have acknowledged this incident. Good bye",
    newAlertEpisodeCreated: "A new alert episode has been created",
    toAcknowledgeAlertEpisodePress1:
      "To acknowledge this alert episode press 1",
    acknowledgedAlertEpisode:
      "You have acknowledged this alert episode. Good bye",
    invalidInput: "Invalid input. Good bye",
    noInputReceived: "You have not entered any input. Good bye",
  },
  pt: {
    greeting: "Esta é uma chamada do One Uptime",
    newAlertCreated: "Um novo alerta foi criado",
    toAcknowledgeAlertPress1: "Para reconhecer este alerta pressione 1",
    acknowledgedAlert: "Você reconheceu este alerta. Até logo",
    newIncidentCreated: "Um novo incidente foi criado",
    toAcknowledgeIncidentPress1: "Para reconhecer este incidente pressione 1",
    acknowledgedIncident: "Você reconheceu este incidente. Até logo",
    newAlertEpisodeCreated: "Um novo episódio de alerta foi criado",
    toAcknowledgeAlertEpisodePress1:
      "Para reconhecer este episódio de alerta pressione 1",
    acknowledgedAlertEpisode:
      "Você reconheceu este episódio de alerta. Até logo",
    invalidInput: "Entrada inválida. Até logo",
    noInputReceived: "Você não digitou nenhuma entrada. Até logo",
  },
  es: {
    greeting: "Esta es una llamada de One Uptime",
    newAlertCreated: "Se ha creado una nueva alerta",
    toAcknowledgeAlertPress1: "Para reconocer esta alerta presione 1",
    acknowledgedAlert: "Ha reconocido esta alerta. Hasta luego",
    newIncidentCreated: "Se ha creado un nuevo incidente",
    toAcknowledgeIncidentPress1: "Para reconocer este incidente presione 1",
    acknowledgedIncident: "Ha reconocido este incidente. Hasta luego",
    newAlertEpisodeCreated: "Se ha creado un nuevo episodio de alerta",
    toAcknowledgeAlertEpisodePress1:
      "Para reconocer este episodio de alerta presione 1",
    acknowledgedAlertEpisode:
      "Ha reconocido este episodio de alerta. Hasta luego",
    invalidInput: "Entrada inválida. Hasta luego",
    noInputReceived: "No ha ingresado ninguna entrada. Hasta luego",
  },
  fr: {
    greeting: "Ceci est un appel de One Uptime",
    newAlertCreated: "Une nouvelle alerte a été créée",
    toAcknowledgeAlertPress1: "Pour accuser réception de cette alerte appuyez sur 1",
    acknowledgedAlert: "Vous avez accusé réception de cette alerte. Au revoir",
    newIncidentCreated: "Un nouvel incident a été créé",
    toAcknowledgeIncidentPress1:
      "Pour accuser réception de cet incident appuyez sur 1",
    acknowledgedIncident:
      "Vous avez accusé réception de cet incident. Au revoir",
    newAlertEpisodeCreated: "Un nouvel épisode d'alerte a été créé",
    toAcknowledgeAlertEpisodePress1:
      "Pour accuser réception de cet épisode d'alerte appuyez sur 1",
    acknowledgedAlertEpisode:
      "Vous avez accusé réception de cet épisode d'alerte. Au revoir",
    invalidInput: "Entrée invalide. Au revoir",
    noInputReceived: "Vous n'avez entré aucune donnée. Au revoir",
  },
  de: {
    greeting: "Dies ist ein Anruf von One Uptime",
    newAlertCreated: "Ein neuer Alarm wurde erstellt",
    toAcknowledgeAlertPress1: "Um diesen Alarm zu bestätigen drücken Sie 1",
    acknowledgedAlert: "Sie haben diesen Alarm bestätigt. Auf Wiederhören",
    newIncidentCreated: "Ein neuer Vorfall wurde erstellt",
    toAcknowledgeIncidentPress1:
      "Um diesen Vorfall zu bestätigen drücken Sie 1",
    acknowledgedIncident: "Sie haben diesen Vorfall bestätigt. Auf Wiederhören",
    newAlertEpisodeCreated: "Eine neue Alarmepisode wurde erstellt",
    toAcknowledgeAlertEpisodePress1:
      "Um diese Alarmepisode zu bestätigen drücken Sie 1",
    acknowledgedAlertEpisode:
      "Sie haben diese Alarmepisode bestätigt. Auf Wiederhören",
    invalidInput: "Ungültige Eingabe. Auf Wiederhören",
    noInputReceived: "Sie haben keine Eingabe gemacht. Auf Wiederhören",
  },
  it: {
    greeting: "Questa è una chiamata da One Uptime",
    newAlertCreated: "È stato creato un nuovo avviso",
    toAcknowledgeAlertPress1: "Per confermare questo avviso premere 1",
    acknowledgedAlert: "Hai confermato questo avviso. Arrivederci",
    newIncidentCreated: "È stato creato un nuovo incidente",
    toAcknowledgeIncidentPress1: "Per confermare questo incidente premere 1",
    acknowledgedIncident: "Hai confermato questo incidente. Arrivederci",
    newAlertEpisodeCreated: "È stato creato un nuovo episodio di avviso",
    toAcknowledgeAlertEpisodePress1:
      "Per confermare questo episodio di avviso premere 1",
    acknowledgedAlertEpisode:
      "Hai confermato questo episodio di avviso. Arrivederci",
    invalidInput: "Input non valido. Arrivederci",
    noInputReceived: "Non hai inserito alcun input. Arrivederci",
  },
  nl: {
    greeting: "Dit is een oproep van One Uptime",
    newAlertCreated: "Er is een nieuwe melding aangemaakt",
    toAcknowledgeAlertPress1: "Druk op 1 om deze melding te bevestigen",
    acknowledgedAlert: "U hebt deze melding bevestigd. Tot ziens",
    newIncidentCreated: "Er is een nieuw incident aangemaakt",
    toAcknowledgeIncidentPress1: "Druk op 1 om dit incident te bevestigen",
    acknowledgedIncident: "U hebt dit incident bevestigd. Tot ziens",
    newAlertEpisodeCreated: "Er is een nieuwe meldingsepisode aangemaakt",
    toAcknowledgeAlertEpisodePress1:
      "Druk op 1 om deze meldingsepisode te bevestigen",
    acknowledgedAlertEpisode:
      "U hebt deze meldingsepisode bevestigd. Tot ziens",
    invalidInput: "Ongeldige invoer. Tot ziens",
    noInputReceived: "U hebt geen invoer ingevoerd. Tot ziens",
  },
};

export function getCallNotificationStrings(
  languageCode: string,
): CallNotificationStrings {
  return translations[languageCode] || translations["en"]!;
}
