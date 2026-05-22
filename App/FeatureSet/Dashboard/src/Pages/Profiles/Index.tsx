import PageComponentProps from "../PageComponentProps";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import React, { FunctionComponent, ReactElement } from "react";
import ProfilesDashboard from "../../Components/Profiles/ProfilesDashboard";

const ProfilesPage: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  return <ProfilesDashboard />;
};

export default ProfilesPage;
