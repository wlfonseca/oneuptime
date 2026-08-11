/**
 * Builder for the trailing ` SETTINGS ...` clause appended to ClickHouse
 * read queries.
 *
 * Every read built through this helper carries a per-query memory ceiling
 * (max_memory_usage) and spills oversized GROUP BY / ORDER BY states to
 * disk (max_bytes_before_external_group_by / _sort) instead of letting a
 * single dashboard query take down the server — historically no layer
 * bounded per-query memory at all. Execution-time caps and overflow
 * behavior stay per-call-site: each caller keeps the value it shipped
 * with.
 *
 * All values emitted here MUST be trusted literals (numbers / hardcoded
 * strings) — the clause is appended verbatim to SQL, never parameterized.
 */

export type TimeoutOverflowMode = "break" | "throw";

/*
 * 2 GiB. Precisa caber no teto do servidor ClickHouse, que é
 * max_server_memory_usage_to_ram_ratio (0.9) x RAM disponível ao processo.
 * Com o container em 3200m o teto fica ~2.81 GiB, então pedir 3 GiB por
 * query fazia toda leitura pesada falhar com "241 MEMORY_LIMIT_EXCEEDED"
 * antes mesmo de começar. Ao subir o ClickHouse para uma máquina com mais
 * RAM, este valor pode voltar a crescer — mas mantendo a folga para o teto.
 */
export const DEFAULT_MAX_MEMORY_USAGE_IN_BYTES: number = 2147483648;

// 1 GiB — metade do teto de memória, para o spill começar antes do limite.
export const DEFAULT_MAX_BYTES_BEFORE_EXTERNAL_GROUP_BY_IN_BYTES: number = 1073741824;

// 1 GiB.
export const DEFAULT_MAX_BYTES_BEFORE_EXTERNAL_SORT_IN_BYTES: number = 1073741824;

export interface QuerySettingsOptions {
  /**
   * Wall-clock cap in seconds (max_execution_time). Omitted from the
   * clause entirely when undefined, leaving the server default in force.
   */
  maxExecutionTimeInSeconds?: number | undefined;
  /**
   * What ClickHouse does when max_execution_time fires: 'break' returns
   * partial results, 'throw' fails the query (the server default).
   * Omitted from the clause when undefined.
   */
  timeoutOverflowMode?: TimeoutOverflowMode | undefined;
  maxMemoryUsageInBytes?: number | undefined;
  maxBytesBeforeExternalGroupByInBytes?: number | undefined;
  maxBytesBeforeExternalSortInBytes?: number | undefined;
  /**
   * Site-specific passthrough settings (e.g. optimize_use_projections,
   * optimize_aggregation_in_order, max_threads). Keys and values are
   * emitted verbatim — string values are single-quoted.
   */
  additionalSettings?: Record<string, number | string> | undefined;
}

export function getQuerySettings(options?: QuerySettingsOptions): string {
  const parts: Array<string> = [];

  if (options?.maxExecutionTimeInSeconds !== undefined) {
    parts.push(`max_execution_time = ${options.maxExecutionTimeInSeconds}`);
  }

  if (options?.timeoutOverflowMode !== undefined) {
    parts.push(`timeout_overflow_mode = '${options.timeoutOverflowMode}'`);
  }

  parts.push(
    `max_memory_usage = ${
      options?.maxMemoryUsageInBytes ?? DEFAULT_MAX_MEMORY_USAGE_IN_BYTES
    }`,
  );
  parts.push(
    `max_bytes_before_external_group_by = ${
      options?.maxBytesBeforeExternalGroupByInBytes ??
      DEFAULT_MAX_BYTES_BEFORE_EXTERNAL_GROUP_BY_IN_BYTES
    }`,
  );
  parts.push(
    `max_bytes_before_external_sort = ${
      options?.maxBytesBeforeExternalSortInBytes ??
      DEFAULT_MAX_BYTES_BEFORE_EXTERNAL_SORT_IN_BYTES
    }`,
  );

  if (options?.additionalSettings) {
    for (const [key, value] of Object.entries(options.additionalSettings)) {
      parts.push(
        typeof value === "string" ? `${key} = '${value}'` : `${key} = ${value}`,
      );
    }
  }

  return ` SETTINGS ${parts.join(", ")}`;
}

export default class QuerySettingsHelper {
  public static getQuerySettings(options?: QuerySettingsOptions): string {
    return getQuerySettings(options);
  }
}
