import PageComponentProps from "../PageComponentProps";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import React, { FunctionComponent, ReactElement } from "react";
import LogsDashboard from "../../Components/Logs/LogsDashboard";

const LogsInsightsPage: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  return <LogsDashboard />;
};

export default LogsInsightsPage;
