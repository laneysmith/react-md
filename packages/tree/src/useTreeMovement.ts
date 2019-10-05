import {
  FocusEventHandler,
  KeyboardEventHandler,
  useCallback,
  useRef,
} from "react";
import { ListElement } from "@react-md/list";
import {
  JumpMovementKey,
  MovementPresets,
  useActiveDescendantMovement,
  scrollIntoView,
} from "@react-md/utils";

import { TreeItemId, TreeProps, UnknownTreeItem } from "./types";
import useFlattenedTreeList, {
  SearchableTreeItem,
  TreeItemIdRefRecord,
} from "./useFlattenedTreeList";
import useNestedTreeList, { NestedTreeItem } from "./useNestedTreeList";

type Options = Pick<
  TreeProps<UnknownTreeItem>,
  | "id"
  | "data"
  | "sort"
  | "onBlur"
  | "onFocus"
  | "onKeyDown"
  | "multiSelect"
  | "selectedIds"
  | "onItemSelect"
  | "onMultiItemSelect"
  | "expandedIds"
  | "onItemExpansion"
  | "onMultiItemExpansion"
> &
  Required<
    Pick<TreeProps<UnknownTreeItem>, "valueKey" | "getItemValue" | "rootId">
  >;

interface ReturnValue {
  /**
   * A nested list representation of the provided tree data. This is used for rendering all
   * the treeitem nodes.
   */
  items: NestedTreeItem<UnknownTreeItem>[];

  /**
   * The current treeitem's DOM id that is currently keyboard focused.
   */
  activeId: string;

  /**
   * A function that updates the `activeId` based on the provided `itemId`. This should really
   * only be used whenever an item is clicked with a mouse or touch since the `activeId` will
   * be updated automatically for all the other flows.
   */
  setActiveId(itemId: TreeItemId): void;

  /**
   * A record containing the DOM ids for each tree item along with a ref object to provide
   * to the itemRenderer for that item. This is just for a quick lookup to help with all the
   * tree traversal and keyboard movement.
   */
  itemIdRefs: TreeItemIdRefRecord;

  /**
   * A blur handler that should be passed to the tree list element that handles removing the
   * `aria-activedescendant` when the tree is no longer within focus. This will also call the
   * optional `onBlur` prop.
   */
  handleBlur: FocusEventHandler<ListElement>;

  /**
   * A focus handler that should be passed to the tree element that handles conditionally setting
   * the default `aria-activedescendant` id on first focus. This will also call the optional `onFocus`
   * prop.
   */
  handleFocus: FocusEventHandler<ListElement>;

  /**
   * The keydown handler that should be passed to the tree list element that handles all the keyboard
   * functionality and movement.
   *
   * This will also call the optional `onKeyDown` prop.
   */
  handleKeyDown: KeyboardEventHandler<ListElement>;
}

/**
 *
 * @private
 */
