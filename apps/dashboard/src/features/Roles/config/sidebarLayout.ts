type SidebarNode = { id: string; children?: SidebarNode[] };

/**
 * The menu as the role can use it: the pages it may open, and the groups that
 * still hold one. A page without its View permission never reaches the role's
 * sidebar, so the editor does not offer it.
 */
export function reachableSidebarItems<T extends SidebarNode>(items: readonly T[], reachable: (page: T) => boolean): T[] {
  return items.flatMap((item) => {
    if (!item.children) return reachable(item) ? [item] : [];
    const children = reachableSidebarItems(item.children as T[], reachable);
    return children.length > 0 ? [{ ...item, children }] : [];
  });
}

/** Pages left out by `reachableSidebarItems`. */
export function hiddenSidebarPageCount(all: readonly SidebarNode[], shown: readonly SidebarNode[]): number {
  const pages = (items: readonly SidebarNode[]): number => items.reduce((sum, item) => sum + (item.children ? pages(item.children) : 1), 0);
  return pages(all) - pages(shown);
}

/**
 * A reorder of the shown items, applied to the whole menu: the shown items take
 * the places shown items held, in their new order, and every hidden item keeps
 * its own. A page granted later then appears where it was.
 */
export function mergeSidebarReorder<T extends SidebarNode>(all: readonly T[], shown: readonly T[]): T[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  const moved = shown.filter((item) => byId.has(item.id));
  const movedIds = new Set(moved.map((item) => item.id));
  let next = 0;
  return all.map((item) => {
    if (!movedIds.has(item.id)) return item;
    const placed = moved[next++];
    const original = byId.get(placed.id)!;
    return original.children
      ? { ...original, children: mergeSidebarReorder(original.children as T[], (placed.children ?? []) as T[]) }
      : original;
  });
}
