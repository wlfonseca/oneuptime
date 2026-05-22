import PageComponentProps from "../PageComponentProps";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import React, { FunctionComponent, ReactElement } from "react";
import MetricsViewer from "../../Components/Metrics/MetricsViewer";

const MetricsPage: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  return <MetricsViewer />;
};

export default MetricsPage;
