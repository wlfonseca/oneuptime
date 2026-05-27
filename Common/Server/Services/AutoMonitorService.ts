import ObjectID from "../../Types/ObjectID";
import SortOrder from "../../Types/BaseDatabase/SortOrder";
import { CheckOn, FilterType } from "../../Types/Monitor/CriteriaFilter";
import FilterCondition from "../../Types/Filter/FilterCondition";
import MonitorType from "../../Types/Monitor/MonitorType";
import Monitor from "../../Models/DatabaseModels/Monitor";
import AlertSeverityService from "./AlertSeverityService";
import IncidentSeverityService from "./IncidentSeverityService";
import MonitorService from "./MonitorService";
import MonitorStatusService from "./MonitorStatusService";
import logger from "../Utils/Logger";
import CaptureSpan from "../Utils/Telemetry/CaptureSpan";

export default class AutoMonitorService {
  @CaptureSpan()
  public static async createDefaultLogMonitorForService(data: {
    serviceId: ObjectID;
    serviceName: string;
    projectId: ObjectID;
  }): Promise<void> {
    const monitorName: string = `${data.serviceName} - Application Log Errors`;

    try {
      const existingMonitor: Monitor | null = await MonitorService.findOneBy({
        query: {
          projectId: data.projectId,
          name: monitorName,
        },
        select: {
          _id: true,
        },
        props: {
          isRoot: true,
        },
      });

      if (existingMonitor) {
        return;
      }

      const [
        operationalStatus,
        offlineStatus,
        incidentSeverity,
        alertSeverity,
      ] = await Promise.all([
        MonitorStatusService.findOneBy({
          query: {
            projectId: data.projectId,
            isOperationalState: true,
          },
          select: { _id: true },
          props: { isRoot: true },
        }),
        MonitorStatusService.findOneBy({
          query: {
            projectId: data.projectId,
            isOfflineState: true,
          },
          select: { _id: true },
          props: { isRoot: true },
        }),
        IncidentSeverityService.findOneBy({
          query: { projectId: data.projectId },
          select: { _id: true },
          sort: { order: SortOrder.Ascending },
          props: { isRoot: true },
        }),
        AlertSeverityService.findOneBy({
          query: { projectId: data.projectId },
          select: { _id: true },
          sort: { order: SortOrder.Ascending },
          props: { isRoot: true },
        }),
      ]);

      if (
        !operationalStatus ||
        !offlineStatus ||
        !incidentSeverity ||
        !alertSeverity
      ) {
        logger.warn(
          `AutoMonitorService: Could not create default log monitor for service "${data.serviceName}" — missing status/severity config in project ${data.projectId}`,
        );
        return;
      }

      const offlineStatusId: ObjectID = offlineStatus.id!;
      const incidentSeverityId: ObjectID = incidentSeverity.id!;
      const alertSeverityId: ObjectID = alertSeverity.id!;

      const monitor: Monitor = new Monitor();
      monitor.name = monitorName;
      monitor.description = `Auto-created log monitor for "${data.serviceName}". Watches for ERROR, FATAL, and CRITICAL severity logs and common error patterns.`;
      monitor.monitorType = MonitorType.Logs;
      monitor.disableActiveMonitoring = false;
      monitor.monitoringInterval = "*/1 * * * *";
      monitor.monitorSteps = AutoMonitorService.buildErrorLogMonitorStep({
        serviceName: data.serviceName,
        monitorName,
        onlineMonitorStatusId: operationalStatus.id!,
        offlineMonitorStatusId: offlineStatusId,
        incidentSeverityId,
        alertSeverityId,
        telemetryServiceId: data.serviceId,
      });

      await MonitorService.create({
        data: monitor,
        props: {
          tenantId: data.projectId,
          isRoot: true,
        },
      });

      logger.info(
        `AutoMonitorService: Created default log monitor "${monitorName}" for service "${data.serviceName}"`,
      );
    } catch (err) {
      logger.warn(
        `AutoMonitorService: Failed to create default log monitor for "${data.serviceName}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private static buildErrorLogMonitorStep(args: {
    serviceName: string;
    monitorName: string;
    onlineMonitorStatusId: ObjectID;
    offlineMonitorStatusId: ObjectID;
    incidentSeverityId: ObjectID;
    alertSeverityId: ObjectID;
    telemetryServiceId: ObjectID;
  }): any {
    const offlineCriteriaId: string = ObjectID.generate().toString();
    const onlineCriteriaId: string = ObjectID.generate().toString();
    const incidentId: string = ObjectID.generate().toString();
    const alertId: string = ObjectID.generate().toString();
    const stepId: string = ObjectID.generate().toString();
    const criteriaId: string = ObjectID.generate().toString();

    const incidentTitle: string = `${args.monitorName} - Application Error Detected`;
    const incidentDescription: string = `${args.monitorName} has detected application errors in the logs. One or more log entries matched the configured error patterns (ERROR, FATAL, CRITICAL severity or error regex patterns from "${args.serviceName}").`;

    return {
      data: {
        id: criteriaId,
        monitorStepsInstanceArray: [
          {
            data: {
              id: stepId,
              logMonitor: {
                attributes: {},
                body: "ERROR|FATAL|CRITICAL|panic|exception|stack trace|500 Internal Server Error|UnhandledPromiseRejection|Uncaught Exception|fatal error",
                bodyRegex: true,
                severityTexts: ["Error", "Fatal"],
                telemetryServiceIds: [args.telemetryServiceId],
                lastXSecondsOfLogs: 60,
              },
              monitorCriteria: {
                data: {
                  monitorCriteriaInstanceArray: [
                    {
                      data: {
                        id: offlineCriteriaId,
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
                            id: incidentId,
                            onCallPolicyIds: [],
                          },
                        ],
                        alerts: [
                          {
                            title: incidentTitle,
                            description: incidentDescription,
                            alertSeverityId: args.alertSeverityId,
                            autoResolveAlert: true,
                            id: alertId,
                            onCallPolicyIds: [],
                          },
                        ],
                        changeMonitorStatus: true,
                        createIncidents: true,
                        createAlerts: true,
                        name: `${args.monitorName} - Error Pattern Matched`,
                        description:
                          "Triggers when logs contain application error patterns.",
                      },
                    },
                    {
                      data: {
                        id: onlineCriteriaId,
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
                        name: "Healthy - No Error Pattern Match",
                        description:
                          "No logs matched the configured error patterns.",
                      },
                    },
                  ],
                },
              },
              monitorDestination: undefined,
              doNotFollowRedirects: undefined,
              monitorDestinationPort: undefined,
              requestType: "GET" as any,
              requestHeaders: undefined,
              requestBody: undefined,
              customCode: undefined,
              screenSizeTypes: undefined,
              browserTypes: undefined,
              retryCountOnError: undefined,
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
            },
          },
        ],
      },
    };
  }
}
