[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$ForceNames
)

$ErrorActionPreference = 'Stop'
$ResearchRoot = Split-Path -Parent $PSScriptRoot
$RawDir = Join-Path $ResearchRoot 'raw'
New-Item -ItemType Directory -Force -Path $RawDir | Out-Null

$Downloads = @(
    @{
        Name = 'bc-parks-protected-areas.geojson'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/512/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
    },
    @{
        Name = 'bc-parks-protected-areas.schema.json'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/512?f=pjson'
    },
    @{
        Name = 'bc-conservancies.geojson'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/269/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
    },
    @{
        Name = 'bc-conservancies.schema.json'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/269?f=pjson'
    },
    @{
        Name = 'bc-regional-districts.geojson'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/474/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
    },
    @{
        Name = 'bc-regional-districts.schema.json'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/474?f=pjson'
    },
    @{
        Name = 'bc-municipalities.geojson'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/3/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
    },
    @{
        Name = 'bc-municipalities.schema.json'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/3?f=pjson'
    },
    @{
        Name = 'bc-electoral-areas.geojson'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/495/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
    },
    @{
        Name = 'bc-electoral-areas.schema.json'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/495?f=pjson'
    },
    @{
        Name = 'canada-national-parks.geojson'
        Url = 'https://proxyinternet.nrcan-rncan.gc.ca/arcgis/rest/services/CLSS-SATC/CLSS_Administrative_Boundaries/MapServer/1/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
    },
    @{
        Name = 'canada-national-parks.schema.json'
        Url = 'https://proxyinternet.nrcan-rncan.gc.ca/arcgis/rest/services/CLSS-SATC/CLSS_Administrative_Boundaries/MapServer/1?f=pjson'
    },
    @{
        Name = 'bc-gazetteer.csv'
        Url = 'https://catalogue.data.gov.bc.ca/dataset/d92224ee-03ef-4904-be53-b677d8e01ac4/resource/69738aa8-2cc0-4975-aec6-4dc2e30990bf/download/bc-gazetteer-2026-05-25.csv'
    },
    @{
        Name = 'bc-gazetteer-feature-types.pdf'
        Url = 'https://apps.gov.bc.ca/pub/bcgnws/featureTypes?outputFormat=pdf'
    },
    @{
        Name = 'bc-geographical-names.schema.json'
        Url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_basemapping/MapServer/60?f=pjson'
    }
)

$Manifest = foreach ($Download in $Downloads) {
    $Destination = Join-Path $RawDir $Download.Name
    $Temporary = "$Destination.download"
    $RefreshThisFile = $Force -or ($ForceNames -and $Download.Name -eq 'bc-geographical-names.schema.json')
    if ($RefreshThisFile -or -not (Test-Path -LiteralPath $Destination)) {
        Write-Host "Downloading $($Download.Name)"
        Invoke-WebRequest -Uri $Download.Url -OutFile $Temporary -UseBasicParsing
        Move-Item -Force -LiteralPath $Temporary -Destination $Destination
    } else {
        Write-Host "Keeping existing $($Download.Name)"
    }
    $Item = Get-Item -LiteralPath $Destination
    $Hash = Get-FileHash -Algorithm SHA256 -LiteralPath $Destination
    [ordered]@{
        file = $Download.Name
        url = $Download.Url
        retrievedAt = (Get-Date).ToUniversalTime().ToString('o')
        bytes = $Item.Length
        sha256 = $Hash.Hash.ToLowerInvariant()
    }
}

$NamesDestination = Join-Path $RawDir 'bc-geographical-names.geojson'
if ($Force -or $ForceNames -or -not (Test-Path -LiteralPath $NamesDestination)) {
    $NamesEndpoint = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_basemapping/MapServer/60/query'
    $PageSize = 1000
    $Features = [System.Collections.Generic.List[object]]::new()
    $LastObjectId = -1
    do {
        Write-Host "Downloading BC Geographical Names after OBJECTID $LastObjectId"
        $Parameters = @{
            where = "OBJECTID > $LastObjectId"
            outFields = '*'
            returnGeometry = 'true'
            outSR = '4326'
            resultRecordCount = $PageSize
            orderByFields = 'OBJECTID ASC'
            f = 'geojson'
        }
        $Page = Invoke-RestMethod -Uri $NamesEndpoint -Method Get -Body $Parameters
        foreach ($Feature in @($Page.features)) {
            $Features.Add($Feature)
        }
        $PageFeatures = @($Page.features)
        $PageCount = $PageFeatures.Count
        if ($PageCount -gt 0) {
            $NextObjectId = ($PageFeatures | ForEach-Object { [int64]$_.properties.OBJECTID } | Measure-Object -Maximum).Maximum
            if ($NextObjectId -le $LastObjectId) {
                throw "BC Geographical Names pagination did not advance past OBJECTID $LastObjectId"
            }
            $LastObjectId = $NextObjectId
        }
    } while ($PageCount -eq $PageSize)

    $FeatureCollection = [ordered]@{
        type = 'FeatureCollection'
        name = 'bc-geographical-names'
        features = $Features
    }
    $Temporary = "$NamesDestination.download"
    $FeatureCollection | ConvertTo-Json -Depth 100 -Compress | Set-Content -Encoding utf8 -LiteralPath $Temporary
    Move-Item -Force -LiteralPath $Temporary -Destination $NamesDestination
} else {
    Write-Host 'Keeping existing bc-geographical-names.geojson'
}

$NamesItem = Get-Item -LiteralPath $NamesDestination
$NamesHash = Get-FileHash -Algorithm SHA256 -LiteralPath $NamesDestination
$Manifest += [ordered]@{
    file = 'bc-geographical-names.geojson'
    url = 'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_basemapping/MapServer/60/query (object ID batches)'
    retrievedAt = (Get-Date).ToUniversalTime().ToString('o')
    bytes = $NamesItem.Length
    sha256 = $NamesHash.Hash.ToLowerInvariant()
}

$Manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $RawDir 'download-manifest.json')
Write-Host "Prepared $($Downloads.Count + 1) source files in $RawDir"
