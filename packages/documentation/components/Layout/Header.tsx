import React, { FunctionComponent } from "react";
import { AppBar, AppBarTitle, AppBarNav } from "@react-md/app-bar";
import { MenuSVGIcon } from "@react-md/material-icons";

import ToggleRTL from "./ToggleRTL";
import ToggleTheme from "./ToggleTheme";
import GithubLink from "components/GithubLink";

interface Props {
  title: string;
  toggle: () => void;
  isDesktop: boolean;
}

const Header: FunctionComponent<Props> = ({ title, toggle, isDesktop }) => (
  <AppBar id="main-app-bar" fixed>
    {!isDesktop && (
      <AppBarNav id="main-nav-toggle" onClick={toggle}>
        <MenuSVGIcon />
      </AppBarNav>
    )}
    <AppBarTitle keyline={isDesktop}>{title}</AppBarTitle>
    <ToggleTheme />
    <GithubLink id="main-github-link" />
    <ToggleRTL />
  </AppBar>
);

export default Header;