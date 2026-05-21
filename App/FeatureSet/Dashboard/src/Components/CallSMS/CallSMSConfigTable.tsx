import EmptyResponseData from "Common/Types/API/EmptyResponse";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import URL from "Common/Types/API/URL";
import { Green } from "Common/Types/BrandColors";
import { ErrorFunction, VoidFunction } from "Common/Types/FunctionTypes";
import IconProp from "Common/Types/Icon/IconProp";
import { JSONObject } from "Common/Types/JSON";
import ObjectID from "Common/Types/ObjectID";
import { ButtonStyleType } from "Common/UI/Components/Button/Button";
import BasicFormModal from "Common/UI/Components/FormModal/BasicFormModal";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import ConfirmModal from "Common/UI/Components/Modal/ConfirmModal";
import ModelTable from "Common/UI/Components/ModelTable/ModelTable";
import Pill from "Common/UI/Components/Pill/Pill";
import FieldType from "Common/UI/Components/Types/FieldType";
import { NOTIFICATION_URL } from "Common/UI/Config";
import API from "Common/UI/Utils/API/API";
import Navigation from "Common/UI/Utils/Navigation";
import ProjectCallSMSConfig from "Common/Models/DatabaseModels/ProjectCallSMSConfig";
import React, {
  FunctionComponent,
  ReactElement,
  useEffect,
  useState,
} from "react";