export default function useTreeMovement({
  id,
  data,
  rootId,
  sort,
  onBlur,
  onFocus,
  onKeyDown,
  multiSelect,
  selectedIds,
  onItemSelect,
  onMultiItemSelect,
  expandedIds,
  onItemExpansion,
  onMultiItemExpansion,
  valueKey,
  getItemValue,
}: Options): ReturnValue {
  const items = useNestedTreeList(data, sort, rootId);
  const [visibleItems, itemIdRefs, flattenedItems] = useFlattenedTreeList({
    id,
    items,
    expandedIds,
    valueKey,
    getItemValue,
  });

  const {
    activeId,
    onKeyDown: handleKeyDown,
    focusedIndex,
    setFocusedIndex,
  } = useActiveDescendantMovement<
    SearchableTreeItem,
    ListElement,
    HTMLLIElement
  >({
    ...MovementPresets.VERTICAL_TREE,
    items: visibleItems,
    baseId: id,
    getId(_baseId, index) {
      return (visibleItems[index] || { id: "" }).id;
    },
    onSpace(focusedIndex) {
      const item = visibleItems[focusedIndex];
      if (!item) {
        return;
      }

      const { itemId } = item;
      onItemSelect(itemId);
    },
    onChange(data) {
      const { index, target, query } = data;
      const { itemId } = visibleItems[index];
      const item = itemIdRefs[itemId].ref.current;
      if (item && target && target.scrollHeight > target.offsetHeight) {
        scrollIntoView(target, item);
      }

      if (!multiSelect) {
        return;
      }

      const isToStart = query.endsWith(JumpMovementKey.ControlShiftHome);
      const isToEnd = query.endsWith(JumpMovementKey.ControlShiftEnd);
      if (!isToStart && !isToEnd) {
        return;
      }

      const start = isToStart ? 0 : focusedIndex;
      const end = isToStart ? index : undefined;
      const jumpSelectedIds = visibleItems
        .slice(start, end)
        .map(({ itemId }) => itemId);
      const uniqueSelectedIds = Array.from(
        new Set([...selectedIds, ...jumpSelectedIds])
      );
      if (selectedIds.length !== uniqueSelectedIds.length) {
        onMultiItemSelect(uniqueSelectedIds);
      }
    },
    onKeyDown(event) {
      if (onKeyDown) {
        onKeyDown(event);
      }

      const item = visibleItems[focusedIndex];
      if (!item) {
        return;
      }

      const { itemId, parentId, isParent } = item;
      switch (event.key) {
        case "Enter": {
          if (isParent) {
            onItemExpansion(itemId, !expandedIds.includes(itemId));
            return;
          }

          const node = itemIdRefs[itemId].ref.current;
          const anchor =
            node &&
            node.getAttribute("role") === "none" &&
            node.querySelector<HTMLAnchorElement>("a[href]");
          if (!anchor) {
            onItemSelect(itemId);
            return;
          }

          anchor.click();
          break;
        }
        case "ArrowRight":
          if (!isParent) {
            return;
          }

          if (!expandedIds.includes(itemId)) {
            onItemExpansion(itemId, true);
          } else {
            setFocusedIndex(focusedIndex + 1);
          }
          break;
        case "ArrowLeft":
          if (isParent && expandedIds.includes(itemId)) {
            onItemExpansion(itemId, false);
          } else if (parentId !== rootId) {
            const parentIndex = visibleItems.findIndex(
              item => item.itemId === parentId
            );
            setFocusedIndex(parentIndex);
          }
          break;
        case "a":
          if (multiSelect && event.ctrlKey) {
            event.preventDefault();
            const allItemIds = visibleItems.map(({ itemId }) => itemId);
            if (selectedIds.length === allItemIds.length) {
              onMultiItemSelect([]);
            } else {
              onMultiItemSelect(allItemIds);
            }
          }
          break;
        case "*": {
          const item = visibleItems[focusedIndex];
          if (!item) {
            return;
          }

          const expectedExpandedIds = visibleItems
            .filter(
              ({ isParent, parentId }) => isParent && parentId === item.parentId
            )
            .map(({ itemId }) => itemId);
          const nextIds = Array.from(
            new Set([...expandedIds, ...expectedExpandedIds])
          );
          if (nextIds.length !== expandedIds.length) {
            const index = flattenedItems.findIndex(
              ({ itemId }) => itemId === item.itemId
            );

            onMultiItemExpansion(nextIds);
            if (index !== -1) {
              setFocusedIndex(index);
            }
          }
        }
        // no default
      }
    },
  });

  const lastFocus = useRef(0);
  const handleBlur = useCallback(
    (event: React.FocusEvent<ListElement>) => {
      if (onBlur) {
        onBlur(event);
      }

      if (
        document.activeElement &&
        event.currentTarget.contains(document.activeElement)
      ) {
        return;
      }

      lastFocus.current = focusedIndex;
      setFocusedIndex(-1);
    },
    [focusedIndex, onBlur, setFocusedIndex]
  );

  const handleFocus = useCallback(
    (event: React.FocusEvent<ListElement>) => {
      if (onFocus) {
        onFocus(event);
      }

      if (selectedIds.length) {
        const index = visibleItems.findIndex(item =>
          selectedIds.includes(item.itemId)
        );
        if (index !== -1) {
          setFocusedIndex(index);
          return;
        }
      }

      if (focusedIndex === -1) {
        const index = Math.max(
          0,
          Math.min(lastFocus.current, visibleItems.length)
        );
        setFocusedIndex(index);
      }
    },
    [focusedIndex, onFocus, selectedIds, setFocusedIndex, visibleItems]
  );

  const setActiveId = useCallback(
    (itemId: TreeItemId) => {
      const index = visibleItems.findIndex(item => item.itemId === itemId);
      if (index !== -1) {
        setFocusedIndex(index);
      }
    },
    [setFocusedIndex, visibleItems]
  );

  return {
    items,
    activeId,
    setActiveId,
    itemIdRefs,
    handleBlur,
    handleFocus,
    handleKeyDown,
  };
}
