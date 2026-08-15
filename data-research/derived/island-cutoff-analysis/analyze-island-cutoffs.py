from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


OUTPUT_DIR = Path(__file__).resolve().parent
SOURCE = OUTPUT_DIR.parent / "vancouver-island-islands.geojson"
CUTOFFS_HA = [0, 0.1, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000]


def coordinate_positions(value: object) -> int:
    if isinstance(value, list) and value and isinstance(value[0], (int, float)):
        return 1
    if isinstance(value, list):
        return sum(coordinate_positions(child) for child in value)
    return 0


with SOURCE.open("r", encoding="utf-8-sig") as source_file:
    collection = json.load(source_file)

features = collection["features"]
source_count = len(features)
source_vertices = sum(
    coordinate_positions(feature["geometry"]["coordinates"]) for feature in features
)
source_areas = [float(feature["properties"]["AREA_HA"]) for feature in features]

rows: list[dict[str, int | float]] = []
for cutoff in CUTOFFS_HA:
    retained = [
        feature
        for feature in features
        if float(feature["properties"]["AREA_HA"]) >= cutoff
    ]
    type_counts = {"Marine": 0, "Fresh": 0, "Marine/Fresh": 0}
    named_count = 0
    vertices = 0
    for feature in retained:
        properties = feature["properties"]
        type_counts[properties["ISLAND_TYPE"]] += 1
        named_count += bool(properties.get("GNIS_NAME_1"))
        vertices += coordinate_positions(feature["geometry"]["coordinates"])

    rows.append(
        {
            "cutoff_ha": cutoff,
            "island_count": len(retained),
            "marine_count": type_counts["Marine"],
            "fresh_count": type_counts["Fresh"],
            "marine_fresh_count": type_counts["Marine/Fresh"],
            "named_count": named_count,
            "unnamed_count": len(retained) - named_count,
            "coordinate_positions": vertices,
            "features_retained_pct": round(100 * len(retained) / source_count, 2),
            "coordinate_positions_retained_pct": round(
                100 * vertices / source_vertices, 2
            ),
        }
    )

csv_path = OUTPUT_DIR / "island-counts-by-cutoff.csv"
with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
    writer = csv.DictWriter(csv_file, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

json_path = OUTPUT_DIR / "island-counts-by-cutoff.json"
payload = {
    "source": str(SOURCE),
    "source_collection_name": collection.get("name"),
    "source_feature_count": source_count,
    "source_minimum_area_ha": min(source_areas),
    "source_maximum_area_ha": max(source_areas),
    "source_coordinate_positions": source_vertices,
    "source_query": {
        "layer": "BC Freshwater Atlas Islands (FWA_ISLANDS_POLY)",
        "working_extent_wgs84": [-129.15, 48.18, -122.88, 51.15],
        "spatial_predicate": "intersects",
        "upstream_minimum_area_ha": 1,
    },
    "interpretation": (
        "Counts are FWA polygon features intersecting the rectangular working "
        "extent, not a count of the agreed Vancouver Island tourism region. "
        "The source was already filtered to AREA_HA >= 1, so cutoffs below one "
        "hectare cannot reveal smaller source features."
    ),
    "recommended_cutoff_ha": 10,
    "recommendation": (
        "Use 10 ha as a background-island baseline, then retain explicitly "
        "selected visitor islands and islands intersecting park polygons at any "
        "available size. Apply geometry simplification separately; an area "
        "cutoff alone removes features much faster than coordinate positions."
    ),
    "cutoffs": rows,
}
with json_path.open("w", encoding="utf-8") as json_file:
    json.dump(payload, json_file, indent=2)
    json_file.write("\n")

labels = [str(cutoff) for cutoff in CUTOFFS_HA]
counts = [int(row["island_count"]) for row in rows]
colors = ["#3B82F6" if cutoff == 10 else "#94A3B8" for cutoff in CUTOFFS_HA]

fig, ax = plt.subplots(figsize=(11, 6.2))
fig.subplots_adjust(left=0.09, right=0.98, top=0.9, bottom=0.18)
bars = ax.bar(labels, counts, color=colors, width=0.72)
ax.set_title("FWA island features retained by minimum-area cutoff", fontsize=16)
ax.set_xlabel("Minimum island area (hectares)")
ax.set_ylabel("Island polygon features retained")
ax.grid(axis="y", color="#CBD5E1", linewidth=0.7, alpha=0.8)
ax.set_axisbelow(True)
ax.spines[["top", "right"]].set_visible(False)
ax.margins(y=0.12)

for bar, count in zip(bars, counts, strict=True):
    ax.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 45,
        f"{count:,}",
        ha="center",
        va="bottom",
        fontsize=9,
    )

ax.annotate(
    "Recommended baseline\n630 features",
    xy=(labels.index("10"), counts[labels.index("10")]),
    xytext=(labels.index("10") + 1.2, 1900),
    arrowprops={"arrowstyle": "->", "color": "#1D4ED8"},
    color="#1D4ED8",
    fontsize=10,
    ha="left",
)
fig.text(
    0.01,
    0.035,
    "Source snapshot already excludes islands smaller than 1 ha; 0–1 ha therefore have identical counts.",
    fontsize=9,
    color="#475569",
)

for extension in ("png", "svg"):
    fig.savefig(
        OUTPUT_DIR / f"island-counts-by-cutoff.{extension}",
        dpi=180,
        metadata={"Creator": "Every Park data research"},
    )
plt.close(fig)

print(json.dumps({"csv": str(csv_path), "json": str(json_path), "rows": rows}))
