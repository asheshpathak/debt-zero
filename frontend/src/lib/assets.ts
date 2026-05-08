import type { AssetCategory } from "@/types";

export function sumEnabledAssets(categories: AssetCategory[] | undefined): number {
  if (!categories?.length) return 0;
  return categories
    .filter((c) => c.enabled)
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
}

export function defaultAssetCategories(): AssetCategory[] {
  return [
    { key: "cash", enabled: true },
    { key: "savings", enabled: true },
    { key: "investments", enabled: true },
    { key: "security_fund", enabled: true },
    { key: "property", enabled: true },
    { key: "gold", enabled: true },
    { key: "others", enabled: true },
  ];
}
