import ErrorMessage from "../ErrorMessage/ErrorMessage";
import Input from "../Input/Input";
import TextArea from "../TextArea/TextArea";
import Modal, { ModalWidth } from "../Modal/Modal";
import Pill from "../Pill/Pill";
import { Black } from "../../../Types/BrandColors";
import {
  ComponentInputType,
  NodeDataProp,
  ReturnValue,
} from "../../../Types/Workflow/Component";
import React, {
  FunctionComponent,
  ReactElement,
  useEffect,
  useState,
} from "react";
import { JSONObject } from "../../../Types/JSON";
import {
  JSONFieldNode,
  flattenJSONFields,
} from "../../Utils/JSONFieldFlattener";

export interface ComponentProps {
  onClose: () => void;
  onSave: (componentValueId: string) => void;
  components: Array<NodeDataProp>;
}

const ComponentValuePickerModal: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [selectedReturnValue, setSelectedReturnValue] =
    useState<ReturnValue | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<NodeDataProp | null>(null);
  const [searchedComponents, setSearchedComponents] = useState<
    Array<NodeDataProp>
  >([]);

  const [searchText, setSearchText] = useState<string>("");

  const [subFieldPath, setSubFieldPath] = useState<string>("");
  const [sampleJSON, setSampleJSON] = useState<string>("");
  const [parsedFields, setParsedFields] = useState<Array<JSONFieldNode>>([]);
  const [jsonParseError, setJsonParseError] = useState<string>("");

  const isJSONType: boolean =
    selectedReturnValue?.type === ComponentInputType.JSON ||
    selectedReturnValue?.type === ComponentInputType.StringDictionary;

  useEffect(() => {
    setSearchedComponents(searchReturnValues(props.components, searchText));
  }, [props.components, searchText]);

  useEffect(() => {
    setSubFieldPath("");
    setSampleJSON("");
    setParsedFields([]);
    setJsonParseError("");
  }, [selectedReturnValue, selectedComponent]);

  type SearchReturnValuesFunction = (
    components: Array<NodeDataProp>,
    searchText: string,
  ) => Array<NodeDataProp>;

  const searchReturnValues: SearchReturnValuesFunction = (
    components: Array<NodeDataProp>,
    searchText: string,
  ): Array<NodeDataProp> => {
    if (!searchText) {
      return components;
    }

    const searched: Array<NodeDataProp> = [];

    for (const component of components) {
      if (
        component.metadata.title.includes(searchText) ||
        component.metadata.description.includes(searchText)
      ) {
        searched.push(component);
        continue;
      }

      for (const returnVal of component.metadata.returnValues) {
        if (
          returnVal.name.includes(searchText) ||
          returnVal.description.includes(searchText)
        ) {
          searched.push(component);
          break;
        }
      }
    }

    return searched;
  };

  const handleSampleJSONChange = (value: string): void => {
    setSampleJSON(value);
    setJsonParseError("");

    if (!value.trim()) {
      setParsedFields([]);
      return;
    }

    try {
      const parsed: JSONValue = JSON.parse(value);
      const fields: Array<JSONFieldNode> = flattenJSONFields(parsed);
      setParsedFields(fields);
    } catch (e) {
      setJsonParseError("JSON inválido");
      setParsedFields([]);
    }
  };

  const handleSelectField = (field: JSONFieldNode): void => {
    setSubFieldPath(field.path);
  };

  const getTemplateValue = (): string => {
    if (!selectedComponent || !selectedReturnValue) {
      return "";
    }

    const basePath: string = `local.components.${selectedComponent.id}.returnValues["${selectedReturnValue.id}"]`;

    if (subFieldPath) {
      return `{{${basePath}.${subFieldPath}}}`;
    }

    return `{{${basePath}}}`;
  };

  const filteredParsedFields: Array<JSONFieldNode> = subFieldPath
    ? parsedFields.filter((f: JSONFieldNode) =>
        f.path.toLowerCase().includes(subFieldPath.toLowerCase()),
      )
    : parsedFields;

  return (
    <Modal
      modalWidth={ModalWidth.Large}
      title={"Select return value from another component"}
      description={
        "Select a return value from the component this component is connected to."
      }
      onClose={props.onClose}
      disableSubmitButton={!selectedReturnValue}
      onSubmit={() => {
        if (!selectedReturnValue) {
          return props.onClose();
        }

        if (!selectedComponent) {
          return props.onClose();
        }

        props.onSave(getTemplateValue());
      }}
    >
      <div>
        {props.components && props.components.length > 0 && (
          <div className="p-2">
            <Input
              placeholder="Search..."
              onChange={(value: string) => {
                setSearchText(value);
              }}
            />
          </div>
        )}

        <div className="max-h-96 mt-5 mb-5 overflow-y-auto">
          {props.components.length === 0 ? (
            <ErrorMessage message={"No components in this workflow."} />
          ) : (
            <></>
          )}

          {props.components.length > 0 &&
          searchText &&
          searchedComponents.length === 0 ? (
            <ErrorMessage message={"No components match your search"} />
          ) : (
            <></>
          )}

          {searchedComponents &&
            searchedComponents.length > 0 &&
            searchedComponents.map(
              (component: NodeDataProp, i: number): ReactElement => {
                const isComponentSelected: boolean =
                  selectedComponent?.id === component.id;

                return (
                  <div className="p-3 pl-1" key={`component-${i}`}>
                    <h2 className="text-base font-medium text-gray-500">
                      {component.metadata.title} ({component.id})
                    </h2>
                    <p className="text-sm font-medium text-gray-400">
                      {component.metadata.description}
                    </p>

                    {component.metadata.returnValues &&
                      component.metadata.returnValues.length === 0 && (
                        <ErrorMessage message="This component does not have any return values." />
                      )}
                    {component.metadata.returnValues &&
                      component.metadata.returnValues.map(
                        (returnValue: ReturnValue, i: number) => {
                          const isSelected: boolean = Boolean(
                            selectedComponent &&
                            component.id === selectedComponent.id &&
                            selectedReturnValue &&
                            selectedReturnValue.id === returnValue.id,
                          );

                          return (
                            <div key={i}>
                              <div
                                onClick={() => {
                                  setSelectedComponent(component);
                                  setSelectedReturnValue(returnValue);
                                }}
                                className={`cursor-pointer mt-2 mb-2 relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-offset-2 hover:border-gray-400 ${
                                  isSelected ? "ring ring-indigo-500" : ""
                                }`}
                              >
                                <div className="min-w-0 flex-1 flex justify-between">
                                  <div className="focus:outline-none">
                                    <span
                                      className="absolute inset-0"
                                      aria-hidden="true"
                                    ></span>
                                    <p className="text-sm font-medium text-gray-900">
                                      {returnValue.name}{" "}
                                      <span className="text-gray-500 font-normal">
                                        (ID: {returnValue.id})
                                      </span>
                                    </p>
                                    <p className="truncate text-sm text-gray-500">
                                      {returnValue.description}
                                    </p>
                                  </div>
                                  <div>
                                    <Pill
                                      color={Black}
                                      text={returnValue.type}
                                    />
                                  </div>
                                </div>
                              </div>

                              {isSelected && isJSONType && (
                                <div className="ml-6 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-2">
                                    Sub-field path (opcional):
                                  </p>

                                  <Input
                                    placeholder="ex: email, user.name, items[0].title"
                                    initialValue={subFieldPath}
                                    onChange={(value: string) => {
                                      setSubFieldPath(value);
                                    }}
                                  />

                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-500 mb-1">
                                      Ou cole um JSON de exemplo para visualizar
                                      os campos:
                                    </p>
                                    <TextArea
                                      placeholder='{"email": "user@example.com", "name": "John"}'
                                      initialValue={sampleJSON}
                                      onChange={handleSampleJSONChange}
                                    />
                                    {jsonParseError && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {jsonParseError}
                                      </p>
                                    )}
                                  </div>

                                  {parsedFields.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-gray-500 mb-1">
                                        Campos disponíveis (clique para
                                        selecionar):
                                      </p>
                                      <div className="max-h-40 overflow-y-auto">
                                        {filteredParsedFields.map(
                                          (field: JSONFieldNode) => (
                                            <div
                                              key={field.path}
                                              onClick={() =>
                                                handleSelectField(field)
                                              }
                                              className={`cursor-pointer text-xs px-2 py-1 rounded hover:bg-gray-200 flex justify-between ${
                                                subFieldPath === field.path
                                                  ? "bg-indigo-100 text-indigo-700"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              <span className="font-mono">
                                                {field.path}
                                              </span>
                                              <span className="text-gray-400">
                                                {field.type}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                    <p className="text-xs text-gray-500">
                                      Preview:
                                    </p>
                                    <code className="text-xs text-indigo-600 break-all">
                                      {getTemplateValue()}
                                    </code>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                  </div>
                );
              },
            )}
        </div>
      </div>
    </Modal>
  );
};

export default ComponentValuePickerModal;
