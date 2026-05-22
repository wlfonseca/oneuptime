import PageComponentProps from "../PageComponentProps";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import React, { FunctionComponent, ReactElement } from "react";
import ExceptionsDashboard from "../../Components/Exceptions/ExceptionsDashboard";

const ExceptionsOverviewPage: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  return <ExceptionsDashboard />;
};

export default ExceptionsOverviewPage;