const CustomCallSMSTable: FunctionComponent = (): ReactElement => {
  const [showCallTestModal, setShowCallTestModal] = useState<boolean>(false);
  const [showCallSuccessModal, setCallShowSuccessModal] =
    useState<boolean>(false);

  const [showSMSTestModal, setShowSMSTestModal] = useState<boolean>(false);
  const [showSMSSuccessModal, setSMSShowSuccessModal] =
    useState<boolean>(false);

  const [error, setError] = useState<string>("");

  const [currentCallSMSTestConfig, setCurrentCallSMSTestConfig] =
    useState<ProjectCallSMSConfig | null>(null);

  const [isCallSMSTestLoading, setIsCallSMSTestLoading] =
    useState<boolean>(false);

  useEffect(() => {
    setError("");
  }, [showCallTestModal, showSMSTestModal]);

  return (
    <>
      <ModelTable<ProjectCallSMSConfig>
        modelType={ProjectCallSMSConfig}
        id="call-sms-table"
        userPreferencesKey="call-sms-table"
        actionButtons={[
          {
            title: "Send Test SMS",
            buttonStyleType: ButtonStyleType.OUTLINE,
            icon: IconProp.SMS,
            onClick: async (
              item: ProjectCallSMSConfig,
              onCompleteAction: VoidFunction,
              onError: ErrorFunction,
            ) => {
              try {
                setCurrentCallSMSTestConfig(item);
                setShowSMSTestModal(true);

                onCompleteAction();
              } catch (err) {
                onCompleteAction();
                onError(err as Error);
              }
            },
          },
          {
            title: "Send Test Call",
            buttonStyleType: ButtonStyleType.OUTLINE,
            icon: IconProp.Call,
            onClick: async (
              item: ProjectCallSMSConfig,
              onCompleteAction: VoidFunction,
              onError: ErrorFunction,
            ) => {
              try {
                setCurrentCallSMSTestConfig(item);
                setShowCallTestModal(true);

                onCompleteAction();
              } catch (err) {
                onCompleteAction();
                onError(err as Error);
              }
            },
          },
        ]}
        isDeleteable={true}
        createVerb="Create Call/SMS Config"
        isEditable={true}
        isCreateable={true}
        cardProps={{
          title: "Call/SMS Config",
          description:
            "Configure your call and SMS providers (Twilio or FreeSwitch/SIP).",
        }}
        formSteps={[
          {
            title: "Basic",
            id: "basic-info",
          },
          {
            title: "Twilio Config",
            id: "twilio-info",
          },
          {
            title: "FreeSwitch (SIP)",
            id: "freeswitch-info",
          },
        ]}
        name="Settings > Custom CallSMS Config"
        noItemsMessage={"No Call/SMS config found."}
        formFields={[
          {
            field: {
              name: true,
            },
            title: "Name",
            fieldType: FormFieldSchemaType.Text,
            required: true,
            description:
              "Friendly name for this config so you remember what this is about.",
            placeholder: "Company CallSMS Server",
            stepId: "basic-info",
            validation: {
              minLength: 2,
            },
          },
          {
            field: {
              description: true,
            },
            title: "Description",
            fieldType: FormFieldSchemaType.LongText,
            required: false,
            stepId: "basic-info",
            description:
              "Friendly description for this config so you remember what this is about.",
            placeholder: "Company CallSMS server hosted on AWS",
          },
          {
            field: {
              callProviderType: true,
            },
            title: "Call Provider",
            stepId: "basic-info",
            fieldType: FormFieldSchemaType.Dropdown,
            required: false,
            description: "Select your call provider: twilio or freeswitch",
            dropdownOptions: [
              { label: "Twilio", value: "twilio" },
              { label: "FreeSwitch (SIP)", value: "freeswitch" },
            ],
          },
          {
            field: {
              twilioAccountSID: true,
            },
            title: "Twilio Account SID",
            fieldType: FormFieldSchemaType.Text,
            stepId: "twilio-info",
            required: false,
            description: "You can find this in your Twilio console.",
            placeholder: "",
          },
          {
            field: {
              twilioAuthToken: true,
            },
            title: "Twilio Auth Token",
            stepId: "twilio-info",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "You can find this in your Twilio console.",
            placeholder: "",
          },
          {
            field: {
              twilioPrimaryPhoneNumber: true,
            },
            title: "Twilio Primary Phone Number",
            stepId: "twilio-info",
            fieldType: FormFieldSchemaType.Phone,
            required: false,
            description: "You can find this in your Twilio console.",
            placeholder: "",
          },
          {
            field: {
              twilioSecondaryPhoneNumbers: true,
            },
            title: "Twilio Secondary Phone Numbers",
            stepId: "twilio-info",
            fieldType: FormFieldSchemaType.LongText,
            required: false,
            description: "If you have multiple phone numbers, add them here.",
            placeholder: "+441234567890, +461234567890",
          },
          {
            field: {
              isProjectDefault: true,
            },
            title: "Set as Project Default",
            stepId: "twilio-info",
            fieldType: FormFieldSchemaType.Toggle,
            required: false,
            description:
              "When enabled, all SMS and Calls sent to project team members will use this config instead of the global config.",
          },
          {
            field: {
              freeSwitchTtsVoice: true,
            },
            title: "FreeSwitch TTS Voice",
            stepId: "freeswitch-info",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description:
              "TTS voice. For flite: slt (female), rms (male), kal (male). Default: slt",
            placeholder: "slt",
          },
          {
            field: {
              aiVoiceEnabled: true,
            },
            title: "AI Voice",
            stepId: "freeswitch-info",
            fieldType: FormFieldSchemaType.Toggle,
            required: false,
            description:
              "When enabled, the AI provider configured for this project will generate a friendly voice message for incident and alert calls instead of generic messages. Requires an LLM Provider configured in Settings > AI.",
          },
        ]}
        showRefreshButton={true}
        viewPageRoute={Navigation.getCurrentRoute()}
        filters={[
          {
            title: "Name",
            type: FieldType.Text,
            field: {
              name: true,
            },
          },
          {
            title: "Description",
            type: FieldType.LongText,
            field: {
              description: true,
            },
          },
          {
            title: "Twilio Account SID",
            type: FieldType.Text,
            field: {
              twilioAccountSID: true,
            },
          },
          {
            title: "Twilio Primary Phone Number",
            type: FieldType.Phone,
            field: {
              twilioPrimaryPhoneNumber: true,
            },
          },
          {
            title: "Twilio Secondary Primary Phone Numbers",
            type: FieldType.LongText,
            field: {
              twilioSecondaryPhoneNumbers: true,
            },
          },
          {
            title: "Project Default",
            type: FieldType.Boolean,
            field: {
              isProjectDefault: true,
            },
          },
        ]}
        columns={[
          {
            field: {
              name: true,
            },
            title: "Name",
            type: FieldType.Text,
          },
          {
            field: {
              description: true,
            },
            noValueMessage: "-",
            title: "Description",
            type: FieldType.LongText,
          },
          {
            field: {
              callProviderType: true,
            },
            title: "Provider",
            type: FieldType.Text,
          },
          {
            field: {
              twilioAccountSID: true,
            },
            title: "Twilio Account SID",
            type: FieldType.Text,
          },
          {
            field: {
              twilioPrimaryPhoneNumber: true,
            },
            title: "Primary Phone Number",
            type: FieldType.Phone,
          },
          {
            field: {
              freeSwitchEventSocketHost: true,
            },
            title: "FreeSwitch ESL Host",
            type: FieldType.Text,
          },
          {
            field: {
              aiVoiceEnabled: true,
            },
            title: "AI Voice",
            type: FieldType.Boolean,
          },
          {
            field: {
              isProjectDefault: true,
            },
            title: "Project Default",
            type: FieldType.Boolean,
            getElement: (item: ProjectCallSMSConfig): ReactElement => {
              if (item.isProjectDefault) {
                return <Pill text="Default" color={Green} />;
              }
              return <span className="text-gray-400">-</span>;
            },
          },
        ]}
      />

      {/** SMS */}

      {showSMSTestModal && currentCallSMSTestConfig ? (
        <BasicFormModal
          title={`Send Test SMS`}
          description={`Send a test sms to verify your twilio config.`}
          formProps={{
            error: error,
            fields: [
              {
                field: {
                  toPhone: true,
                },
                title: "Phone Number",
                description: "Phone number to send test sms to.",
                fieldType: FormFieldSchemaType.Phone,
                required: true,
                placeholder: "+1234567890",
              },
            ],
          }}
          submitButtonText={"Send Test SMS"}
          onClose={() => {
            setShowSMSTestModal(false);
            setError("");
          }}
          isLoading={isCallSMSTestLoading}
          onSubmit={async (values: JSONObject) => {
            try {
              setIsCallSMSTestLoading(true);
              setError("");

              // test CallSMS config
              const response:
                | HTTPResponse<EmptyResponseData>
                | HTTPErrorResponse = await API.post({
                url: URL.fromString(NOTIFICATION_URL.toString()).addRoute(
                  `/sms/test`,
                ),
                data: {
                  toPhone: values["toPhone"],
                  callSMSConfigId: new ObjectID(
                    currentCallSMSTestConfig["_id"]
                      ? currentCallSMSTestConfig["_id"].toString()
                      : "",
                  ).toString(),
                },
              });
              if (response.isSuccess()) {
                setIsCallSMSTestLoading(false);
                setShowSMSTestModal(false);
                setSMSShowSuccessModal(true);
              }

              if (response instanceof HTTPErrorResponse) {
                throw response;
              }
            } catch (err) {
              setError(API.getFriendlyMessage(err));
              setIsCallSMSTestLoading(false);
            }
          }}
        />
      ) : (
        <></>
      )}

      {showSMSSuccessModal ? (
        <ConfirmModal
          title={`SMS Sent`}
          error={
            error ===
            "Error connecting to server. Please try again in few minutes."
              ? "Request timed out. Please check your twilio credentials and make sure they are correct."
              : error
          }
          description={`SMS sent successfully. It should take couple of minutes to arrive, please don't forget to check spam.`}
          submitButtonType={ButtonStyleType.NORMAL}
          submitButtonText={"Close"}
          onSubmit={async () => {
            setSMSShowSuccessModal(false);
            setError("");
          }}
        />
      ) : (
        <></>
      )}

      {/** Call */}

      {showCallTestModal && currentCallSMSTestConfig ? (
        <BasicFormModal
          title={`Send Test Call`}
          description={`Send a test call to verify your twilio config.`}
          formProps={{
            error: error,
            fields: [
              {
                field: {
                  toPhone: true,
                },
                title: "Phone Number",
                description: "Phone number to send test call to.",
                fieldType: FormFieldSchemaType.Phone,
                required: true,
                placeholder: "+1234567890",
              },
            ],
          }}
          submitButtonText={"Send Test Call"}
          onClose={() => {
            setShowCallTestModal(false);
            setError("");
          }}
          isLoading={isCallSMSTestLoading}
          onSubmit={async (values: JSONObject) => {
            try {
              setIsCallSMSTestLoading(true);
              setError("");

              // test CallSMS config
              const response:
                | HTTPResponse<EmptyResponseData>
                | HTTPErrorResponse = await API.post({
                url: URL.fromString(NOTIFICATION_URL.toString()).addRoute(
                  `/call/test`,
                ),
                data: {
                  toPhone: values["toPhone"],
                  callSMSConfigId: new ObjectID(
                    currentCallSMSTestConfig["_id"]
                      ? currentCallSMSTestConfig["_id"].toString()
                      : "",
                  ).toString(),
                },
              });
              if (response.isSuccess()) {
                setIsCallSMSTestLoading(false);
                setShowCallTestModal(false);
                setCallShowSuccessModal(true);
              }

              if (response instanceof HTTPErrorResponse) {
                throw response;
              }
            } catch (err) {
              setError(API.getFriendlyMessage(err));
              setIsCallSMSTestLoading(false);
            }
          }}
        />
      ) : (
        <></>
      )}

      {showCallSuccessModal ? (
        <ConfirmModal
          title={`Call Sent`}
          error={
            error ===
            "Error connecting to server. Please try again in few minutes."
              ? "Request timed out. Please check your twilio credentials and make sure they are correct."
              : error
          }
          description={`Call sent successfully. It should take couple of minutes to arrive, please don't forget to check spam.`}
          submitButtonType={ButtonStyleType.NORMAL}
          submitButtonText={"Close"}
          onSubmit={async () => {
            setCallShowSuccessModal(false);
            setError("");
          }}
        />
      ) : (
        <></>
      )}
    </>
  );
};

export default CustomCallSMSTable;
