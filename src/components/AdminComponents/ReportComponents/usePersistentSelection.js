import { useCallback } from "react";

export function usePersistentSelection(storageKey) {
  const saveSelection = useCallback(
    (api) => {
      const rows = api.getSelectedRows();
      const ids = rows.map((row) => `${row.material_id}_${row.machine_start}`);

      localStorage.setItem(storageKey, JSON.stringify(ids));
    },
    [storageKey],
  );

  const restoreSelection = useCallback(
    (api) => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;

      const ids = JSON.parse(stored);

      api.forEachNode((node) => {
        const id = `${node.data.material_id}_${node.data.machine_start}`;
        if (ids.includes(id)) node.setSelected(true);
      });
    },
    [storageKey],
  );

  return { saveSelection, restoreSelection };
}
