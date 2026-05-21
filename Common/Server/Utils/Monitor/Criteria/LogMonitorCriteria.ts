import CaptureSpan from "../../Telemetry/CaptureSpan";
import DataToProcess from "../DataToProcess";
import CompareCriteria from "./CompareCriteria";
import {
  CheckOn,
  CriteriaFilter,
  FilterType,
} from "../../../../Types/Monitor/CriteriaFilter";
import LogMonitorResponse from "../../../../Types/Monitor/LogMonitor/LogMonitorResponse";

export default class LogMonitorCriteria {
  @CaptureSpan()
  public static async isMonitorInstanceCriteriaFilterMet(input: {
    dataToProcess: DataToProcess;
    criteriaFilter: CriteriaFilter;
  }): Promise<string | null> {
    // Server Monitoring Checks

    let threshold: number | string | undefined | null =
      input.criteriaFilter.value;

    if (input.criteriaFilter.checkOn === CheckOn.LogCount) {
      threshold = CompareCriteria.convertToNumber(threshold);

      const currentLogCount: number =
        (input.dataToProcess as LogMonitorResponse).logCount || 0;

      return CompareCriteria.compareCriteriaNumbers({
        value: currentLogCount,
        threshold: threshold as number,
        criteriaFilter: input.criteriaFilter,
      });
    }

    if (input.criteriaFilter.checkOn === CheckOn.LogBodyMatch) {
      const currentLogCount: number =
        (input.dataToProcess as LogMonitorResponse).logCount || 0;

      const hasMatch: boolean = currentLogCount > 0;

      if (input.criteriaFilter.filterType === FilterType.True) {
        return hasMatch ? null : "Log body pattern did not match any logs.";
      }

      if (input.criteriaFilter.filterType === FilterType.False) {
        return hasMatch ? "Log body pattern matched logs." : null;
      }

      return null;
    }

    return null;
  }
}
