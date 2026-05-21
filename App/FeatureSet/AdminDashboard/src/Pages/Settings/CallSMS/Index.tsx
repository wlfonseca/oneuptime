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
import React, { FunctionComponent, ReactElement } from "react";
import { useTranslation } from "react-i18next";

const Settings: FunctionComponent = (): ReactElement => {
  const { t } = useTranslation();
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
            description:
              "Select your call provider: twilio or freeswitch. Twilio is the default.",
            placeholder: "Select provider",
            dropdownOptions: [
              {
                label: "Twilio",
                value: "twilio",
              },
              {
                label: "FreeSwitch (SIP)",
                value: "freeswitch",
              },
            ],
          },
          {
            field: {
              twilioAccountSID: true,
            },
            title: "Twilio Account SID",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "You can find this in your Twilio console.",
            placeholder: "",
          },
          {
            field: {
              twilioAuthToken: true,
            },
            title: "Twilio Auth Token",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "You can find this in your Twilio console.",
            placeholder: "",
          },
          {
            field: {
              twilioPrimaryPhoneNumber: true,
            },
            title: "Primary Twilio Phone Number",
            fieldType: FormFieldSchemaType.Phone,
            required: false,
            description: "You can find this in your Twilio console.",
            placeholder: "",
          },
          {
            field: {
              twilioSecondaryPhoneNumbers: true,
            },
            title: "Secondary Twilio Phone Number",
            fieldType: FormFieldSchemaType.LongText,
            required: false,
            description:
              "If you have bought more phone numbers from Twilio for specific countries, you can add them here.",
            placeholder: "+1234567890, +4444444444",
          },
          {
            field: {
              freeSwitchEventSocketHost: true,
            },
            title: "FreeSwitch ESL Host",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description:
              "FreeSwitch Event Socket host address. Default: freeswitch",
            placeholder: "freeswitch",
          },
          {
            field: {
              freeSwitchEventSocketPort: true,
            },
            title: "FreeSwitch ESL Port",
            fieldType: FormFieldSchemaType.Number,
            required: false,
            description: "FreeSwitch Event Socket port. Default: 8021",
            placeholder: "8021",
          },
          {
            field: {
              freeSwitchEventSocketPassword: true,
            },
            title: "FreeSwitch ESL Password",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "FreeSwitch Event Socket password. Default: ClueCon",
            placeholder: "ClueCon",
          },
          {
            field: {
              freeSwitchGatewayName: true,
            },
            title: "FreeSwitch Gateway Name",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description:
              "SIP gateway name configured in FreeSwitch (e.g., trunk-provider).",
            placeholder: "",
          },
          {
            field: {
              freeSwitchDefaultCallerId: true,
            },
            title: "FreeSwitch Default Caller ID",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description: "Default caller ID number for outbound calls.",
            placeholder: "+5511999999999",
          },
          {
            field: {
              freeSwitchTtsEngine: true,
            },
            title: "FreeSwitch TTS Engine",
            fieldType: FormFieldSchemaType.Dropdown,
            required: false,
            description:
              "Text-to-speech engine. Options: flite, pico, say. Default: flite",
            dropdownOptions: [
              { label: "Flite (padrao)", value: "flite" },
              { label: "Pico", value: "pico" },
              { label: "Say", value: "say" },
            ],
          },
          {
            field: {
              freeSwitchTtsVoice: true,
            },
            title: "FreeSwitch TTS Voice",
            fieldType: FormFieldSchemaType.Text,
            required: false,
            description:
              "TTS voice name. For flite: slt (female), rms (male), kal (male). Default: slt",
            placeholder: "slt",
          },
        ]}
        modelDetailProps={{
          modelType: GlobalConfig,
          id: "model-detail-global-config",
          fields: [
            {
              field: {
                callProviderType: true,
              },
              title: "Call Provider",
              placeholder: "twilio",
            },
            {
              field: {
                twilioAccountSID: true,
              },
              title: "Twilio Account SID",
              placeholder: t("common.none"),
            },
            {
              field: {
                twilioPrimaryPhoneNumber: true,
              },
              title: "Primary Twilio Phone Number",
              fieldType: FieldType.Phone,
              placeholder: t("common.none"),
            },
            {
              field: {
                twilioSecondaryPhoneNumbers: true,
              },
              title: "Secondary Twilio Phone Numbers",
              fieldType: FieldType.LongText,
              placeholder: t("common.none"),
            },
            {
              field: {
                freeSwitchEventSocketHost: true,
              },
              title: "FreeSwitch ESL Host",
              placeholder: t("common.none"),
            },
            {
              field: {
                freeSwitchGatewayName: true,
              },
              title: "FreeSwitch Gateway",
              placeholder: t("common.none"),
            },
            {
              field: {
                freeSwitchTtsEngine: true,
              },
              title: "FreeSwitch TTS Engine",
              placeholder: t("common.none"),
            },
            {
              field: {
                freeSwitchTtsVoice: true,
              },
              title: "FreeSwitch TTS Voice",
              placeholder: t("common.none"),
            },
          ],
          modelId: ObjectID.getZeroObjectID(),
        }}
      />
    </Page>
  );
};

export default Settings;
