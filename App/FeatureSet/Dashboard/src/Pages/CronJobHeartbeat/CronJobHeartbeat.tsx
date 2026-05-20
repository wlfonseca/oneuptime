import CronJobHeartbeatScript from "../../Components/Monitor/IncomingRequestMonitor/CronJobHeartbeatScript";
import PageComponentProps from "../PageComponentProps";
import React, { Fragment, FunctionComponent, ReactElement } from "react";

const CronJobHeartbeat: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  return (
    <Fragment>
      <CronJobHeartbeatScript />
    </Fragment>
  );
};

export default CronJobHeartbeat;
