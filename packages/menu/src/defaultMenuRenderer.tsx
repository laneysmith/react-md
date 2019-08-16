import React, { ReactNode, ReactElement } from "react";
import { List } from "@react-md/list";
import { LabelRequiredForA11y } from "@react-md/utils";

import { RenderConditionalPortalProps } from "@react-md/portal";
import { Item } from "./defaultItemRenderer";
import Menu, { MenuProps } from "./Menu";

export type MenuPositionProps = Pick<
  MenuProps,
  | "anchor"
  | "horizontal"
  | "positionOptions"
  | "disableCloseOnScroll"
  | "disableCloseOnResize"
>;

type RequiredMenuProps = Required<
  Pick<
    MenuProps,
    | "id"
    | "visible"
    | "onRequestClose"
    | "controlId"
    | "children"
    | "defaultFocus"
  >
>;

export interface InjectedMenuProps
  extends MenuPositionProps,
    RequiredMenuProps,
    RenderConditionalPortalProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

export type MenuRenderer = (
  props: LabelRequiredForA11y<InjectedMenuProps>,
  items: Item[]
) => ReactNode;

/**
 * The default menu renderer that will just render the `Menu` component along with
 * a `List` by passing all props down to the main `Menu` component.
 */
export default function defaultMenuRenderer({
  horizontal,
  children,
  ...props
}: LabelRequiredForA11y<InjectedMenuProps>): ReactElement {
  return (
    <Menu {...props} horizontal={horizontal}>
      <List horizontal={horizontal}>{children}</List>
    </Menu>
  );
}