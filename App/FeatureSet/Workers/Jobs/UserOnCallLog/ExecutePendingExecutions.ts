import RunCron from "../../Utils/Cron";
import OneUptimeDate from "Common/Types/Date";
import NotificationRuleType from "Common/Types/NotificationRule/NotificationRuleType";
import UserNotificationExecutionStatus from "Common/Types/UserNotification/UserNotificationExecutionStatus";
import { EVERY_MINUTE } from "Common/Utils/CronTime";
import { IsDevelopment } from "Common/Server/EnvironmentConfig";
import IncidentService from "Common/Server/Services/IncidentService";
import UserNotificationRuleService from "Common/Server/Services/UserNotificationRuleService";
import UserOnCallLogService from "Common/Server/Services/UserOnCallLogService";
import logger from "Common/Server/Utils/Logger";
import Incident from "Common/Models/DatabaseModels/Incident";
import UserNotificationRule from "Common/Models/DatabaseModels/UserNotificationRule";
import UserOnCallLog from "Common/Models/DatabaseModels/UserOnCallLog";
import Alert from "Common/Models/DatabaseModels/Alert";
import AlertService from "Common/Server/Services/AlertService";
import AlertEpisode from "Common/Models/DatabaseModels/AlertEpisode";
import AlertEpisodeService from "Common/Server/Services/AlertEpisodeService";
import IncidentEpisode from "Common/Models/DatabaseModels/IncidentEpisode";
import IncidentEpisodeService from "Common/Server/Services/IncidentEpisodeService";
import { LIMIT_PER_PROJECT } from "Common/Types/Database/LimitMax";
import Dictionary from "Common/Types/Dictionary";
import GlobalCache from "Common/Server/Infrastructure/GlobalCache";

/*
 * When several monitors go down at once, each incident creates its own pending
 * execution. Without any pacing, every one of them fans out in the same tick and
 * the same person gets a dozen simultaneous phone calls. Two limits fix that:
 * calls to one user are queued (one per cooldown window, oldest first) and only
 * a few users are worked on concurrently.
 *
 * Only calls are throttled - email, push, SMS and the rest still go out at once.
 */

type GetEnvNumberFunction = (envVarName: string, defaultValue: number) => number;

const getEnvNumber: GetEnvNumberFunction = (
  envVarName: string,
  defaultValue: number,
): number => {
  const parsedValue: number = parseInt(process.env[envVarName] || "", 10);

  if (isNaN(parsedValue) || parsedValue < 0) {
    return defaultValue;
  }

  return parsedValue;
};

// Minimum gap between two calls to the same user. 0 disables the throttle.
const CALL_COOLDOWN_IN_SECONDS: number = getEnvNumber(
  "ON_CALL_USER_CALL_COOLDOWN_IN_SECONDS",
  300,
);

// How many users are notified in parallel within one run. 0 falls back to 10.
const MAX_CONCURRENT_USERS: number =
  getEnvNumber("ON_CALL_MAX_CONCURRENT_USER_NOTIFICATIONS", 10) || 10;

const CALL_COOLDOWN_CACHE_NAMESPACE: string = "user-on-call-log-call-cooldown";

/*
 * Guards calls for a single user. Backed by Redis so the cooldown survives
 * across cron runs; the in-memory flag covers the current run on its own, so a
 * cache outage degrades to "one call per user per run" instead of failing shut.
 */
type CallThrottle = {
  canMakeCall: () => Promise<boolean>;
  markCallMade: () => Promise<void>;
};

type GetCallThrottleFunction = (userId: string) => CallThrottle;

const getCallThrottleForUser: GetCallThrottleFunction = (
  userId: string,
): CallThrottle => {
  let hasCalledInThisRun: boolean = false;

  return {
    canMakeCall: async (): Promise<boolean> => {
      if (CALL_COOLDOWN_IN_SECONDS === 0) {
        return true;
      }

      if (hasCalledInThisRun) {
        return false;
      }

      try {
        const lastCallAt: string | null = await GlobalCache.getString(
          CALL_COOLDOWN_CACHE_NAMESPACE,
          userId,
        );

        return !lastCallAt;
      } catch (err) {
        logger.error(
          `Could not read call cooldown for user ${userId}. Allowing the call.`,
        );
        logger.error(err);
        return true;
      }
    },

    markCallMade: async (): Promise<void> => {
      hasCalledInThisRun = true;

      if (CALL_COOLDOWN_IN_SECONDS === 0) {
        return;
      }

      try {
        await GlobalCache.setString(
          CALL_COOLDOWN_CACHE_NAMESPACE,
          userId,
          OneUptimeDate.getCurrentDate().toISOString(),
          {
            expiresInSeconds: CALL_COOLDOWN_IN_SECONDS,
          },
        );
      } catch (err) {
        logger.error(`Could not write call cooldown for user ${userId}.`);
        logger.error(err);
      }
    },
  };
};

