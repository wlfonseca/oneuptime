import {
  HOSTNAME,
  PROBE_INGEST_URL,
  PROBE_DESCRIPTION,
  PROBE_ID,
  PROBE_KEY,
  PROBE_NAME,
} from "../Config";
import OnlineCheck from "../Utils/OnlineCheck";
import ProbeAPIRequest from "../Utils/ProbeAPIRequest";
import HTTPMethod from "Common/Types/API/HTTPMethod";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import URL from "Common/Types/API/URL";
import { JSONObject } from "Common/Types/JSON";
import ProbeStatusReport from "Common/Types/Probe/ProbeStatusReport";
import Sleep from "Common/Types/Sleep";
import API from "Common/Utils/API";
import {
  HasRegisterProbeKey,
  RegisterProbeKey,
} from "Common/Server/EnvironmentConfig";
import LocalCache from "Common/Server/Infrastructure/LocalCache";
import logger from "Common/Server/Utils/Logger";
import ProxyConfig from "../Utils/ProxyConfig";

export default class Register {
  public static async isPingMonitoringEnabled(): Promise<boolean> {
    // check cache
    const pingMonitoring: string | null = LocalCache.getString(
      "PROBE",
      "PING_MONITORING",
    );

    if (pingMonitoring) {
      return pingMonitoring === "PING";
    }

    return true;
  }

  public static async reportIfOffline(): Promise<void> {
    const pingMonitoringCheck: boolean =
      await OnlineCheck.canProbeMonitorPingMonitors();
    const websiteMonitoringCheck: boolean =
      await OnlineCheck.canProbeMonitorWebsiteMonitors();
    const portMonitoringCheck: boolean =
      await OnlineCheck.canProbeMonitorPortMonitors();

    if (!pingMonitoringCheck && websiteMonitoringCheck) {
      // probe is online but ping monitoring is blocked by the cloud provider. Fallback to port monitoring.
      logger.warn(
        "Ping monitoring is disabled on this machine. Ping/ICMP checks are usually disabled by cloud providers (Azure, AWS, GCP, etc.). If you need ICMP checks, please use a different provider or use port checks.",
      );

      LocalCache.setString("PROBE", "PING_MONITORING", "PORT");
    }

    if (!pingMonitoringCheck || !websiteMonitoringCheck) {
      // Send an email to the admin.

      if (!pingMonitoringCheck) {
        logger.error("Ping monitoring is disabled");
      }

      if (!websiteMonitoringCheck) {
        logger.error("Website monitoring is disabled");
      }

      // Send an email to the admin.

      const stausReport: ProbeStatusReport = {
        isPingCheckOffline: !pingMonitoringCheck,
        isWebsiteCheckOffline: !websiteMonitoringCheck,
        isPortCheckOffline: !portMonitoringCheck,
        hostname: HOSTNAME,
      };

      const statusReportUrl: URL = URL.fromString(
        PROBE_INGEST_URL.toString(),
      ).addRoute("/probe/status-report/offline");

      await API.fetch<JSONObject>({
        method: HTTPMethod.POST,
        url: statusReportUrl,
        data: {
          ...ProbeAPIRequest.getDefaultRequestBody(),
          statusReport: stausReport as any,
        },
        headers: {},
        options: { ...ProxyConfig.getRequestProxyAgents(statusReportUrl) },
      });
    }
  }

  public static async registerProbe(): Promise<void> {
    // register probe with 5 retry and 15 seocnd interval between each retry.

    let currentRetry: number = 0;
    let isRegistered: boolean = false;

    const maxRetry: number = 10;

    const retryIntervalInSeconds: number = 30;

    while (currentRetry < maxRetry) {
      try {
        logger.debug(`Registering probe. Attempt: ${currentRetry + 1}`);
        await Register._registerProbe();
        logger.debug(`Probe registered successfully.`);
        isRegistered = true;
        break;
      } catch (error) {
        logger.error(
          `Failed to register probe. Retrying after ${retryIntervalInSeconds} seconds...`,
        );
        logger.error(error);
        currentRetry++;
        await Sleep.sleep(retryIntervalInSeconds * 1000);
      }
    }

    if (!isRegistered) {
      throw new Error(
        `Unable to register probe after ${maxRetry} attempts. Check PROBE_KEY / REGISTER_PROBE_KEY / connectivity to ${PROBE_INGEST_URL.toString()}.`,
      );
    }
  }

  private static async _registerProbe(): Promise<void> {
    if (HasRegisterProbeKey) {
      const probeRegistrationUrl: URL = URL.fromString(
        PROBE_INGEST_URL.toString(),
      ).addRoute("/register");

      logger.debug("Registering Probe...");
      logger.debug("Sending request to: " + probeRegistrationUrl.toString());

      const axios: any = require("axios");
      let probeId: string = "";

      try {
        const axiosResponse: any = await axios.post(
          probeRegistrationUrl.toString(),
          {
            probeKey: PROBE_KEY,
            probeName: PROBE_NAME,
            probeDescription: PROBE_DESCRIPTION,
            registerProbeKey: RegisterProbeKey.toString(),
          },
          {
            headers: {
              "Content-Type": "application/json;charset=UTF-8",
              "User-Agent": "OneUptime-Probe/1.0",
            },
          },
        );

        logger.debug("Probe Registered");
        logger.debug(axiosResponse.data);

        probeId = axiosResponse.data["_id"] as string;

        if (!probeId) {
          throw new Error(
            "Probe registration succeeded but probe ID is missing",
          );
        }
      } catch (err: any) {
        const responseData: any = err?.response?.data;
        let errorMessage: string = err?.message || "Unknown error";

        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData) {
          errorMessage = JSON.stringify(responseData);
        }

        throw new Error(`Probe registration failed: ${errorMessage}`);
      }

      if (!probeId) {
        throw new Error("Probe registration succeeded but probe ID is missing");
      }

      LocalCache.setString("PROBE", "PROBE_ID", probeId as string);
    } else {
      // validate probe.
      if (!PROBE_ID) {
        logger.error("PROBE_ID or REGISTER_PROBE_KEY should be set");
        return process.exit(1);
      }

      const aliveUrl: URL = URL.fromString(
        PROBE_INGEST_URL.toString(),
      ).addRoute("/alive");

      const aliveResult: HTTPResponse<JSONObject> | HTTPErrorResponse =
        await API.post({
          url: aliveUrl,
          data: {
            probeKey: PROBE_KEY.toString(),
            probeId: PROBE_ID.toString(),
          },
          options: { ...ProxyConfig.getRequestProxyAgents(aliveUrl) },
        });

      if (
        aliveResult instanceof HTTPErrorResponse ||
        !aliveResult.isSuccess()
      ) {
        const errorMessage: string =
          aliveResult instanceof HTTPErrorResponse
            ? aliveResult.message || JSON.stringify(aliveResult.data || {})
            : "Unknown alive validation error";

        throw new Error(`Probe validation failed: ${errorMessage}`);
      }

      LocalCache.setString("PROBE", "PROBE_ID", PROBE_ID.toString() as string);
    }

    logger.debug(
      `Probe ID: ${LocalCache.getString("PROBE", "PROBE_ID") || "Unknown"}`,
    );
  }
}
