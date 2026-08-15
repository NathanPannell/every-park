[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ResearchRoot = Split-Path -Parent $PSScriptRoot
$RawDir = Join-Path $ResearchRoot 'raw'
$DerivedDir = Join-Path $ResearchRoot 'derived'
New-Item -ItemType Directory -Force -Path $RawDir, $DerivedDir | Out-Null

$Layer = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_basemapping/MapServer/46'
$Extent = '-129.15,48.18,-122.88,51.15'
$Features = [Collections.Generic.List[object]]::new()
$LastObjectId = -1

while ($true) {
    $Where = "AREA_HA >= 1 AND OBJECTID > $LastObjectId"
    $Parameters = [ordered]@{
        where = $Where
        geometry = $Extent
        geometryType = 'esriGeometryEnvelope'
        inSR = '4326'
        spatialRel = 'esriSpatialRelIntersects'
        outFields = 'OBJECTID,ISLAND_ID,ISLAND_TYPE,GNIS_ID_1,GNIS_NAME_1,GNIS_ID_2,GNIS_NAME_2,GNIS_ID_3,GNIS_NAME_3,AREA_HA,FEATURE_CODE'
        returnGeometry = 'true'
        outSR = '4326'
        orderByFields = 'OBJECTID ASC'
        resultRecordCount = '1000'
        f = 'geojson'
    }
    $Query = ($Parameters.GetEnumerator() | ForEach-Object {
        "$([uri]::EscapeDataString($_.Key))=$([uri]::EscapeDataString([string]$_.Value))"
    }) -join '&'
    $Page = Invoke-RestMethod -Uri "$Layer/query?$Query"
    $PageFeatures = @($Page.features)
    if ($PageFeatures.Count -eq 0) { break }
    foreach ($Feature in $PageFeatures) { $Features.Add($Feature) }
    $LastObjectId = ($PageFeatures | ForEach-Object { [long]$_.properties.OBJECTID } | Measure-Object -Maximum).Maximum
    Write-Host "Fetched $($Features.Count) island polygons"
    if ($PageFeatures.Count -lt 1000) { break }
}

$Collection = [ordered]@{
    type = 'FeatureCollection'
    name = 'fwa-islands-vancouver-island-working-extent'
    features = $Features
}
$Output = Join-Path $DerivedDir 'vancouver-island-islands.geojson'
$Collection | ConvertTo-Json -Depth 100 -Compress | Set-Content -Encoding utf8 -LiteralPath $Output
Invoke-WebRequest -Uri "$Layer`?f=pjson" -OutFile (Join-Path $RawDir 'fwa-islands.schema.json')
Write-Host "Wrote $($Features.Count) island polygons to $Output"