RunCron(
  "UserOnCallLog:ExecutePendingExecutions",
  {
    schedule: IsDevelopment ? EVERY_MINUTE : EVERY_MINUTE,
    runOnStartup: false,
  },
  async () => {
    const pendingNotificationLogs: Array<UserOnCallLog> =
      await UserOnCallLogService.findAllBy({
        query: {
          status: UserNotificationExecutionStatus.Executing,
        },
        select: {
          _id: true,
          projectId: true,
          createdAt: true,
          executedNotificationRules: true,
          userId: true,
          userNotificationEventType: true,
          triggeredByIncidentId: true,
          triggeredByAlertId: true,
          triggeredByAlertEpisodeId: true,
          triggeredByIncidentEpisodeId: true,
          onCallDutyPolicyEscalationRuleId: true,
          onCallDutyPolicyExecutionLogTimelineId: true,
          onCallDutyPolicyExecutionLogId: true,
          onCallDutyPolicyId: true,
          onCallDutyScheduleId: true,
          userBelongsToTeamId: true,
        },
        props: {
          isRoot: true,
        },
      });

    /*
     * Group by user so everything queued for one person is worked through one at
     * a time, oldest first, instead of all at once.
     */
    const logsByUser: Dictionary<Array<UserOnCallLog>> = {};

    for (const pendingNotificationLog of pendingNotificationLogs) {
      const userKey: string =
        pendingNotificationLog.userId?.toString() ||
        pendingNotificationLog.id?.toString() ||
        "";

      if (!logsByUser[userKey]) {
        logsByUser[userKey] = [];
      }

      logsByUser[userKey]!.push(pendingNotificationLog);
    }

    const userLogGroups: Array<Array<UserOnCallLog>> = Object.keys(
      logsByUser,
    ).map((userKey: string) => {
      return logsByUser[userKey]!.sort(
        (a: UserOnCallLog, b: UserOnCallLog): number => {
          return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
        },
      );
    });

    for (
      let index: number = 0;
      index < userLogGroups.length;
      index += MAX_CONCURRENT_USERS
    ) {
      const batch: Array<Array<UserOnCallLog>> = userLogGroups.slice(
        index,
        index + MAX_CONCURRENT_USERS,
      );

      await Promise.allSettled(
        batch.map((logsForUser: Array<UserOnCallLog>) => {
          return executePendingNotificationLogsForUser(logsForUser);
        }),
      );
    }
  },
);

type ExecutePendingNotificationLogsForUserFunction = (
  logsForUser: Array<UserOnCallLog>,
) => Promise<void>;

const executePendingNotificationLogsForUser: ExecutePendingNotificationLogsForUserFunction =
  async (logsForUser: Array<UserOnCallLog>): Promise<void> => {
    const userId: string =
      logsForUser[0]?.userId?.toString() ||
      logsForUser[0]?.id?.toString() ||
      "";

    const callThrottle: CallThrottle = getCallThrottleForUser(userId);

    for (const pendingNotificationLog of logsForUser) {
      await executePendingNotificationLog(pendingNotificationLog, callThrottle);
    }
  };

type ExecutePendingNotificationLogFunction = (
  pendingNotificationLog: UserOnCallLog,
  callThrottle?: CallThrottle | undefined,
) => Promise<void>;

