import ObjectID from "../ObjectID";
import MonitorStep from "./MonitorStep";
import MonitorCriteria from "./MonitorCriteria";
import MonitorCriteriaInstance from "./MonitorCriteriaInstance";
import FilterCondition from "../Filter/FilterCondition";
import { CheckOn, FilterType } from "./CriteriaFilter";
import MonitorStepLogMonitor from "./MonitorStepLogMonitor";

export type LogAlertTemplateCategory = "Security" | "System";

export type LogAlertTemplateSeverity = "Critical" | "Warning" | "Info";

export interface LogAlertTemplateArgs {
  onlineMonitorStatusId: ObjectID;
  offlineMonitorStatusId: ObjectID;
  defaultIncidentSeverityId: ObjectID;
  defaultAlertSeverityId: ObjectID;
  monitorName: string;
}

export interface LogAlertTemplate {
  id: string;
  name: string;
  description: string;
  category: LogAlertTemplateCategory;
  severity: LogAlertTemplateSeverity;
  getMonitorStep: (args: LogAlertTemplateArgs) => MonitorStep;
}

export function buildLogMonitorStep(args: {
  logMonitor: MonitorStepLogMonitor;
  offlineCriteriaInstance: MonitorCriteriaInstance;
  onlineCriteriaInstance: MonitorCriteriaInstance;
}): MonitorStep {
  const monitorStep: MonitorStep = new MonitorStep();

  const monitorCriteria: MonitorCriteria = new MonitorCriteria();

  monitorCriteria.data = {
    monitorCriteriaInstanceArray: [
      args.offlineCriteriaInstance,
      args.onlineCriteriaInstance,
    ],
  };

  monitorStep.data = {
    id: ObjectID.generate().toString(),
    monitorDestination: undefined,
    doNotFollowRedirects: undefined,
    monitorDestinationPort: undefined,
    monitorCriteria: monitorCriteria,
    requestType: "GET" as any,
    requestHeaders: undefined,
    requestBody: undefined,
    customCode: undefined,
    screenSizeTypes: undefined,
    browserTypes: undefined,
    retryCountOnError: undefined,
    logMonitor: args.logMonitor,
    traceMonitor: undefined,
    metricMonitor: undefined,
    exceptionMonitor: undefined,
    snmpMonitor: undefined,
    dnsMonitor: undefined,
    domainMonitor: undefined,
    externalStatusPageMonitor: undefined,
    kubernetesMonitor: undefined,
    profileMonitor: undefined,
    dockerMonitor: undefined,
  };

  return monitorStep;
}

export function buildLogOfflineCriteriaInstance(args: {
  offlineMonitorStatusId: ObjectID;
  incidentSeverityId: ObjectID;
  alertSeverityId: ObjectID;
  monitorName: string;
  incidentTitle?: string;
  incidentDescription?: string;
  criteriaName?: string;
  criteriaDescription?: string;
}): MonitorCriteriaInstance {
  const instance: MonitorCriteriaInstance = new MonitorCriteriaInstance();

  const incidentTitle: string =
    args.incidentTitle || `${args.monitorName} - Pattern Matched`;
  const incidentDescription: string =
    args.incidentDescription ||
    `${args.monitorName} has detected logs matching the configured pattern.`;

  instance.data = {
    id: ObjectID.generate().toString(),
    monitorStatusId: args.offlineMonitorStatusId,
    filterCondition: FilterCondition.Any,
    filters: [
      {
        checkOn: CheckOn.LogBodyMatch,
        filterType: FilterType.True,
        value: undefined,
      },
    ],
    incidents: [
      {
        title: incidentTitle,
        description: incidentDescription,
        incidentSeverityId: args.incidentSeverityId,
        autoResolveIncident: true,
        id: ObjectID.generate().toString(),
        onCallPolicyIds: [],
      },
    ],
    alerts: [
      {
        title: incidentTitle,
        description: incidentDescription,
        alertSeverityId: args.alertSeverityId,
        autoResolveAlert: true,
        id: ObjectID.generate().toString(),
        onCallPolicyIds: [],
      },
    ],
    changeMonitorStatus: true,
    createIncidents: true,
    createAlerts: true,
    name: args.criteriaName || `${args.monitorName} - Pattern Matched`,
    description:
      args.criteriaDescription ||
      `Criteria triggered when logs match the configured pattern.`,
  };

  return instance;
}

export function buildLogOnlineCriteriaInstance(args: {
  onlineMonitorStatusId: ObjectID;
}): MonitorCriteriaInstance {
  const instance: MonitorCriteriaInstance = new MonitorCriteriaInstance();

  instance.data = {
    id: ObjectID.generate().toString(),
    monitorStatusId: args.onlineMonitorStatusId,
    filterCondition: FilterCondition.Any,
    filters: [
      {
        checkOn: CheckOn.LogBodyMatch,
        filterType: FilterType.False,
        value: undefined,
      },
    ],
    incidents: [],
    alerts: [],
    changeMonitorStatus: true,
    createIncidents: false,
    createAlerts: false,
    name: "Healthy - No Pattern Match",
    description: "No logs matched the configured pattern.",
  };

  return instance;
}

