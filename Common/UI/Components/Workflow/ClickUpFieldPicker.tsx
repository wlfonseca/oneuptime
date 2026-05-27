import React, {
  FunctionComponent,
  ReactElement,
  useEffect,
  useState,
} from "react";
import { JSONObject } from "../../../Types/JSON";
import Dropdown, { DropdownOption, DropdownValue } from "../Dropdown/Dropdown";
import API from "../../Utils/API/API";
import HTTPResponse from "../../../Types/API/HTTPResponse";
import HTTPErrorResponse from "../../../Types/API/HTTPErrorResponse";
import URL from "../../../Types/API/URL";
import { WORKFLOW_URL } from "../../Config";

export interface ComponentProps {
  apiToken?: string | undefined;
  listUrl?: string | undefined;
  initialValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  error?: string | undefined;
  tabIndex?: number | undefined;
}

interface ClickUpField {
  id: string;
  name: string;
  type: string;
}

function extractListId(listUrl: string): string | null {
  const parts: string[] = listUrl.split("/");
  const liIndex: number = parts.indexOf("li");
  if (liIndex !== -1 && liIndex + 1 < parts.length) {
    return parts[liIndex + 1]?.split("?")[0]?.split("#")[0] || null;
  }
  const numericParts: string[] = parts.filter((p: string) => /^\d+$/.test(p));
  return numericParts.length > 0
    ? (numericParts[numericParts.length - 1] ?? null)
    : null;
}

const ClickUpFieldPicker: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [options, setOptions] = useState<Array<DropdownOption>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.apiToken || !props.listUrl) {
      setOptions([]);
      return;
    }

    const listId: string | null = extractListId(props.listUrl);
    if (!listId) {
      setOptions([]);
      setFetchError("Could not extract list ID from URL");
      return;
    }

    let cancelled: boolean = false;
    setLoading(true);
    setFetchError(null);

    const url: URL = URL.fromString(WORKFLOW_URL.toString()).addRoute(
      "/clickup/fields",
    );

    API.get<JSONObject>({
      url,
      params: {
        apiToken: props.apiToken,
        listId,
      },
    }).then(
      (result: HTTPResponse<JSONObject> | HTTPErrorResponse) => {
        if (cancelled) {
          return;
        }
        setLoading(false);

        if (result instanceof HTTPErrorResponse) {
          setFetchError(result.message || "Failed to fetch fields");
          return;
        }

        const fields: Array<ClickUpField> =
          (result.data?.["fields"] as Array<JSONObject> | undefined)?.map(
            (f: JSONObject) =>
              ({
                id: f["id"],
                name: f["name"],
                type: f["type"],
              }) as ClickUpField,
          ) || [];

        const dropdownOptions: Array<DropdownOption> = fields.map(
          (field: ClickUpField) => ({
            label: `${field.name} (${field.type})`,
            value: field.id,
          }),
        );

        setOptions(dropdownOptions);
      },
      (error: Error) => {
        if (!cancelled) {
          setLoading(false);
          setFetchError(error.message || "Failed to fetch fields");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [props.apiToken, props.listUrl]);

  if (!props.apiToken || !props.listUrl) {
    return (
      <div className="text-sm text-gray-500 italic">
        Preencha "ClickUp API Token" e "List URL" primeiro
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500 italic">Carregando campos...</div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-sm text-red-500 italic">Erro: {fetchError}</div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Nenhum campo customizado encontrado
      </div>
    );
  }

  return (
    <Dropdown
      value={options.find((o) => o.value === props.initialValue)}
      options={[{ label: "Selecione um campo...", value: "" }, ...options]}
      onChange={(value: DropdownValue | Array<DropdownValue> | null) => {
        props.onChange?.(value?.toString() || "");
      }}
      placeholder={props.placeholder || "Selecione um campo customizado..."}
      error={props.error}
      tabIndex={props.tabIndex}
    />
  );
};

export default ClickUpFieldPicker;
