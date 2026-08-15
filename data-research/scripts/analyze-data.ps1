[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ResearchRoot = Split-Path -Parent $PSScriptRoot
$RawDir = Join-Path $ResearchRoot 'raw'
$DerivedDir = Join-Path $ResearchRoot 'derived'
New-Item -ItemType Directory -Force -Path $DerivedDir | Out-Null

function Read-GeoJson([string]$Name) {
    $Path = Join-Path $RawDir $Name
    return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Group-Count($Values) {
    return @($Values | Group-Object | Sort-Object Count -Descending | ForEach-Object {
        [ordered]@{ value = if ($null -eq $_.Name -or $_.Name -eq '') { '(blank)' } else { $_.Name }; count = $_.Count }
    })
}

function Get-PoiCategory([string]$FeatureType) {
    if ($FeatureType -match 'Park|Protected Area|Conservation Area|Ecological Reserve|Wildlife Area') { return 'park_reference' }
    if ($FeatureType -match 'Lake|Lakes|Pond|Ponds|Reservoir|River|Creek|Brook|Stream|Falls|Waterfall|Cascade|Rapids|Spring|Slough|Marsh|Swamp|Bog|Whirlpool') { return 'freshwater' }
    if ($FeatureType -match 'Bay|Bays|Cove|Inlet|Harbour|Ocean|Sea|Strait|Sound|Channel|Passage|Narrows|Lagoon|Arm|Bight|Reef|Shoal|Anchorage|Port \(1\)|Beach|Beaches|Shore|Spit|Point|Cape|Peninsula|Island|Islands|Islet|Islets|Archipelago') { return 'coast_island' }
    if ($FeatureType -match 'Mount|Mountain|Peak|Summit|Range|Ridge|Hill|Hills|Butte|Bluff|Cliff|Canyon|Valley|Plateau|Plain|Bench|Pass \(2\)|Gorge|Ravine|Cave|Caves|Crater|Volcano|Cirque|Dome|Escarpment|Gap|Gulch|Knob|Knoll|Pinnacle|Spire|Notch|Crag') { return 'terrain' }
    if ($FeatureType -match 'Glacier|Glaciers|Ice Cap|Icefield|Névé|Snowfield') { return 'ice_snow' }
    if ($FeatureType -match 'Trail|Portage|Lookout|Picnic Area|Recreation Facility|Fishing Site|Camp|Landing \(1\)') { return 'recreation' }
    if ($FeatureType -match 'Historic|Heritage|Historical Route|Site du patrimoine mondial') { return 'heritage' }
    if ($FeatureType -match 'Forest|Meadow|Prairie') { return 'vegetation' }
    if ($FeatureType -match 'City|Community|Locality|Settlement|Town|Village|Post Office|Regional District|Municipality|Province|Land District|First Nation Village') { return 'populated_administrative' }
    if ($FeatureType -match 'Indian Reserve|Forces canadiennes|Canadian Forces|Military') { return 'reserve_military' }
    return 'other'
}

function Get-StagingKey($Row) {
    $Basis = @($Row.'Official Name', $Row.'Feature Type Code', $Row.LatDD, $Row.LongDD) -join '|'
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Basis.ToLowerInvariant())
    $Hasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        $Hash = $Hasher.ComputeHash($Bytes)
        return 'gazetteer:' + (($Hash[0..11] | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $Hasher.Dispose()
    }
}

function Test-BcCoordinate($Row) {
    $Latitude = 0.0
    $Longitude = 0.0
    $Style = [Globalization.NumberStyles]::Float
    $Culture = [Globalization.CultureInfo]::InvariantCulture
    $HasLatitude = [double]::TryParse($Row.LatDD, $Style, $Culture, [ref]$Latitude)
    $HasLongitude = [double]::TryParse($Row.LongDD, $Style, $Culture, [ref]$Longitude)
    return $HasLatitude -and $HasLongitude -and
        $Latitude -ge 48 -and $Latitude -le 61 -and
        $Longitude -ge -140 -and $Longitude -le -113
}

$Provincial = Read-GeoJson 'bc-parks-protected-areas.geojson'
$Conservancies = Read-GeoJson 'bc-conservancies.geojson'
$NationalCanada = Read-GeoJson 'canada-national-parks.geojson'
$Gazetteer = @(Import-Csv -LiteralPath (Join-Path $RawDir 'bc-gazetteer.csv') -Encoding utf8)
$NamesMap = Read-GeoJson 'bc-geographical-names.geojson'

$NationalBc = @($NationalCanada.features | Where-Object {
    $RegionValues = @($_.properties.adminRegion, $_.properties.adminRegionEng, $_.properties.jurisdiction, $_.properties.jurisdictionEng)
    ($RegionValues -join ' ') -match 'British Columbia|\bBC\b'
})

$PoiTypeColumn = @('FEATURE_TYPE', 'Feature Type', 'FEATURE_TYPE_NAME', 'FEATURETYPE') |
    Where-Object { $Gazetteer.Count -gt 0 -and $Gazetteer[0].PSObject.Properties.Name -contains $_ } |
    Select-Object -First 1

$Summary = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    provincial = [ordered]@{
        featureCount = @($Provincial.features).Count
        geometryTypes = Group-Count @($Provincial.features.geometry.type)
        designations = Group-Count @($Provincial.features.properties.PROTECTED_LANDS_DESIGNATION)
        parkClasses = Group-Count @($Provincial.features.properties.PARK_CLASS)
    }
    conservancies = [ordered]@{
        featureCount = @($Conservancies.features).Count
        geometryTypes = Group-Count @($Conservancies.features.geometry.type)
    }
    national = [ordered]@{
        canadaFeatureCount = @($NationalCanada.features).Count
        bcFeatureCount = $NationalBc.Count
        bcNames = @($NationalBc | ForEach-Object { $_.properties.adminAreaNameEng } | Sort-Object -Unique)
        bcTypes = Group-Count @($NationalBc.properties.distributionTypeEng)
    }
    gazetteer = [ordered]@{
        rowCount = $Gazetteer.Count
        columns = if ($Gazetteer.Count -gt 0) { @($Gazetteer[0].PSObject.Properties.Name) } else { @() }
        featureTypeColumn = $PoiTypeColumn
        topFeatureTypes = if ($PoiTypeColumn) { Group-Count @($Gazetteer.$PoiTypeColumn) | Select-Object -First 40 } else { @() }
        poiCategories = Group-Count @($Gazetteer | ForEach-Object { Get-PoiCategory $_.'Feature Type' })
        validCoordinateCount = @($Gazetteer | Where-Object { Test-BcCoordinate $_ }).Count
        invalidCoordinateCount = @($Gazetteer | Where-Object { -not (Test-BcCoordinate $_) }).Count
        richMapLayerFeatureCount = @($NamesMap.features).Count
    }
}

$Summary | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $DerivedDir 'source-summary.json')

