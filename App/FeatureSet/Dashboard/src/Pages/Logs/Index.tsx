import PageComponentProps from "../PageComponentProps";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import React, { FunctionComponent, ReactElement } from "react";
import DashboardLogsViewer from "../../Components/Logs/LogsViewer";

const LogsPage: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  return (
    <DashboardLogsViewer
      showFilters={true}
      serviceIds={[]}
      limit={100}
      enableRealtime={true}
      id="logs"
    />
  );
};

export default LogsPage;
