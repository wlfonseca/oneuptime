jest.mock("Common/Server/Infrastructure/Queue", () => {
  return {
    __esModule: true,
    default: {
      addJob: jest.fn(),
    },
    QueueName: {
      Workflow: "Workflow",
      Worker: "Worker",
      Telemetry: "Telemetry",
      Runbook: "Runbook",
    },
  };
});

import OtelLogsIngestService from "../../FeatureSet/Telemetry/Services/OtelLogsIngestService";
import OtelIngestBaseService from "../../FeatureSet/Telemetry/Services/OtelIngestBaseService";
import LogService from "Common/Server/Services/LogService";
import KubernetesResourceService from "Common/Server/Services/KubernetesResourceService";
import KubernetesContainerService from "Common/Server/Services/KubernetesContainerService";
import LogPipelineService from "../../FeatureSet/Telemetry/Services/LogPipelineService";
import LogDropFilterService from "../../FeatureSet/Telemetry/Services/LogDropFilterService";
import LogScrubRuleService from "../../FeatureSet/Telemetry/Services/LogScrubRuleService";
import ObjectID from "Common/Types/ObjectID";
import ServiceType from "Common/Types/Telemetry/ServiceType";
import { JSONObject } from "Common/Types/JSON";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

type AnyStatic = Record<string, unknown>;

const clusterId: ObjectID = ObjectID.generate();
const projectId: ObjectID = ObjectID.generate();
const serviceId: ObjectID = ObjectID.generate();

const kv: (key: string, value: JSONObject) => JSONObject = (
  key: string,
  value: JSONObject,
): JSONObject => {
  return { key, value };
};

const str: (value: string) => JSONObject = (value: string): JSONObject => {
  return { stringValue: value };
};

const list: (values: Array<JSONObject>) => JSONObject = (
  values: Array<JSONObject>,
): JSONObject => {
  return { kvlistValue: { values } };
};

const buildObjectBody: (kind: string, name: string) => JSONObject = (
  kind: string,
  name: string,
): JSONObject => {
  return list([
    kv("kind", str(kind)),
    kv(
      "metadata",
      list([kv("name", str(name)), kv("namespace", str("default"))]),
    ),
  ]);
};

const buildRequest: (records: Array<JSONObject>) => JSONObject = (
  records: Array<JSONObject>,
): JSONObject => {
  return {
    projectId,
    body: {
      resourceLogs: [
        {
          resource: {
            attributes: [kv("k8s.cluster.name", str("test-cluster"))],
          },
          scopeLogs: [{ scope: {}, logRecords: records }],
        },
      ],
    },
  };
};

const buildRecord: (resourceName: string, body: JSONObject) => JSONObject = (
  resourceName: string,
  body: JSONObject,
): JSONObject => {
  return {
    timeUnixNano: "1700000000000000000",
    body,
    attributes: [kv("k8s.resource.name", str(resourceName))],
  };
};

describe("OtelLogsIngestService k8s snapshot handling", () => {
  let insertJsonRows: ReturnType<typeof jest.spyOn>;
  let resourceUpsert: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    const base: AnyStatic = OtelIngestBaseService as unknown as AnyStatic;

    jest
      .spyOn(base as never, "autoDiscoverKubernetesCluster" as never)
      .mockResolvedValue(clusterId as never);
    for (const name of [
      "autoDiscoverDockerHost",
      "autoDiscoverPodmanHost",
      "autoDiscoverProxmoxCluster",
      "autoDiscoverCephCluster",
      "autoDiscoverDockerSwarmCluster",
      "autoDiscoverHost",
      "autoDiscoverServerless",
      "autoDiscoverCloudResource",
      "autoDiscoverRum",
    ]) {
      jest
        .spyOn(base as never, name as never)
        .mockResolvedValue(null as never);
    }
    jest
      .spyOn(base as never, "resolveTelemetryResource" as never)
      .mockResolvedValue({
        serviceName: "test-svc",
        primaryEntityId: serviceId,
        primaryEntityType: ServiceType.OpenTelemetry,
        entityKeys: [],
        serviceRetentionConfig: undefined,
        serviceRetentionInDays: 15,
        projectRetentionConfig: undefined,
        projectRetentionInDays: 15,
      } as never);

    jest.spyOn(LogPipelineService, "loadPipelines").mockResolvedValue([]);
    jest.spyOn(LogDropFilterService, "loadDropFilters").mockResolvedValue([]);
    jest.spyOn(LogScrubRuleService, "loadScrubRules").mockResolvedValue([]);

    insertJsonRows = jest
      .spyOn(LogService, "insertJsonRows")
      .mockResolvedValue(undefined as never);
    resourceUpsert = jest
      .spyOn(KubernetesResourceService, "bulkUpsert")
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(KubernetesContainerService, "bulkUpsert")
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const run: (records: Array<JSONObject>) => Promise<void> = async (
    records: Array<JSONObject>,
  ): Promise<void> => {
    await (
      OtelLogsIngestService as unknown as {
        processLogsAsync: (req: unknown) => Promise<void>;
      }
    ).processLogsAsync(buildRequest(records));
  };

  const insertedRows: () => Array<JSONObject> = (): Array<JSONObject> => {
    return insertJsonRows.mock.calls.flatMap((call: Array<unknown>) => {
      return call[0] as Array<JSONObject>;
    });
  };

  test("pods snapshot feeds inventory and does not become a log row", async () => {
    await run([buildRecord("pods", buildObjectBody("Pod", "pod-a"))]);

    expect(resourceUpsert).toHaveBeenCalledTimes(1);
    expect(insertedRows()).toHaveLength(0);
  });

  test("events keep being written as log rows", async () => {
    await run([buildRecord("events", buildObjectBody("Event", "ev-a"))]);

    expect(resourceUpsert).not.toHaveBeenCalled();
    expect(insertedRows()).toHaveLength(1);
  });

  test("inventoried snapshot that fails to parse is still written as a log row", async () => {
    await run([buildRecord("pods", str("not-a-kvlist"))]);

    expect(resourceUpsert).not.toHaveBeenCalled();
    expect(insertedRows()).toHaveLength(1);
  });

  test("mixed batch keeps only the non-snapshot rows", async () => {
    await run([
      buildRecord("pods", buildObjectBody("Pod", "pod-a")),
      buildRecord("events", buildObjectBody("Event", "ev-a")),
    ]);

    expect(resourceUpsert).toHaveBeenCalledTimes(1);
    expect(insertedRows()).toHaveLength(1);
  });
});
