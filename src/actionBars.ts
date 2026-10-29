export const ACTION_BARS = [
  { bar: 1, label: "Pasek 1", firstSlot: 1 },
  { bar: 2, label: "Pasek 2", firstSlot: 61 },
  { bar: 3, label: "Pasek 3", firstSlot: 49 },
  { bar: 4, label: "Pasek 4", firstSlot: 25 },
  { bar: 5, label: "Pasek 5", firstSlot: 37 },
  { bar: 6, label: "Pasek 6", firstSlot: 145 },
  { bar: 7, label: "Pasek 7", firstSlot: 157 },
  { bar: 8, label: "Pasek 8", firstSlot: 169 },
] as const;

export function actionSlot(bar: number, position: number): number | undefined {
  const selected = ACTION_BARS.find((entry) => entry.bar === bar);

  if (!selected || !Number.isInteger(position) || position < 1 || position > 12) {
    return undefined;
  }

  return selected.firstSlot + position - 1;
}

export function deckBridgeSlot(bar: number, position: number): number | undefined {
  if (!Number.isInteger(bar) || bar < 1 || bar > ACTION_BARS.length) {
    return undefined;
  }

  if (!Number.isInteger(position) || position < 1 || position > 12) {
    return undefined;
  }

  return (bar - 1) * 12 + position;
}
