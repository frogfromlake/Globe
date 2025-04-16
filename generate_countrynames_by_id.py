import json

with open("public/geojson/countries.geojson") as f:
    geojson = json.load(f)

lookup = {}

for feature in geojson["features"]:
    iso = feature["properties"]["ISO_N3"]
    name = feature["properties"]["ADMIN"] or feature["properties"]["name"]
    try:
        lookup[int(iso)] = name
    except:
        continue  # skip weird entries

with open("public/country_names_by_id.json", "w") as f:
    json.dump(lookup, f, indent=2)
