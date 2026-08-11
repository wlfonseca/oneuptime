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

/*
 * Quantas linhas de log de erro (severidade Error/Fatal casando o regex de
 * erro) precisam aparecer na janela de `lastXSecondsOfLogs` para que o monitor
 * automático abra incidente. Existe para separar erro esporádico — que todo
 * container produz — de degradação real.
 */
const ERROR_LOG_COUNT_THRESHOLD: number = 10;

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

  @CaptureSpan()
  public static async createDefaultExceptionMonitorForService(data: {
    serviceId: ObjectID;
    serviceName: string;
    projectId: ObjectID;
  }): Promise<void> {
    const monitorName: string = `${data.serviceName} - Application Exceptions`;

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
          `AutoMonitorService: Could not create default exception monitor for service "${data.serviceName}" — missing status/severity config in project ${data.projectId}`,
        );
        return;
      }

      const monitor: Monitor = new Monitor();
      monitor.name = monitorName;
      monitor.description = `Auto-created exception monitor for "${data.serviceName}". Watches for application exceptions and creates incidents when exception count exceeds threshold.`;
      monitor.monitorType = MonitorType.Exceptions;
      monitor.disableActiveMonitoring = false;
      monitor.monitoringInterval = "*/1 * * * *";
      monitor.monitorSteps = AutoMonitorService.buildErrorLogMonitorStep({
        serviceName: data.serviceName,
        monitorName,
        onlineMonitorStatusId: operationalStatus.id!,
        offlineMonitorStatusId: offlineStatus.id!,
        incidentSeverityId: incidentSeverity.id!,
        alertSeverityId: alertSeverity.id!,
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
        `AutoMonitorService: Created default exception monitor "${monitorName}" for service "${data.serviceName}"`,
      );
    } catch (err) {
      logger.warn(
        `AutoMonitorService: Failed to create default exception monitor for "${data.serviceName}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  @CaptureSpan()
  public static async createDefaultServerMonitorForService(data: {
    serviceId: ObjectID;
    serviceName: string;
    projectId: ObjectID;
  }): Promise<void> {
    const monitorName: string = `${data.serviceName} - Auto Monitor`;

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
        criticalIncidentSeverity,
        warningIncidentSeverity,
        criticalAlertSeverity,
        warningAlertSeverity,
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
        IncidentSeverityService.findOneBy({
          query: { projectId: data.projectId },
          select: { _id: true },
          sort: { order: SortOrder.Descending },
          props: { isRoot: true },
        }),
        AlertSeverityService.findOneBy({
          query: { projectId: data.projectId },
          select: { _id: true },
          sort: { order: SortOrder.Ascending },
          props: { isRoot: true },
        }),
        AlertSeverityService.findOneBy({
          query: { projectId: data.projectId },
          select: { _id: true },
          sort: { order: SortOrder.Descending },
          props: { isRoot: true },
        }),
      ]);

      if (
        !operationalStatus ||
        !offlineStatus ||
        !criticalIncidentSeverity ||
        !warningIncidentSeverity ||
        !criticalAlertSeverity ||
        !warningAlertSeverity
      ) {
        logger.warn(
          `AutoMonitorService: Could not create default server monitor for "${data.serviceName}" — missing status/severity config in project ${data.projectId}`,
        );
        return;
      }

      const monitor: Monitor = new Monitor();
      monitor.name = monitorName;
      monitor.description = `Auto-created server monitor for "${data.serviceName}". Watches CPU (>80%), memory (>80%), disk (>80%), and load average.`;
      monitor.monitorType = MonitorType.Server;
      monitor.disableActiveMonitoring = false;
      monitor.monitoringInterval = "*/1 * * * *";
      monitor.monitorSteps = AutoMonitorService.buildServerMonitorStep({
        serviceName: data.serviceName,
        monitorName,
        onlineMonitorStatusId: operationalStatus.id!,
        offlineMonitorStatusId: offlineStatus.id!,
        criticalIncidentSeverityId: criticalIncidentSeverity.id!,
        warningIncidentSeverityId: warningIncidentSeverity.id!,
        criticalAlertSeverityId: criticalAlertSeverity.id!,
        warningAlertSeverityId: warningAlertSeverity.id!,
        serviceId: data.serviceId,
      });

      await MonitorService.create({
        data: monitor,
        props: {
          tenantId: data.projectId,
          isRoot: true,
        },
      });

      logger.info(
        `AutoMonitorService: Created default server monitor "${monitorName}" for service "${data.serviceName}"`,
      );
    } catch (err) {
      logger.warn(
        `AutoMonitorService: Failed to create default server monitor for "${data.serviceName}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private static buildServerMonitorStep(args: {
    serviceName: string;
    monitorName: string;
    onlineMonitorStatusId: ObjectID;
    offlineMonitorStatusId: ObjectID;
    criticalIncidentSeverityId: ObjectID;
    warningIncidentSeverityId: ObjectID;
    criticalAlertSeverityId: ObjectID;
    warningAlertSeverityId: ObjectID;
    serviceId: ObjectID;
  }): any {
    const onlineCriteriaId: string = ObjectID.generate().toString();

    const criteria = (
      checkOn: CheckOn,
      filterType: FilterType,
      value: number,
      criteriaName: string,
      criteriaDesc: string,
      incidentSeverityId: ObjectID,
      alertSeverityId: ObjectID,
    ) => {
      const offlineCriteriaId: string = ObjectID.generate().toString();
      const incidentId: string = ObjectID.generate().toString();
      const alertId: string = ObjectID.generate().toString();
      const stepId: string = ObjectID.generate().toString();

      const title = `[Server] ${criteriaName} - ${args.monitorName}`;

      return {
        data: {
          id: stepId,
          monitorDestination: undefined,
          doNotFollowRedirects: undefined,
          monitorDestinationPort: undefined,
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
                        checkOn,
                        filterType,
                        value,
                      },
                    ],
                    incidents: [
                      {
                        title,
                        description: criteriaDesc,
                        incidentSeverityId,
                        autoResolveIncident: true,
                        id: incidentId,
                        onCallPolicyIds: [],
                      },
                    ],
                    alerts: [
                      {
                        title,
                        description: criteriaDesc,
                        alertSeverityId,
                        autoResolveAlert: true,
                        id: alertId,
                        onCallPolicyIds: [],
                      },
                    ],
                    changeMonitorStatus: true,
                    createIncidents: true,
                    createAlerts: true,
                    name: `${args.monitorName} - ${criteriaName}`,
                    description: criteriaDesc,
                  },
                },
                {
                  data: {
                    id: onlineCriteriaId,
                    monitorStatusId: args.onlineMonitorStatusId,
                    filterCondition: FilterCondition.Any,
                    filters: [
                      {
                        checkOn,
                        filterType:
                          filterType === FilterType.GreaterThan
                            ? FilterType.LessThanOrEqualTo
                            : FilterType.GreaterThan,
                        value,
                      },
                    ],
                    incidents: [],
                    alerts: [],
                    changeMonitorStatus: true,
                    createIncidents: false,
                    createAlerts: false,
                    name: "Healthy",
                    description: `Returned to normal for ${checkOn}.`,
                  },
                },
              ],
            },
          },
          requestType: "GET" as any,
          requestHeaders: undefined,
          requestBody: undefined,
          customCode: undefined,
          screenSizeTypes: undefined,
          browserTypes: undefined,
          retryCountOnError: undefined,
          logMonitor: undefined,
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
      };
    };

    const cpuStep = criteria(
      CheckOn.CPUUsagePercent,
      FilterType.GreaterThan,
      80,
      "CPU Usage > 80%",
      "CPU usage has exceeded 80%. High CPU may cause performance degradation.",
      args.warningIncidentSeverityId,
      args.warningAlertSeverityId,
    );

    const memStep = criteria(
      CheckOn.MemoryUsagePercent,
      FilterType.GreaterThan,
      80,
      "Memory Usage > 80%",
      "Memory usage has exceeded 80%. High memory usage may cause OOM killer or swapping.",
      args.warningIncidentSeverityId,
      args.warningAlertSeverityId,
    );

    const diskStep = criteria(
      CheckOn.DiskUsagePercent,
      FilterType.GreaterThan,
      80,
      "Disk Usage > 80%",
      "Disk usage has exceeded 80%. A full disk can cause application failures and data loss.",
      args.criticalIncidentSeverityId,
      args.criticalAlertSeverityId,
    );

    return {
      data: {
        id: ObjectID.generate().toString(),
        monitorStepsInstanceArray: [cpuStep, memStep, diskStep],
      },
    };
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
                        /*
                         * LogBodyMatch dispara com `currentLogCount > 0`, ou
                         * seja, uma única linha de log casando o regex já abre
                         * incidente — o que gerou 186 incidentes em 4 minutos
                         * quando estes monitores voltaram a rodar. O logMonitor
                         * acima já restringe QUAIS logs contam (severidade
                         * Error/Fatal + regex); aqui exigimos VOLUME para
                         * separar erro esporádico de problema real.
                         */
                        filters: [
                          {
                            checkOn: CheckOn.LogCount,
                            filterType: FilterType.GreaterThan,
                            value: ERROR_LOG_COUNT_THRESHOLD,
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
                        // Espelha o limiar do critério offline acima.
                        filters: [
                          {
                            checkOn: CheckOn.LogCount,
                            filterType: FilterType.LessThanOrEqualTo,
                            value: ERROR_LOG_COUNT_THRESHOLD,
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
