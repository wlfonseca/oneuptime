import PageMap from "../../../Utils/PageMap";
import RouteMap, { RouteUtil } from "../../../Utils/RouteMap";
import DashboardSideMenu from "../SideMenu";
import Route from "Common/Types/API/Route";
import ObjectID from "Common/Types/ObjectID";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import CardModelDetail from "Common/UI/Components/ModelDetail/CardModelDetail";
import Page from "Common/UI/Components/Page/Page";
import FieldType from "Common/UI/Components/Types/FieldType";
import GlobalConfig from "Common/Models/DatabaseModels/GlobalConfig";
import React, { FunctionComponent, ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import IconProp from "Common/Types/Icon/IconProp";
import BasicFormModal from "Common/UI/Components/FormModal/BasicFormModal";
import { JSONObject } from "Common/Types/JSON";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import API from "Common/UI/Utils/API/API";
import URL from "Common/Types/API/URL";
import { NOTIFICATION_URL } from "Common/UI/Config";
import EmptyResponseData from "Common/Types/API/EmptyResponse";

const Settings: FunctionComponent = (): ReactElement => {
  const { t } = useTranslation();
  const [showTestCallModal, setShowTestCallModal] = useState<boolean>(false);
  const [isTestCallLoading, setIsTestCallLoading] = useState<boolean>(false);
  const [testCallError, setTestCallError] = useState<string>("");

  return (
    <Page
      title={t("pages.settings.title")}
      breadcrumbLinks={[
        {
          title: t("breadcrumbs.adminDashboard"),
          to: RouteUtil.populateRouteParams(RouteMap[PageMap.HOME] as Route),
        },
        {
          title: t("breadcrumbs.settings"),
          to: RouteUtil.populateRouteParams(
            RouteMap[PageMap.SETTINGS] as Route,
          ),
        },
        {
          title: t("breadcrumbs.callsAndSms"),
          to: RouteUtil.populateRouteParams(
            RouteMap[PageMap.SETTINGS_CALL_AND_SMS] as Route,
          ),
        },
      ]}
      sideMenu={<DashboardSideMenu />}
    >
      <CardModelDetail
        name="Call and SMS Settings"
        cardProps={{
          title: t("pages.settings.callSms.cardTitle"),
          description: t("pages.settings.callSms.cardDescription"),
          buttons: [
            {
              title: "Test Call",
              icon: IconProp.Call,
              onClick: () => {
                setShowTestCallModal(true);
                setTestCallError("");
              },
            },
          ],
        }}
        isEditable={true}
        editButtonText={t("pages.settings.callSms.editButton")}
        formFields={[
          {
            field: {
              callProviderType: true,
            },
            title: "Call Provider",
            fieldType: FormFieldSchemaType.Dropdown,
            required: false,
            description: "Select your call provider: twilio or freeswitch.",
            placeholder: "Select provider",
            dropdownOptions: [
              { label: "FreeSwitch (SIP)", value: "freeswitch" },
              { label: "Twilio", value: "twilio" },
            ],
          },
          // ─── FreeSwitch ───
          {
            field: { freeSwitchSipServer: true },
            title: "SIP Trunk Server",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "SIP trunk provider hostname or IP.",
            placeholder: "sip.provedor.com.br",
          },
          {
            field: { freeSwitchSipPort: true },
            title: "SIP Trunk Port",
            fieldType: FormFieldSchemaType.Number,
            required: false,
            description: "SIP trunk server port. Default: 5060",
            placeholder: "5060",
          },
          {
            field: { freeSwitchSipUser: true },
            title: "SIP Trunk Username",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "SIP account username.",
            placeholder: "",
          },
          {
            field: { freeSwitchSipPassword: true },
            title: "SIP Trunk Password",
            fieldType: FormFieldSchemaType.Password,
            required: false,
            description: "SIP account password.",
            placeholder: "",
          },
          {
            field: { freeSwitchGatewayName: true },
            title: "SIP Gateway Name",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "Gateway name configured in FreeSwitch SIP profile.",
            placeholder: "setevoip",
          },
          {
            field: { freeSwitchDefaultCallerId: true },
            title: "Default Caller ID",
            fieldType: FormFieldSchemaType.Phone,
            required: false,
            description: "Default caller ID number for outbound calls.",
            placeholder: "+5511999999999",
          },
          {
            field: { freeSwitchEventSocketHost: true },
            title: "ESL Host",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "FreeSwitch Event Socket host. Default: freeswitch",
            placeholder: "freeswitch",
          },
          {
            field: { freeSwitchEventSocketPort: true },
            title: "ESL Port",
            fieldType: FormFieldSchemaType.Number,
            required: false,
            description: "FreeSwitch Event Socket port. Default: 8021",
            placeholder: "8021",
          },
          {
            field: { freeSwitchEventSocketPassword: true },
            title: "ESL Password",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "FreeSwitch Event Socket password.",
            placeholder: "ClueCon",
          },
          {
            field: { freeSwitchTtsEngine: true },
            title: "TTS Engine",
            fieldType: FormFieldSchemaType.Dropdown,
            required: false,
            description: "Text-to-speech engine. Default: flite",
            dropdownOptions: [
              { label: "Flite", value: "flite" },
              { label: "Pico", value: "pico" },
              { label: "Say", value: "say" },
            ],
          },
          {
            field: { freeSwitchTtsVoice: true },
            title: "TTS Voice",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description:
              "TTS voice name. For flite: slt (female), rms (male). Default: slt",
            placeholder: "slt",
          },
          // ─── Twilio ───
          {
            field: { twilioAccountSID: true },
            title: "Twilio Account SID",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "Twilio Account SID.",
            placeholder: "",
          },
          {
            field: { twilioAuthToken: true },
            title: "Twilio Auth Token",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "Twilio Auth Token.",
            placeholder: "",
          },
          {
            field: { twilioPrimaryPhoneNumber: true },
            title: "Twilio Primary Phone",
            fieldType: FormFieldSchemaType.Phone,
            required: false,
            description: "Primary Twilio phone number.",
            placeholder: "",
          },
          {
            field: { twilioSecondaryPhoneNumbers: true },
            title: "Twilio Secondary Phones",
            fieldType: FormFieldSchemaType.LongText,
            required: false,
            description: "Additional Twilio phone numbers.",
            placeholder: "+1234567890, +4444444444",
          },
        ]}
        modelDetailProps={{
          modelType: GlobalConfig,
          id: "model-detail-global-config",
          fields: [
            {
              field: { callProviderType: true },
              title: "Call Provider",
              placeholder: "freeswitch",
            },
            {
              field: { freeSwitchSipServer: true },
              title: "SIP Server",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchSipPort: true },
              title: "SIP Port",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchSipUser: true },
              title: "SIP User",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchSipPassword: true },
              title: "SIP Password",
              placeholder: "********",
            },
            {
              field: { freeSwitchGatewayName: true },
              title: "SIP Gateway",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchDefaultCallerId: true },
              title: "Caller ID",
              fieldType: FieldType.Phone,
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchEventSocketHost: true },
              title: "ESL Host",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchEventSocketPort: true },
              title: "ESL Port",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchTtsEngine: true },
              title: "TTS Engine",
              placeholder: t("common.none"),
            },
            {
              field: { freeSwitchTtsVoice: true },
              title: "TTS Voice",
              placeholder: t("common.none"),
            },
            {
              field: { twilioAccountSID: true },
              title: "Twilio Account SID",
              placeholder: t("common.none"),
            },
            {
              field: { twilioPrimaryPhoneNumber: true },
              title: "Twilio Primary Phone",
              fieldType: FieldType.Phone,
              placeholder: t("common.none"),
            },
            {
              field: { twilioSecondaryPhoneNumbers: true },
              title: "Twilio Secondary Phones",
              fieldType: FieldType.LongText,
              placeholder: t("common.none"),
            },
          ],
          modelId: ObjectID.getZeroObjectID(),
        }}
      />

      {showTestCallModal ? (
        <BasicFormModal
          title="Send Test Call"
          description="Send a test call via FreeSwitch to verify the configuration."
          formProps={{
            error: testCallError,
            fields: [
              {
                field: {
                  toPhone: true,
                },
                title: "Phone Number",
                fieldType: FormFieldSchemaType.Phone,
                required: true,
                description: "Phone number to send the test call to.",
                placeholder: "+5511999999999",
              },
            ],
          }}
          submitButtonText="Send Test Call"
          onClose={() => {
            setShowTestCallModal(false);
            setTestCallError("");
          }}
          isLoading={isTestCallLoading}
          onSubmit={async (values: JSONObject) => {
            try {
              setIsTestCallLoading(true);
              setTestCallError("");

              const response:
                | HTTPResponse<EmptyResponseData>
                | HTTPErrorResponse = await API.post({
                url: URL.fromString(NOTIFICATION_URL.toString()).addRoute(
                  `/call/test-global`,
                ),
                data: {
                  toPhone: values["toPhone"],
                },
              });

              if (response.isSuccess()) {
                setIsTestCallLoading(false);
                setShowTestCallModal(false);
                setTestCallError("");
              }

              if (response instanceof HTTPErrorResponse) {
                throw response;
              }
            } catch (err) {
              setTestCallError(API.getFriendlyMessage(err));
              setIsTestCallLoading(false);
            }
          }}
        />
      ) : (
        <></>
      )}
    </Page>
  );
};

export default Settings;