const OOM_DETECTION_TEMPLATE: LogAlertTemplate = {
  id: "log-oom-detection",
  name: "OOM (Out of Memory) Detection",
  description:
    "Detects Out of Memory events from application and system logs, including OOMKilled container exits, kernel OOM killer invocations, and memory allocation failures.",
  category: "System",
  severity: "Critical",
  getMonitorStep: (args: LogAlertTemplateArgs): MonitorStep => {
    const logMonitor: MonitorStepLogMonitor = {
      attributes: {},
      body: "OOMKilled|Out of memory|oom-killer|invoked oom-killer|Memory cgroup out of memory|panic: out of memory",
      bodyRegex: true,
      severityTexts: [],
      telemetryServiceIds: [],
      lastXSecondsOfLogs: 300,
    };

    const offlineCriteria: MonitorCriteriaInstance =
      buildLogOfflineCriteriaInstance({
        offlineMonitorStatusId: args.offlineMonitorStatusId,
        incidentSeverityId: args.defaultIncidentSeverityId,
        alertSeverityId: args.defaultAlertSeverityId,
        monitorName: args.monitorName,
        incidentTitle: `${args.monitorName} - Out of Memory Detected`,
        incidentDescription: `${args.monitorName} has detected Out of Memory events in the logs. This may indicate resource exhaustion, OOMKilled containers, or kernel OOM killer activity.`,
        criteriaName: `${args.monitorName} - OOM Pattern Matched`,
        criteriaDescription:
          "Triggers when logs contain Out of Memory patterns.",
      });

    const onlineCriteria: MonitorCriteriaInstance =
      buildLogOnlineCriteriaInstance({
        onlineMonitorStatusId: args.onlineMonitorStatusId,
      });

    return buildLogMonitorStep({
      logMonitor,
      offlineCriteriaInstance: offlineCriteria,
      onlineCriteriaInstance: onlineCriteria,
    });
  },
};

const FAIL2BAN_DETECTION_TEMPLATE: LogAlertTemplate = {
  id: "log-fail2ban-detection",
  name: "fail2ban Ban Detection",
  description:
    "Detects fail2ban ban/unban actions in system logs, indicating repeated authentication failures and potential brute-force attacks being blocked.",
  category: "Security",
  severity: "Warning",
  getMonitorStep: (args: LogAlertTemplateArgs): MonitorStep => {
    const logMonitor: MonitorStepLogMonitor = {
      attributes: {},
      body: "fail2ban\\.actions|fail2ban.*Ban|fail2ban.*ban.*sshd|fail2ban:.*Found",
      bodyRegex: true,
      severityTexts: [],
      telemetryServiceIds: [],
      lastXSecondsOfLogs: 300,
    };

    const offlineCriteria: MonitorCriteriaInstance =
      buildLogOfflineCriteriaInstance({
        offlineMonitorStatusId: args.offlineMonitorStatusId,
        incidentSeverityId: args.defaultIncidentSeverityId,
        alertSeverityId: args.defaultAlertSeverityId,
        monitorName: args.monitorName,
        incidentTitle: `${args.monitorName} - fail2ban Action Detected`,
        incidentDescription: `${args.monitorName} has detected fail2ban ban or authentication failure events in the logs. This indicates repeated failed login attempts and potential brute-force attacks being blocked.`,
        criteriaName: `${args.monitorName} - fail2ban Pattern Matched`,
        criteriaDescription:
          "Triggers when logs contain fail2ban ban or authentication failure events.",
      });

    const onlineCriteria: MonitorCriteriaInstance =
      buildLogOnlineCriteriaInstance({
        onlineMonitorStatusId: args.onlineMonitorStatusId,
      });

    return buildLogMonitorStep({
      logMonitor,
      offlineCriteriaInstance: offlineCriteria,
      onlineCriteriaInstance: onlineCriteria,
    });
  },
};

export function getAllLogAlertTemplates(): Array<LogAlertTemplate> {
  return [OOM_DETECTION_TEMPLATE, FAIL2BAN_DETECTION_TEMPLATE];
}

export function getLogAlertTemplatesByCategory(
  category: LogAlertTemplateCategory,
): Array<LogAlertTemplate> {
  return getAllLogAlertTemplates().filter(
    (template: LogAlertTemplate) => template.category === category,
  );
}

export function getLogAlertTemplateById(
  id: string,
): LogAlertTemplate | undefined {
  return getAllLogAlertTemplates().find(
    (template: LogAlertTemplate) => template.id === id,
  );
}