const executePendingNotificationLog: ExecutePendingNotificationLogFunction =
  async (
    pendingNotificationLog: UserOnCallLog,
    callThrottleForUser?: CallThrottle | undefined,
  ): Promise<void> => {
    /*
     * Called with a shared throttle when the run groups logs by user. Standalone
     * callers get a throttle of their own, which still honours the Redis-backed
     * cooldown left behind by earlier runs.
     */
    const callThrottle: CallThrottle =
      callThrottleForUser ||
      getCallThrottleForUser(
        pendingNotificationLog.userId?.toString() ||
          pendingNotificationLog.id?.toString() ||
          "",
      );

    try {
      const ruleType: NotificationRuleType =
        UserOnCallLogService.getNotificationRuleType(
          pendingNotificationLog.userNotificationEventType!,
        );

      let incident: Incident | null = null;
      let alert: Alert | null = null;
      let alertEpisode: AlertEpisode | null = null;
      let incidentEpisode: IncidentEpisode | null = null;

      if (pendingNotificationLog.triggeredByIncidentId) {
        incident = await IncidentService.findOneById({
          id: pendingNotificationLog.triggeredByIncidentId!,
          props: {
            isRoot: true,
          },
          select: {
            incidentSeverityId: true,
          },
        });
      }

      if (pendingNotificationLog.triggeredByAlertId) {
        alert = await AlertService.findOneById({
          id: pendingNotificationLog.triggeredByAlertId!,
          props: {
            isRoot: true,
          },
          select: {
            alertSeverityId: true,
          },
        });
      }

      if (pendingNotificationLog.triggeredByAlertEpisodeId) {
        alertEpisode = await AlertEpisodeService.findOneById({
          id: pendingNotificationLog.triggeredByAlertEpisodeId!,
          props: {
            isRoot: true,
          },
          select: {
            alertSeverityId: true,
          },
        });
      }

      if (pendingNotificationLog.triggeredByIncidentEpisodeId) {
        incidentEpisode = await IncidentEpisodeService.findOneById({
          id: pendingNotificationLog.triggeredByIncidentEpisodeId!,
          props: {
            isRoot: true,
          },
          select: {
            incidentSeverityId: true,
          },
        });
      }

      if (!incident && !alert && !alertEpisode && !incidentEpisode) {
        throw new Error(
          "Incident, Alert, Alert Episode, or Incident Episode not found.",
        );
      }

      if (incident) {
        // check if the incident is acknowledged.
        const isAcknowledged: boolean =
          await IncidentService.isIncidentAcknowledged({
            incidentId: pendingNotificationLog.triggeredByIncidentId!,
          });
        if (isAcknowledged) {
          // then mark this policy as executed.
          await UserOnCallLogService.updateOneById({
            id: pendingNotificationLog.id!,
            data: {
              status: UserNotificationExecutionStatus.Completed,
              statusMessage:
                "Execution completed because incident is acknowledged.",
            },
            props: {
              isRoot: true,
            },
          });
          return;
        }
      }

      if (alert) {
        // check if the alert is acknowledged.
        const isAcknowledged: boolean = await AlertService.isAlertAcknowledged({
          alertId: pendingNotificationLog.triggeredByAlertId!,
        });

        if (isAcknowledged) {
          // then mark this policy as executed.
          await UserOnCallLogService.updateOneById({
            id: pendingNotificationLog.id!,
            data: {
              status: UserNotificationExecutionStatus.Completed,
              statusMessage:
                "Execution completed because alert is acknowledged.",
            },
            props: {
              isRoot: true,
            },
          });
          return;
        }
      }

      if (alertEpisode) {
        // check if the alert episode is acknowledged.
        const isAcknowledged: boolean =
          await AlertEpisodeService.isEpisodeAcknowledged({
            episodeId: pendingNotificationLog.triggeredByAlertEpisodeId!,
          });

        if (isAcknowledged) {
          // then mark this policy as executed.
          await UserOnCallLogService.updateOneById({
            id: pendingNotificationLog.id!,
            data: {
              status: UserNotificationExecutionStatus.Completed,
              statusMessage:
                "Execution completed because alert episode is acknowledged.",
            },
            props: {
              isRoot: true,
            },
          });
          return;
        }
      }

      if (incidentEpisode) {
        // check if the incident episode is acknowledged.
        const isAcknowledged: boolean =
          await IncidentEpisodeService.isEpisodeAcknowledged({
            episodeId: pendingNotificationLog.triggeredByIncidentEpisodeId!,
          });

        if (isAcknowledged) {
          // then mark this policy as executed.
          await UserOnCallLogService.updateOneById({
            id: pendingNotificationLog.id!,
            data: {
              status: UserNotificationExecutionStatus.Completed,
              statusMessage:
                "Execution completed because incident episode is acknowledged.",
            },
            props: {
              isRoot: true,
            },
          });
          return;
        }
      }

      const notificationRules: Array<UserNotificationRule> =
        await UserNotificationRuleService.findBy({
          query: {
            projectId: pendingNotificationLog.projectId!,
            userId: pendingNotificationLog.userId!,
            ruleType: ruleType,
            incidentSeverityId:
              incident?.incidentSeverityId ||
              incidentEpisode?.incidentSeverityId ||
              undefined,
            alertSeverityId:
              alert?.alertSeverityId ||
              alertEpisode?.alertSeverityId ||
              undefined,
          },
          select: {
            _id: true,
            notifyAfterMinutes: true,
            userCallId: true,
          },
          props: {
            isRoot: true,
          },
          skip: 0,
          limit: LIMIT_PER_PROJECT,
        });

      let isAllExecuted: boolean = true;

      const minutesSinceExecutionStarted: number =
        OneUptimeDate.getDifferenceInMinutes(
          pendingNotificationLog.createdAt!,
          OneUptimeDate.getCurrentDate(),
        );

      for (const notificationRule of notificationRules) {
        // check if this rule is already executed.
        const isAlreadyExecuted: boolean = Object.keys(
          pendingNotificationLog.executedNotificationRules! || {},
        ).includes(notificationRule.id?.toString() || "");

        if (isAlreadyExecuted) {
          continue;
        }

        isAllExecuted = false;

        if (
          notificationRule.notifyAfterMinutes! > minutesSinceExecutionStarted
        ) {
          continue;
        }

        const isCallRule: boolean = Boolean(notificationRule.userCallId);

        /*
         * The user was called recently for some other execution. Leave this one
         * pending - the log stays in Executing and the next run picks it up once
         * the cooldown expires, so the call is queued and never dropped.
         */
        if (isCallRule && !(await callThrottle.canMakeCall())) {
          logger.debug(
            `Call for user ${pendingNotificationLog.userId} on notification log ${pendingNotificationLog._id} is throttled. It will be retried on the next run.`,
          );
          continue;
        }

        // execute this rule.

        await UserNotificationRuleService.executeNotificationRuleItem(
          notificationRule.id!,
          {
            userNotificationLogId: pendingNotificationLog.id!,
            projectId: pendingNotificationLog.projectId!,
            triggeredByIncidentId: pendingNotificationLog.triggeredByIncidentId,
            triggeredByAlertId: pendingNotificationLog.triggeredByAlertId,
            triggeredByAlertEpisodeId:
              pendingNotificationLog.triggeredByAlertEpisodeId,
            triggeredByIncidentEpisodeId:
              pendingNotificationLog.triggeredByIncidentEpisodeId,
            userNotificationEventType:
              pendingNotificationLog.userNotificationEventType!,
            onCallPolicyExecutionLogId:
              pendingNotificationLog.onCallDutyPolicyExecutionLogId,
            onCallPolicyId: pendingNotificationLog.onCallDutyPolicyId,
            onCallPolicyEscalationRuleId:
              pendingNotificationLog.onCallDutyPolicyEscalationRuleId,
            userBelongsToTeamId: pendingNotificationLog.userBelongsToTeamId,
            onCallDutyPolicyExecutionLogTimelineId:
              pendingNotificationLog.onCallDutyPolicyExecutionLogTimelineId,
            onCallScheduleId: pendingNotificationLog.onCallDutyScheduleId,
          },
        );

        if (isCallRule) {
          await callThrottle.markCallMade();
        }
      }

      if (isAllExecuted) {
        // mark this log as complete.
        await UserOnCallLogService.updateOneById({
          id: pendingNotificationLog.id!,
          data: {
            status: UserNotificationExecutionStatus.Completed,
          },
          props: {
            isRoot: true,
          },
        });
      }
    } catch (err: any) {
      logger.error(
        `Error executing pending notification log: ${pendingNotificationLog._id}`,
      );
      logger.error(err);

      await UserOnCallLogService.updateOneById({
        id: pendingNotificationLog.id!,
        data: {
          status: UserNotificationExecutionStatus.Error,
          statusMessage: err.message ? err.message : "Unknown error",
        },
        props: {
          isRoot: true,
        },
      });
    }
  };
