import PageComponentProps from "../PageComponentProps";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import React, { FunctionComponent, ReactElement } from "react";
import ExceptionsViewer from "../../Components/Exceptions/ExceptionsViewer";

const ArchivedExceptionsPage: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  return <ExceptionsViewer defaultStatus="archived" />;
};

export default ArchivedExceptionsPage;
