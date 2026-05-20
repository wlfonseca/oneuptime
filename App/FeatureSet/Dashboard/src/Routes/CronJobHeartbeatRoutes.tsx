import ComponentProps from "../Pages/PageComponentProps";
import PageMap from "../Utils/PageMap";
import RouteMap from "../Utils/RouteMap";
import Route from "Common/Types/API/Route";
import React, { FunctionComponent, ReactElement } from "react";
import { Route as PageRoute, Routes } from "react-router-dom";

import CronJobHeartbeat from "../Pages/CronJobHeartbeat/CronJobHeartbeat";

const CronJobHeartbeatRoutes: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  return (
    <Routes>
      <PageRoute
        path=""
        element={
          <CronJobHeartbeat
            {...props}
            pageRoute={RouteMap[PageMap.CRON_JOB_HEARTBEAT] as Route}
          />
        }
      />
    </Routes>
  );
};

export default CronJobHeartbeatRoutes;