$NationalBcCollection = [ordered]@{
    type = 'FeatureCollection'
    name = 'bc-national-parks-and-reserves'
    features = $NationalBc
}
$NationalBcCollection | ConvertTo-Json -Depth 100 -Compress | Set-Content -Encoding utf8 (Join-Path $DerivedDir 'bc-national-parks.geojson')

$PoiCandidates = @($Gazetteer | ForEach-Object {
    $Category = Get-PoiCategory $_.'Feature Type'
    $CoordinateValid = Test-BcCoordinate $_
    [pscustomobject][ordered]@{
        staging_key = Get-StagingKey $_
        name = $_.'Official Name'
        poi_category = $Category
        include_v1 = $CoordinateValid -and $Category -notin @('populated_administrative', 'reserve_military', 'other')
        coordinate_valid = $CoordinateValid
        feature_type = $_.'Feature Type'
        feature_type_code = $_.'Feature Type Code'
        latitude = $_.LatDD
        longitude = $_.LongDD
        datum = $_.Datum
        mapsheet = $_.Mapsheet
        source = 'BC Gazetteer'
    }
})
$PoiCandidates | Export-Csv -NoTypeInformation -Encoding utf8 -LiteralPath (Join-Path $DerivedDir 'bc-poi-candidates.csv')

$DesignationLines = @($Summary.provincial.designations | ForEach-Object { "- $($_.value): $($_.count)" })
$NationalLines = @($Summary.national.bcNames | ForEach-Object { "- $_" })
$PoiLines = @($Summary.gazetteer.topFeatureTypes | Select-Object -First 20 | ForEach-Object { "- $($_.value): $($_.count)" })
$PoiCategoryLines = @($Summary.gazetteer.poiCategories | ForEach-Object { "- $($_.value): $($_.count)" })

$Report = @"
# Data inventory

Generated: $($Summary.generatedAt)

## Polygon sources

- TANTALIS parks/protected areas: $($Summary.provincial.featureCount) features.
- TANTALIS conservancies: $($Summary.conservancies.featureCount) features.
- National boundary source: $($Summary.national.canadaFeatureCount) Canadian features, of which $($Summary.national.bcFeatureCount) matched British Columbia.

### Provincial designations

$($DesignationLines -join "`n")

### British Columbia national parks/reserves

$($NationalLines -join "`n")

## Gazetteer

- Rows: $($Summary.gazetteer.rowCount)
- Detected feature-type column: $($Summary.gazetteer.featureTypeColumn)
- Columns: $($Summary.gazetteer.columns -join ', ')
- Rich public map-layer subset: $($Summary.gazetteer.richMapLayerFeatureCount) records.
- Valid BC coordinates: $($Summary.gazetteer.validCoordinateCount)
- Invalid coordinates retained but excluded from V1: $($Summary.gazetteer.invalidCoordinateCount)

The complete CSV lacks a government-issued record ID. `derived/bc-poi-candidates.csv`
therefore uses a deterministic staging hash based on name, feature type code,
and coordinates. The hash is not an authoritative identifier.

### Candidate categories

$($PoiCategoryLines -join "`n")

### Most common feature types

$($PoiLines -join "`n")

## Initial conclusions

- The two TANTALIS feeds must be combined to cover provincial designations.
- The national service is Canada-wide, so retain the raw snapshot and use the derived BC-only GeoJSON.
- Gazetteer records are point POIs and should remain separate from park polygons.
- Raw source fields and IDs should be preserved when this moves into PostGIS.
"@

$Report | Set-Content -Encoding utf8 (Join-Path $ResearchRoot 'DATA-INVENTORY.md')
Write-Host "Analysis written to $DerivedDir and DATA-INVENTORY.md"
