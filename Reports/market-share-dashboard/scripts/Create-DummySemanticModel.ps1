param(
    [string]$ProjectRoot = "C:\Users\adebo\reports\market-share-dashboard",
    [switch]$NoSampleData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-Column {
    param(
        [string]$Name,
        [string]$DataType = "string",
        [string]$SummarizeBy = "none"
    )

    return [ordered]@{
        name = $Name
        dataType = $DataType
        summarizeBy = $SummarizeBy
    }
}

function New-Measure {
    param(
        [string]$Name,
        [string]$Expression = "BLANK()",
        [string]$FormatString = "",
        [string]$DisplayFolder = ""
    )

    $measure = [ordered]@{
        name = $Name
        expression = $Expression
    }

    if ($FormatString) {
        $measure.formatString = $FormatString
    }

    if ($DisplayFolder) {
        $measure.displayFolder = $DisplayFolder
    }

    return $measure
}

function Get-MTypeExpression {
    param(
        [string]$DataType
    )

    switch ($DataType) {
        "int64" { return "Int64.Type" }
        "double" { return "type number" }
        "dateTime" { return "type datetime" }
        "boolean" { return "type logical" }
        default { return "type text" }
    }
}

function ConvertTo-MLiteral {
    param(
        [AllowNull()]
        $Value,
        [string]$DataType = "string"
    )

    if ($null -eq $Value) {
        return "null"
    }

    switch ($DataType) {
        "int64" {
            return [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0}", [int64]$Value)
        }
        "double" {
            return [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0}", [double]$Value)
        }
        "boolean" {
            if ([bool]$Value) { return "true" }
            return "false"
        }
        "dateTime" {
            $dateValue = [datetime]$Value
            return "#datetime({0}, {1}, {2}, {3}, {4}, {5})" -f $dateValue.Year, $dateValue.Month, $dateValue.Day, $dateValue.Hour, $dateValue.Minute, $dateValue.Second
        }
        default {
            $escaped = [string]$Value -replace '"', '""'
            return '"' + $escaped + '"'
        }
    }
}

function New-Partition {
    param(
        [string]$TableName,
        [object[]]$Columns,
        [object[]]$SampleRows = @()
    )

    $sampleRowList = @($SampleRows)
    $columnNameLines = @()
    $typeLines = @()
    for ($i = 0; $i -lt $Columns.Count; $i++) {
        $column = $Columns[$i]
        $comma = if ($i -lt ($Columns.Count - 1)) { "," } else { "" }
        $columnNameLines += "            ""$($column.name)""$comma"
        $typeLines += "            {""$($column.name)"", $(Get-MTypeExpression -DataType $column.dataType)}$comma"
    }

    $rowBlockLines = @()
    if ($sampleRowList.Count -gt 0) {
        $rowLines = @()
        for ($rowIndex = 0; $rowIndex -lt $sampleRowList.Count; $rowIndex++) {
            $row = $sampleRowList[$rowIndex]
            $valueLiterals = foreach ($column in $Columns) {
                ConvertTo-MLiteral -Value $row[$column.name] -DataType $column.dataType
            }
            $rowComma = if ($rowIndex -lt ($sampleRowList.Count - 1)) { "," } else { "" }
            $rowLines += "            {" + ($valueLiterals -join ", ") + "}$rowComma"
        }
        $rowBlockLines = @(
            "        {"
        ) + $rowLines + @(
            "        }"
        )
    } else {
        $rowBlockLines = @("        {}")
    }

    $expression = @(
        "let",
        "    Source = #table(",
        "        {"
    ) + $columnNameLines + @(
        "        },"
    ) + $rowBlockLines + @(
        "    ),",
        "    Typed = Table.TransformColumnTypes(",
        "        Source,",
        "        {"
    ) + $typeLines + @(
        "        }",
        "    )",
        "in",
        "    Typed"
    )

    return [ordered]@{
        name = "$TableName-Empty"
        mode = "import"
        source = [ordered]@{
            type = "m"
            expression = $expression
        }
    }
}

$sampleRowsByTable = @{}

if (-not $NoSampleData) {
    $sampleRowsByTable = @{
        "DATA" = @(
            [ordered]@{
                "OIH Amt" = 120000.0
                "OIH Qty" = 150.0
                "Value Type for Reporting Text" = "Actual"
                "Currency" = "EUR"
                "Profit Center" = "PC-Cardio"
                "Customer" = "CUST001"
                "SalesAssignmentID" = "SA001"
                "Date" = [datetime]"2025-01-15T00:00:00"
                "Net Sales Actual" = 245000.0
                "Net Sales Qty Plan" = 180.0
                "Net Sales Qty Actual" = 150.0
                "Fiscal year" = 2025
                "Index_FxRates" = "EUR-2025-01"
                "Final_Material" = "MAT001"
                "Product Hierarchy Final" = "PH-CV"
                "Customer Name" = "St. Mary Hospital"
                "Final Destination Text" = "United Kingdom"
                "Final Destination" = "FD001"
                "Record Type" = "Actual"
                "Index_Branch_CountryFinalDestination" = "UK-FD001"
                "Deemed Cost" = 132000.0
                "Net Sales Plan (EUR)" = 260000.0
                "FxtoEUR" = 1.0
                "FxtoLC" = 0.86
            }
            [ordered]@{
                "OIH Amt" = 85000.0
                "OIH Qty" = 95.0
                "Value Type for Reporting Text" = "Actual"
                "Currency" = "EUR"
                "Profit Center" = "PC-Access"
                "Customer" = "CUST002"
                "SalesAssignmentID" = "SA002"
                "Date" = [datetime]"2025-02-10T00:00:00"
                "Net Sales Actual" = 168000.0
                "Net Sales Qty Plan" = 110.0
                "Net Sales Qty Actual" = 95.0
                "Fiscal year" = 2025
                "Index_FxRates" = "EUR-2025-02"
                "Final_Material" = "MAT002"
                "Product Hierarchy Final" = "PH-ONC"
                "Customer Name" = "Dublin Clinic"
                "Final Destination Text" = "Ireland"
                "Final Destination" = "FD002"
                "Record Type" = "Actual"
                "Index_Branch_CountryFinalDestination" = "IE-FD002"
                "Deemed Cost" = 94000.0
                "Net Sales Plan (EUR)" = 175000.0
                "FxtoEUR" = 1.0
                "FxtoLC" = 1.0
            }
            [ordered]@{
                "OIH Amt" = 67000.0
                "OIH Qty" = 70.0
                "Value Type for Reporting Text" = "Plan"
                "Currency" = "EUR"
                "Profit Center" = "PC-Cardio"
                "Customer" = "CUST001"
                "SalesAssignmentID" = "SA001"
                "Date" = [datetime]"2025-03-05T00:00:00"
                "Net Sales Actual" = 0.0
                "Net Sales Qty Plan" = 75.0
                "Net Sales Qty Actual" = 0.0
                "Fiscal year" = 2025
                "Index_FxRates" = "EUR-2025-03"
                "Final_Material" = "MAT003"
                "Product Hierarchy Final" = "PH-CV"
                "Customer Name" = "St. Mary Hospital"
                "Final Destination Text" = "United Kingdom"
                "Final Destination" = "FD001"
                "Record Type" = "Plan"
                "Index_Branch_CountryFinalDestination" = "UK-FD001"
                "Deemed Cost" = 38000.0
                "Net Sales Plan (EUR)" = 120000.0
                "FxtoEUR" = 1.0
                "FxtoLC" = 0.86
            }
        )
        "Dim_Cust" = @(
            [ordered]@{
                "Customer Account Group Code" = "HOSP"
                "Customer account group Text" = "Hospital"
                "Location" = "London"
                "Country" = "GB"
                "Country Text" = "United Kingdom"
                "Customer" = "CUST001"
                "Customer Name" = "St. Mary Hospital"
                "Language key" = "EN"
                "Source System" = "SAP"
                "Name 2" = ""
                "Name 3" = ""
                "Name 1" = "St. Mary Hospital"
                "Postal Code" = "SW1A 1AA"
                "Region (State, Province, County)" = "London"
                "Sort Field" = "1"
                "House number and street" = "1 Queen Street"
                "Tax Number 1" = "GB123"
                "GPO Combined" = "NHS"
                "OLD NAME" = ""
                "NEW NAME" = ""
                "New_SAP" = "Y"
                "Final Customer" = "FD001"
                "Final Name" = "St. Mary Hospital"
                "CITY" = "London"
                "Final Location" = "London"
                "Customer Combined" = "CUST001 - St. Mary Hospital"
                "TIS Final Segmenation" = "Strategic"
            }
            [ordered]@{
                "Customer Account Group Code" = "CLIN"
                "Customer account group Text" = "Clinic"
                "Location" = "Dublin"
                "Country" = "IE"
                "Country Text" = "Ireland"
                "Customer" = "CUST002"
                "Customer Name" = "Dublin Clinic"
                "Language key" = "EN"
                "Source System" = "SAP"
                "Name 2" = ""
                "Name 3" = ""
                "Name 1" = "Dublin Clinic"
                "Postal Code" = "D02"
                "Region (State, Province, County)" = "Leinster"
                "Sort Field" = "2"
                "House number and street" = "22 River Road"
                "Tax Number 1" = "IE456"
                "GPO Combined" = ""
                "OLD NAME" = ""
                "NEW NAME" = ""
                "New_SAP" = "Y"
                "Final Customer" = "FD002"
                "Final Name" = "Dublin Clinic"
                "CITY" = "Dublin"
                "Final Location" = "Dublin"
                "Customer Combined" = "CUST002 - Dublin Clinic"
                "TIS Final Segmenation" = "Growth"
            }
        )
        "Dim_Product" = @(
            [ordered]@{
                "Material Description" = "Guidewire Alpha"
                "Business Unit Text" = "Interventional"
                "Business Line Text" = "Cardiology"
                "Product Area Text" = "Coronary"
                "Product Group Text" = "Guidewires"
                "Product Subgroup Text" = "Standard"
                "Material" = "MAT001"
                "Product Hierarchy Code" = "PH-CV"
                "Material Code & Name" = "MAT001 - Guidewire Alpha"
                "Product Area Code" = "PA-COR"
                "Profit Center" = "PC-Cardio"
                "Profit Center 2" = "PC2-Cardio"
                "Profit Center 3" = "PC3-Cardio"
                "Product Area" = "Coronary"
                "Product Group 1" = "Cardio"
                "Product Group 2" = "Guidewires"
                "Product Group 3" = "Coronary Guidewires"
                "Portfolio Category" = "Core"
                "Portfolio Category 2" = "Growth"
            }
            [ordered]@{
                "Material Description" = "Catheter Beta"
                "Business Unit Text" = "Interventional"
                "Business Line Text" = "Oncology"
                "Product Area Text" = "Access"
                "Product Group Text" = "Catheters"
                "Product Subgroup Text" = "Specialty"
                "Material" = "MAT002"
                "Product Hierarchy Code" = "PH-ONC"
                "Material Code & Name" = "MAT002 - Catheter Beta"
                "Product Area Code" = "PA-ACC"
                "Profit Center" = "PC-Access"
                "Profit Center 2" = "PC2-Access"
                "Profit Center 3" = "PC3-Access"
                "Product Area" = "Access"
                "Product Group 1" = "Oncology"
                "Product Group 2" = "Catheters"
                "Product Group 3" = "Specialty Catheters"
                "Portfolio Category" = "Focus"
                "Portfolio Category 2" = "Priority"
            }
            [ordered]@{
                "Material Description" = "Guidewire Gamma"
                "Business Unit Text" = "Interventional"
                "Business Line Text" = "Cardiology"
                "Product Area Text" = "Coronary"
                "Product Group Text" = "Guidewires"
                "Product Subgroup Text" = "Premium"
                "Material" = "MAT003"
                "Product Hierarchy Code" = "PH-CV"
                "Material Code & Name" = "MAT003 - Guidewire Gamma"
                "Product Area Code" = "PA-COR"
                "Profit Center" = "PC-Cardio"
                "Profit Center 2" = "PC2-Cardio"
                "Profit Center 3" = "PC3-Cardio"
                "Product Area" = "Coronary"
                "Product Group 1" = "Cardio"
                "Product Group 2" = "Guidewires"
                "Product Group 3" = "Coronary Guidewires"
                "Portfolio Category" = "Premium"
                "Portfolio Category 2" = "Strategic"
            }
        )
        "Dim_Cal" = @(
            [ordered]@{
                "Date" = [datetime]"2025-01-15T00:00:00"
                "Calendar Year" = 2025
                "Month" = 1
                "Fiscal Year" = 2025
                "Month Name" = "January"
                "MMM" = "Jan"
                "Fiscal Month" = 1
                "IsCurrentMonth" = $false
                "Fiscal Quarter Number" = 1
            }
            [ordered]@{
                "Date" = [datetime]"2025-02-10T00:00:00"
                "Calendar Year" = 2025
                "Month" = 2
                "Fiscal Year" = 2025
                "Month Name" = "February"
                "MMM" = "Feb"
                "Fiscal Month" = 2
                "IsCurrentMonth" = $false
                "Fiscal Quarter Number" = 1
            }
            [ordered]@{
                "Date" = [datetime]"2025-03-05T00:00:00"
                "Calendar Year" = 2025
                "Month" = 3
                "Fiscal Year" = 2025
                "Month Name" = "March"
                "MMM" = "Mar"
                "Fiscal Month" = 3
                "IsCurrentMonth" = $true
                "Fiscal Quarter Number" = 1
            }
        )
        "fact_market_potential" = @(
            [ordered]@{
                "region_group" = "UK-IE"
                "country_code" = "GB"
                "country_name" = "United Kingdom"
                "country_iso2" = "GB"
                "country_text" = "United Kingdom"
                "customer_id_" = "CUST001"
                "customer_id" = "CUST001"
                "customer_name" = "St. Mary Hospital"
                "customer_segment" = "Strategic"
                "Final Destination" = "FD001"
                "Final Destination Text" = "United Kingdom"
                "year" = 2025
                "procedure_group" = "PCI"
                "terumo_category" = "Guidewires"
                "terumo_category_key" = "TC001"
                "qty_units_per_procedure" = 1.2
                "mapping_row_count" = 2
                "procedures" = 420.0
                "usage_rate_final" = 0.68
                "mapping_cardinality" = 1
                "allocation_weight" = 1.0
                "customer_market_key" = "CM001"
                "final_destination_key" = "FD001"
                "potential_units" = 504.0
            }
            [ordered]@{
                "region_group" = "UK-IE"
                "country_code" = "IE"
                "country_name" = "Ireland"
                "country_iso2" = "IE"
                "country_text" = "Ireland"
                "customer_id_" = "CUST002"
                "customer_id" = "CUST002"
                "customer_name" = "Dublin Clinic"
                "customer_segment" = "Growth"
                "Final Destination" = "FD002"
                "Final Destination Text" = "Ireland"
                "year" = 2025
                "procedure_group" = "EVAR"
                "terumo_category" = "Catheters"
                "terumo_category_key" = "TC002"
                "qty_units_per_procedure" = 2.5
                "mapping_row_count" = 1
                "procedures" = 180.0
                "usage_rate_final" = 0.54
                "mapping_cardinality" = 1
                "allocation_weight" = 1.0
                "customer_market_key" = "CM002"
                "final_destination_key" = "FD002"
                "potential_units" = 450.0
            }
        )
        "dim_terumo_category" = @(
            [ordered]@{ "terumo_category" = "Guidewires"; "terumo_category_key" = "TC001" }
            [ordered]@{ "terumo_category" = "Catheters"; "terumo_category_key" = "TC002" }
        )
        "dim_procedure" = @(
            [ordered]@{ "procedure_group" = "PCI"; "procedure_group_key" = "PG001" }
            [ordered]@{ "procedure_group" = "EVAR"; "procedure_group_key" = "PG002" }
        )
        "Sales_Category" = @(
            [ordered]@{
                "Customer Id" = "CUST001"
                "Customer Name" = "St. Mary Hospital"
                "Customer Combined" = "CUST001 - St. Mary Hospital"
                "Customer Segment" = "Strategic"
                "CountryIso2" = "GB"
                "Country Name" = "United Kingdom"
                "Year" = 2025
                "Terumo Category" = "Guidewires"
                "Qty Sold" = 150.0
                "Sales EUR" = 245000.0
            }
            [ordered]@{
                "Customer Id" = "CUST002"
                "Customer Name" = "Dublin Clinic"
                "Customer Combined" = "CUST002 - Dublin Clinic"
                "Customer Segment" = "Growth"
                "CountryIso2" = "IE"
                "Country Name" = "Ireland"
                "Year" = 2025
                "Terumo Category" = "Catheters"
                "Qty Sold" = 95.0
                "Sales EUR" = 168000.0
            }
        )
        "UK-IE" = @(
            [ordered]@{
                "Business Area" = "EMEA"
                "Business Area Text" = "Europe"
                "Customer" = "CUST001"
                "Relevant Account Flag - For Customer column" = "Y"
                "Customer Name" = "St. Mary Hospital"
                "Final Destination" = "FD001"
                "Relevant Account Flag - For Final Destination" = "Y"
                "Final Destination Text" = "United Kingdom"
                "Current TIS Segmentation Reference (T360)" = "Strategic"
                "New Relevant Flag" = "Y"
                "HCO (Y/N)" = "Y"
                "Original Sales Org" = "UK01"
                "Country" = "GB"
                "Country Text" = "United Kingdom"
                "Postal Code" = "SW1A 1AA"
                "Location" = "London"
                "House number and street" = "1 Queen Street"
                "Tax Number" = "GB123"
                "key total" = "UK-FD001"
                "Procedure" = "PCI"
                "Procedure Year" = 2025
                "Number of Procedures Done" = 420.0
            }
            [ordered]@{
                "Business Area" = "EMEA"
                "Business Area Text" = "Europe"
                "Customer" = "CUST002"
                "Relevant Account Flag - For Customer column" = "Y"
                "Customer Name" = "Dublin Clinic"
                "Final Destination" = "FD002"
                "Relevant Account Flag - For Final Destination" = "Y"
                "Final Destination Text" = "Ireland"
                "Current TIS Segmentation Reference (T360)" = "Growth"
                "New Relevant Flag" = "Y"
                "HCO (Y/N)" = "Y"
                "Original Sales Org" = "IE01"
                "Country" = "IE"
                "Country Text" = "Ireland"
                "Postal Code" = "D02"
                "Location" = "Dublin"
                "House number and street" = "22 River Road"
                "Tax Number" = "IE456"
                "key total" = "IE-FD002"
                "Procedure" = "EVAR"
                "Procedure Year" = 2025
                "Number of Procedures Done" = 180.0
            }
        )
        "Final Destination" = @(
            [ordered]@{
                "Final Destination" = "FD001"
                "Final Destination Text" = "United Kingdom"
                "Customer" = "CUST001"
                "Customer Name" = "St. Mary Hospital"
                "Fiscal year" = 2025
                "Profit Center" = "PC-Cardio"
                "Index_Branch_CountryFinalDestination" = "UK-FD001"
                "Product Hierarchy Final" = "PH-CV"
                "Final_Material" = "MAT001"
                "SalesAssignmentID" = "SA001"
                "Net Sales Actual" = 245000.0
                "Net Sales Qty Actual" = 150.0
                "Net Sales Qty Plan" = 180.0
                "Net Sales Plan (EUR)" = 260000.0
                "Product Group Text" = "Guidewires"
                "Product Subgroup Text" = "Standard"
                "Product Hierarchy Code" = "PH-CV"
                "Product Area Code" = "PA-COR"
                "Profit Center 3" = "PC3-Cardio"
                "Product Group 3" = "Coronary Guidewires"
                "Portfolio Category" = "Core"
                "Portfolio Category 2" = "Growth"
            }
            [ordered]@{
                "Final Destination" = "FD002"
                "Final Destination Text" = "Ireland"
                "Customer" = "CUST002"
                "Customer Name" = "Dublin Clinic"
                "Fiscal year" = 2025
                "Profit Center" = "PC-Access"
                "Index_Branch_CountryFinalDestination" = "IE-FD002"
                "Product Hierarchy Final" = "PH-ONC"
                "Final_Material" = "MAT002"
                "SalesAssignmentID" = "SA002"
                "Net Sales Actual" = 168000.0
                "Net Sales Qty Actual" = 95.0
                "Net Sales Qty Plan" = 110.0
                "Net Sales Plan (EUR)" = 175000.0
                "Product Group Text" = "Catheters"
                "Product Subgroup Text" = "Specialty"
                "Product Hierarchy Code" = "PH-ONC"
                "Product Area Code" = "PA-ACC"
                "Profit Center 3" = "PC3-Access"
                "Product Group 3" = "Specialty Catheters"
                "Portfolio Category" = "Focus"
                "Portfolio Category 2" = "Priority"
            }
        )
        "map_product_to_terumo_category" = @(
            [ordered]@{
                "product_group_text" = "Guidewires"
                "product_subgroup_text" = "Standard"
                "terumo_category" = "Guidewires"
                "product_group_key" = "PGK001"
                "product_subgroup_key" = "PSK001"
                "terumo_category_key" = "TC001"
            }
            [ordered]@{
                "product_group_text" = "Catheters"
                "product_subgroup_text" = "Specialty"
                "terumo_category" = "Catheters"
                "product_group_key" = "PGK002"
                "product_subgroup_key" = "PSK002"
                "terumo_category_key" = "TC002"
            }
        )
        "mapping_estimates_detail" = @(
            [ordered]@{
                "procedure_group" = "PCI"
                "product_group_text" = "Guidewires"
                "product_subgroup_text" = "Standard"
                "profit_center" = "PC-Cardio"
                "component_family" = "Coronary"
                "qty_min" = 1.0
                "qty_mode" = 1.2
                "qty_max" = 1.5
                "assumption_notes" = "Sample assumption"
                "confidence" = 0.8
                "terumo_category" = "Guidewires"
                "qty_expected" = 1.2
                "procedure_group_key" = "PG001"
                "terumo_category_key" = "TC001"
            }
            [ordered]@{
                "procedure_group" = "EVAR"
                "product_group_text" = "Catheters"
                "product_subgroup_text" = "Specialty"
                "profit_center" = "PC-Access"
                "component_family" = "Access"
                "qty_min" = 2.0
                "qty_mode" = 2.5
                "qty_max" = 3.0
                "assumption_notes" = "Sample assumption"
                "confidence" = 0.75
                "terumo_category" = "Catheters"
                "qty_expected" = 2.5
                "procedure_group_key" = "PG002"
                "terumo_category_key" = "TC002"
            }
        )
        "bridge_procedure_to_terumo" = @(
            [ordered]@{
                "procedure_group_key" = "PG001"
                "terumo_category_key" = "TC001"
                "procedure_group" = "PCI"
                "terumo_category" = "Guidewires"
                "qty_units_per_procedure" = 1.2
                "mapping_row_count" = 1
                "usage_rate_final" = 0.68
            }
            [ordered]@{
                "procedure_group_key" = "PG002"
                "terumo_category_key" = "TC002"
                "procedure_group" = "EVAR"
                "terumo_category" = "Catheters"
                "qty_units_per_procedure" = 2.5
                "mapping_row_count" = 1
                "usage_rate_final" = 0.54
            }
        )
        "dim_customer_market" = @(
            [ordered]@{
                "customer_id_" = "CUST001"
                "customer_id" = "CUST001"
                "customer_name" = "St. Mary Hospital"
                "country_iso2" = "GB"
                "country_text" = "United Kingdom"
                "customer_market_key" = "CM001"
            }
            [ordered]@{
                "customer_id_" = "CUST002"
                "customer_id" = "CUST002"
                "customer_name" = "Dublin Clinic"
                "country_iso2" = "IE"
                "country_text" = "Ireland"
                "customer_market_key" = "CM002"
            }
        )
        "Target RI" = @(
            [ordered]@{ "Value" = 50 }
            [ordered]@{ "Value" = 75 }
            [ordered]@{ "Value" = 100 }
            [ordered]@{ "Value" = 150 }
        )
        "Shp_Dim_Country_Hierarchy" = @(
            [ordered]@{
                "Country" = "GB"
                "Region" = "Northern Europe"
                "Cluster" = "UK-IE"
                "Business Area" = "EMEA"
                "Direct/Distrib" = "Direct"
                "Branch Code" = "UK01"
                "Branch Name" = "United Kingdom"
                "Index_Branch_CountryFinalDestination" = "UK-FD001"
                "Country Final Destination" = "FD001"
                "Country Final Destination Text" = "United Kingdom"
                "Country Text" = "United Kingdom"
            }
            [ordered]@{
                "Country" = "IE"
                "Region" = "Northern Europe"
                "Cluster" = "UK-IE"
                "Business Area" = "EMEA"
                "Direct/Distrib" = "Direct"
                "Branch Code" = "IE01"
                "Branch Name" = "Ireland"
                "Index_Branch_CountryFinalDestination" = "IE-FD002"
                "Country Final Destination" = "FD002"
                "Country Final Destination Text" = "Ireland"
                "Country Text" = "Ireland"
            }
        )
        "Data_SA" = @(
            [ordered]@{
                "SalesAssignmentID" = "SA001"
                "Sales Representative Mail" = "alice@example.com"
                "Sales Representative Code" = "REP001"
                "Sales Representative Name" = "Alice Smith"
                "Sales Reps Level" = "Territory"
                "Index_Reps_ProductAreaCode" = "REP001-PA-COR"
                "Sales Representative Mail - Copy" = "alice@example.com"
                "Corrected_mail" = "alice@example.com"
                "Sales Representative Mail Final" = "alice@example.com"
                "Key Account Manager" = "KAM001"
                "Key Account Manager Mail" = "kam.uk@example.com"
                "Key Account Manager Name" = "James Carter"
            }
            [ordered]@{
                "SalesAssignmentID" = "SA002"
                "Sales Representative Mail" = "brenda@example.com"
                "Sales Representative Code" = "REP002"
                "Sales Representative Name" = "Brenda Walsh"
                "Sales Reps Level" = "Territory"
                "Index_Reps_ProductAreaCode" = "REP002-PA-ACC"
                "Sales Representative Mail - Copy" = "brenda@example.com"
                "Corrected_mail" = "brenda@example.com"
                "Sales Representative Mail Final" = "brenda@example.com"
                "Key Account Manager" = "KAM002"
                "Key Account Manager Mail" = "kam.ie@example.com"
                "Key Account Manager Name" = "Nora Doyle"
            }
        )
        "Shp_Dim_SalesRep_Hierarchy" = @(
            [ordered]@{
                "Business Area Code" = "EMEA"
                "Employee Email Sales Manager" = "manager.uk@example.com"
                "Employee Number Sales Manager" = "SM001"
                "Employee Name Sales Manager" = "Emma Brown"
                "Employee email Regional Sales Manager" = "regional.uk@example.com"
                "Employee Name Regional Sales Manager" = "Olivia Green"
                "Employee Number Regional Sales Manager" = "RSM001"
                "Employee Number Sales Reps" = "REP001"
                "Employee Name Sales Reps" = "Alice Smith"
                "Product Area Code" = "PA-COR"
                "Index_Reps_ProductAreaCode" = "REP001-PA-COR"
                "Employee email Sales Reps" = "alice@example.com"
                "Sales Organisation" = "UK01"
                "Sales Representative Code" = "REP001"
            }
            [ordered]@{
                "Business Area Code" = "EMEA"
                "Employee Email Sales Manager" = "manager.ie@example.com"
                "Employee Number Sales Manager" = "SM002"
                "Employee Name Sales Manager" = "Liam Kelly"
                "Employee email Regional Sales Manager" = "regional.ie@example.com"
                "Employee Name Regional Sales Manager" = "Sofia Byrne"
                "Employee Number Regional Sales Manager" = "RSM002"
                "Employee Number Sales Reps" = "REP002"
                "Employee Name Sales Reps" = "Brenda Walsh"
                "Product Area Code" = "PA-ACC"
                "Index_Reps_ProductAreaCode" = "REP002-PA-ACC"
                "Employee email Sales Reps" = "brenda@example.com"
                "Sales Organisation" = "IE01"
                "Sales Representative Code" = "REP002"
            }
        )
    }
}

$tables = @(
    [ordered]@{
        name = "DATA"
        columns = @(
            (New-Column "OIH Amt" "double" "sum"),
            (New-Column "OIH Qty" "double" "sum"),
            (New-Column "Value Type for Reporting Text"),
            (New-Column "Currency"),
            (New-Column "Profit Center"),
            (New-Column "Customer"),
            (New-Column "SalesAssignmentID"),
            (New-Column "Date" "dateTime"),
            (New-Column "Net Sales Actual" "double" "sum"),
            (New-Column "Net Sales Qty Plan" "double" "sum"),
            (New-Column "Net Sales Qty Actual" "double" "sum"),
            (New-Column "Fiscal year" "int64"),
            (New-Column "Index_FxRates"),
            (New-Column "Final_Material"),
            (New-Column "Product Hierarchy Final"),
            (New-Column "Customer Name"),
            (New-Column "Final Destination Text"),
            (New-Column "Final Destination"),
            (New-Column "Record Type"),
            (New-Column "Index_Branch_CountryFinalDestination"),
            (New-Column "Deemed Cost" "double" "sum"),
            (New-Column "Net Sales Plan (EUR)" "double" "sum"),
            (New-Column "FxtoEUR" "double" "sum"),
            (New-Column "FxtoLC" "double" "sum")
        )
        measures = @(
            (New-Measure "100pct" "1" "0.0%"),
            (New-Measure "Gauge Achvt Target" "1" "0.0%"),
            (New-Measure "Gauge Achvt Max" "1.5" "0.0%"),
            (New-Measure "Gauge Achvt Minimum" "0" "0.0%"),
            (New-Measure "Gauge GP% Max" "0.75" "0.0%"),
            (New-Measure "Gauge GP% Min" "0" "0.0%"),
            (New-Measure "Gauge GP% Target" "0.5" "0.0%"),
            (New-Measure "Gauge Growth Minimum" "0" "0.0%"),
            (New-Measure "Gauge Growth Target" "0.15" "0.0%"),
            (New-Measure "Gauge Growth Max" "0.3" "0.0%"),
            (New-Measure "Before_last_sales_month" "12" "0")
        )
    }
    [ordered]@{
        name = "Dim_Cust"
        columns = @(
            (New-Column "Customer Account Group Code"),
            (New-Column "Customer account group Text"),
            (New-Column "Location"),
            (New-Column "Country"),
            (New-Column "Country Text"),
            (New-Column "Customer"),
            (New-Column "Customer Name"),
            (New-Column "Language key"),
            (New-Column "Source System"),
            (New-Column "Name 2"),
            (New-Column "Name 3"),
            (New-Column "Name 1"),
            (New-Column "Postal Code"),
            (New-Column "Region (State, Province, County)"),
            (New-Column "Sort Field"),
            (New-Column "House number and street"),
            (New-Column "Tax Number 1"),
            (New-Column "GPO Combined"),
            (New-Column "OLD NAME"),
            (New-Column "NEW NAME"),
            (New-Column "New_SAP"),
            (New-Column "Final Customer"),
            (New-Column "Final Name"),
            (New-Column "CITY"),
            (New-Column "Final Location"),
            (New-Column "Customer Combined"),
            (New-Column "TIS Final Segmenation")
        )
    }
    [ordered]@{
        name = "Dim_Product"
        columns = @(
            (New-Column "Material Description"),
            (New-Column "Business Unit Text"),
            (New-Column "Business Line Text"),
            (New-Column "Product Area Text"),
            (New-Column "Product Group Text"),
            (New-Column "Product Subgroup Text"),
            (New-Column "Material"),
            (New-Column "Product Hierarchy Code"),
            (New-Column "Material Code & Name"),
            (New-Column "Product Area Code"),
            (New-Column "Profit Center"),
            (New-Column "Profit Center 2"),
            (New-Column "Profit Center 3"),
            (New-Column "Product Area"),
            (New-Column "Product Group 1"),
            (New-Column "Product Group 2"),
            (New-Column "Product Group 3"),
            (New-Column "Portfolio Category"),
            (New-Column "Portfolio Category 2")
        )
    }
    [ordered]@{
        name = "Dim_Cal"
        columns = @(
            (New-Column "Date" "dateTime"),
            (New-Column "Calendar Year" "int64"),
            (New-Column "Month" "int64"),
            (New-Column "Fiscal Year" "int64"),
            (New-Column "Month Name"),
            (New-Column "MMM"),
            (New-Column "Fiscal Month" "int64"),
            (New-Column "IsCurrentMonth" "boolean"),
            (New-Column "Fiscal Quarter Number" "int64")
        )
        measures = @(
            (New-Measure "Selected Products" "0" "0"),
            (New-Measure "Current Fiscal Year" "2025" "0"),
            (New-Measure "Last Fiscal Year" "2024" "0"),
            (New-Measure "Last 2 Fiscal Year" "2023" "0"),
            (New-Measure "Title GP 1" '"Gross Profit"'),
            (New-Measure "Title GP 2" '"GP %"'),
            (New-Measure "Title Actual Sales" '"Actual Sales"'),
            (New-Measure "Title Actual GP" '"Actual GP"'),
            (New-Measure "Title Actual GP%" '"Actual GP %"')
        )
    }
    [ordered]@{
        name = "Measurement Collections"
        columns = @()
        measures = @(
            (New-Measure "FY Figures CY" "0" "#,0"),
            (New-Measure "FY Figures LY" "0" "#,0"),
            (New-Measure "FY Figures LY2" "0" "#,0"),
            (New-Measure "FY Figures Plan" "0" "#,0"),
            (New-Measure "FY Figures vsPlan%" "0" "0.0%"),
            (New-Measure "FY Figures vsPlan" "0" "#,0"),
            (New-Measure "FY Figures vsLY%" "0" "0.0%"),
            (New-Measure "FY Figures vsLY" "0" "#,0"),
            (New-Measure "FY Figures vsLY2%" "0" "0.0%"),
            (New-Measure "FY Figures vsLY2" "0" "#,0"),
            (New-Measure "FY Sales LY" "0" "#,0"),
            (New-Measure "FY Sales LY2" "0" "#,0"),
            (New-Measure "FY Sales Plan" "0" "#,0"),
            (New-Measure "FY Units CY" "0" "#,0"),
            (New-Measure "FY Units LY" "0" "#,0"),
            (New-Measure "FY Units LY2" "0" "#,0"),
            (New-Measure "FY Units Plan" "0" "#,0"),
            (New-Measure "FY ASP CY" "0" "#,0.00"),
            (New-Measure "FY ASP LY" "0" "#,0.00"),
            (New-Measure "FY ASP LY2" "0" "#,0.00"),
            (New-Measure "FY ASP Plan" "0" "#,0.00"),
            (New-Measure "FY DC CY" "0" "#,0"),
            (New-Measure "FY DC LY" "0" "#,0"),
            (New-Measure "FY DC LY2" "0" "#,0"),
            (New-Measure "FY DC Plan" "0" "#,0"),
            (New-Measure "FY GP CY" "0" "#,0"),
            (New-Measure "FY GP LY" "0" "#,0"),
            (New-Measure "FY GP LY2" "0" "#,0"),
            (New-Measure "FY GP Plan" "0" "#,0"),
            (New-Measure "FY GP% CY" "0" "0.0%"),
            (New-Measure "FY GP% LY" "0" "0.0%"),
            (New-Measure "FY GP% LY2" "0" "0.0%"),
            (New-Measure "FY GP% Plan" "0" "0.0%"),
            (New-Measure "FY Sales CY" "0" "#,0")
        )
    }
    [ordered]@{
        name = "fact_market_potential"
        columns = @(
            (New-Column "region_group"),
            (New-Column "country_code"),
            (New-Column "country_name"),
            (New-Column "country_iso2"),
            (New-Column "country_text"),
            (New-Column "customer_id_"),
            (New-Column "customer_id"),
            (New-Column "customer_name"),
            (New-Column "customer_segment"),
            (New-Column "Final Destination"),
            (New-Column "Final Destination Text"),
            (New-Column "year" "int64"),
            (New-Column "procedure_group"),
            (New-Column "terumo_category"),
            (New-Column "terumo_category_key"),
            (New-Column "qty_units_per_procedure" "double" "sum"),
            (New-Column "mapping_row_count" "int64" "sum"),
            (New-Column "procedures" "double" "sum"),
            (New-Column "usage_rate_final" "double" "sum"),
            (New-Column "mapping_cardinality" "int64" "sum"),
            (New-Column "allocation_weight" "double" "sum"),
            (New-Column "customer_market_key"),
            (New-Column "final_destination_key"),
            (New-Column "potential_units" "double" "sum")
        )
        measures = @(
            (New-Measure "Pot Total Potential Units" "0" "#,0"),
            (New-Measure "Pot Total Potential Units (2024)" "0" "#,0"),
            (New-Measure "Pot Total Procedures (dedup)" "0" "#,0"),
            (New-Measure "Pot Realized Qty" "0" "#,0"),
            (New-Measure "Pot Realized Sales EUR (DNA total)" "0" "€#,0"),
            (New-Measure "Pot Gap Units" "0" "#,0"),
            (New-Measure "Pot Realization %" "0" "0.0%"),
            (New-Measure "Pot Realized Sales EUR" "0" "€#,0"),
            (New-Measure "Pot Avg Price EUR" "0" "€#,0.00"),
            (New-Measure "Pot Potential Value EUR" "0" "€#,0"),
            (New-Measure "Pot Gap EUR" "0" "€#,0"),
            (New-Measure "MS National Realization Pct" "0" "0.0%"),
            (New-Measure "MS Realization Index" "0" "0"),
            (New-Measure "MS Avg Price by Category" "0" "€#,0.00"),
            (New-Measure "MS Category Revenue Share" "0" "0.0%"),
            (New-Measure "MS Customer Revenue Share" "0" "0.0%"),
            (New-Measure "MS Revenue Opportunity" "0" "€#,0"),
            (New-Measure "MS Customer Category Mix" "0" "0.0%"),
            (New-Measure "MS National Category Mix" "0" "0.0%"),
            (New-Measure "MS Mix Index" "0" "0"),
            (New-Measure "MS Category Coverage" "0" "0%"),
            (New-Measure "MS Whitespace Count" "0" "0"),
            (New-Measure "MS Customer Strength Badge" '"Growth target"'),
            (New-Measure "MS Customer Action Badge" '"Grow"'),
            (New-Measure "MS Account Priority Score" "0" "0"),
            (New-Measure "MS Weighted Opportunity Score" "0" "#,0"),
            (New-Measure "MS Category Priority Score" "0" "0"),
            (New-Measure "MS Target RI Value" "100" "0"),
            (New-Measure "MS Target RI Label" '"RI 100 = National average"'),
            (New-Measure "MS Units to Target" "0" "#,0"),
            (New-Measure "MS Units to Reach RI 50" "0" "#,0"),
            (New-Measure "MS Units to Reach RI 75" "0" "#,0"),
            (New-Measure "MS Units to Reach RI 100" "0" "#,0"),
            (New-Measure "MS Units to Reach RI 150" "0" "#,0"),
            (New-Measure "MS Current vs Target Status" '"Below target"'),
            (New-Measure "MS Estimated Share %" "0" "0.0%"),
            (New-Measure "MS Benchmark Share %" "0" "0.0%"),
            (New-Measure "MS Benchmark Level" '"Average"'),
            (New-Measure "MS Targetable Units" "0" "#,0")
        )
    }
    [ordered]@{
        name = "dim_terumo_category"
        columns = @((New-Column "terumo_category"), (New-Column "terumo_category_key"))
    }
    [ordered]@{
        name = "dim_procedure"
        columns = @((New-Column "procedure_group"), (New-Column "procedure_group_key"))
    }
    [ordered]@{
        name = "Sales_Category"
        columns = @(
            (New-Column "Customer Id"),
            (New-Column "Customer Name"),
            (New-Column "Customer Combined"),
            (New-Column "Customer Segment"),
            (New-Column "CountryIso2"),
            (New-Column "Country Name"),
            (New-Column "Year" "int64"),
            (New-Column "Terumo Category"),
            (New-Column "Qty Sold" "double" "sum"),
            (New-Column "Sales EUR" "double" "sum")
        )
    }
    [ordered]@{
        name = "UK-IE"
        columns = @(
            (New-Column "Business Area"),
            (New-Column "Business Area Text"),
            (New-Column "Customer"),
            (New-Column "Relevant Account Flag - For Customer column"),
            (New-Column "Customer Name"),
            (New-Column "Final Destination"),
            (New-Column "Relevant Account Flag - For Final Destination"),
            (New-Column "Final Destination Text"),
            (New-Column "Current TIS Segmentation Reference (T360)"),
            (New-Column "New Relevant Flag"),
            (New-Column "HCO (Y/N)"),
            (New-Column "Original Sales Org"),
            (New-Column "Country"),
            (New-Column "Country Text"),
            (New-Column "Postal Code"),
            (New-Column "Location"),
            (New-Column "House number and street"),
            (New-Column "Tax Number"),
            (New-Column "key total"),
            (New-Column "Procedure"),
            (New-Column "Procedure Year" "int64"),
            (New-Column "Number of Procedures Done" "double" "sum")
        )
    }
    [ordered]@{
        name = "Final Destination"
        columns = @(
            (New-Column "Final Destination"),
            (New-Column "Final Destination Text"),
            (New-Column "Customer"),
            (New-Column "Customer Name"),
            (New-Column "Fiscal year" "int64"),
            (New-Column "Profit Center"),
            (New-Column "Index_Branch_CountryFinalDestination"),
            (New-Column "Product Hierarchy Final"),
            (New-Column "Final_Material"),
            (New-Column "SalesAssignmentID"),
            (New-Column "Net Sales Actual" "double" "sum"),
            (New-Column "Net Sales Qty Actual" "double" "sum"),
            (New-Column "Net Sales Qty Plan" "double" "sum"),
            (New-Column "Net Sales Plan (EUR)" "double" "sum"),
            (New-Column "Product Group Text"),
            (New-Column "Product Subgroup Text"),
            (New-Column "Product Hierarchy Code"),
            (New-Column "Product Area Code"),
            (New-Column "Profit Center 3"),
            (New-Column "Product Group 3"),
            (New-Column "Portfolio Category"),
            (New-Column "Portfolio Category 2")
        )
    }
    [ordered]@{
        name = "map_product_to_terumo_category"
        columns = @(
            (New-Column "product_group_text"),
            (New-Column "product_subgroup_text"),
            (New-Column "terumo_category"),
            (New-Column "product_group_key"),
            (New-Column "product_subgroup_key"),
            (New-Column "terumo_category_key")
        )
    }
    [ordered]@{
        name = "mapping_estimates_detail"
        columns = @(
            (New-Column "procedure_group"),
            (New-Column "product_group_text"),
            (New-Column "product_subgroup_text"),
            (New-Column "profit_center"),
            (New-Column "component_family"),
            (New-Column "qty_min" "double" "sum"),
            (New-Column "qty_mode" "double" "sum"),
            (New-Column "qty_max" "double" "sum"),
            (New-Column "assumption_notes"),
            (New-Column "confidence" "double" "sum"),
            (New-Column "terumo_category"),
            (New-Column "qty_expected" "double" "sum"),
            (New-Column "procedure_group_key"),
            (New-Column "terumo_category_key")
        )
    }
    [ordered]@{
        name = "bridge_procedure_to_terumo"
        columns = @(
            (New-Column "procedure_group_key"),
            (New-Column "terumo_category_key"),
            (New-Column "procedure_group"),
            (New-Column "terumo_category"),
            (New-Column "qty_units_per_procedure" "double" "sum"),
            (New-Column "mapping_row_count" "int64" "sum"),
            (New-Column "usage_rate_final" "double" "sum")
        )
    }
    [ordered]@{
        name = "dim_customer_market"
        columns = @(
            (New-Column "customer_id_"),
            (New-Column "customer_id"),
            (New-Column "customer_name"),
            (New-Column "country_iso2"),
            (New-Column "country_text"),
            (New-Column "customer_market_key")
        )
    }
    [ordered]@{
        name = "Target RI"
        columns = @((New-Column "Value" "int64" "sum"))
    }
    [ordered]@{
        name = "Shp_Dim_Country_Hierarchy"
        columns = @(
            (New-Column "Country"),
            (New-Column "Region"),
            (New-Column "Cluster"),
            (New-Column "Business Area"),
            (New-Column "Direct/Distrib"),
            (New-Column "Branch Code"),
            (New-Column "Branch Name"),
            (New-Column "Index_Branch_CountryFinalDestination"),
            (New-Column "Country Final Destination"),
            (New-Column "Country Final Destination Text"),
            (New-Column "Country Text")
        )
    }
    [ordered]@{
        name = "Data_SA"
        columns = @(
            (New-Column "SalesAssignmentID"),
            (New-Column "Sales Representative Mail"),
            (New-Column "Sales Representative Code"),
            (New-Column "Sales Representative Name"),
            (New-Column "Sales Reps Level"),
            (New-Column "Index_Reps_ProductAreaCode"),
            (New-Column "Sales Representative Mail - Copy"),
            (New-Column "Corrected_mail"),
            (New-Column "Sales Representative Mail Final"),
            (New-Column "Key Account Manager"),
            (New-Column "Key Account Manager Mail"),
            (New-Column "Key Account Manager Name")
        )
        measures = @((New-Measure "Branch & KAM Name" '"Branch / KAM"'))
    }
    [ordered]@{
        name = "Shp_Dim_SalesRep_Hierarchy"
        columns = @(
            (New-Column "Business Area Code"),
            (New-Column "Employee Email Sales Manager"),
            (New-Column "Employee Number Sales Manager"),
            (New-Column "Employee Name Sales Manager"),
            (New-Column "Employee email Regional Sales Manager"),
            (New-Column "Employee Name Regional Sales Manager"),
            (New-Column "Employee Number Regional Sales Manager"),
            (New-Column "Employee Number Sales Reps"),
            (New-Column "Employee Name Sales Reps"),
            (New-Column "Product Area Code"),
            (New-Column "Index_Reps_ProductAreaCode"),
            (New-Column "Employee email Sales Reps"),
            (New-Column "Sales Organisation"),
            (New-Column "Sales Representative Code")
        )
    }
)

$relationships = @(
    @{ name = "fact_market_potential_customer_id_to_Dim_Cust_Customer"; fromTable = "fact_market_potential"; fromColumn = "customer_id"; toTable = "Dim_Cust"; toColumn = "Customer" },
    @{ name = "fact_market_potential_terumo_category_to_dim_terumo_category_terumo_category"; fromTable = "fact_market_potential"; fromColumn = "terumo_category"; toTable = "dim_terumo_category"; toColumn = "terumo_category" },
    @{ name = "fact_market_potential_procedure_group_to_dim_procedure_procedure_group"; fromTable = "fact_market_potential"; fromColumn = "procedure_group"; toTable = "dim_procedure"; toColumn = "procedure_group" },
    @{ name = "fact_market_potential_customer_market_key_to_dim_customer_market_customer_market_key"; fromTable = "fact_market_potential"; fromColumn = "customer_market_key"; toTable = "dim_customer_market"; toColumn = "customer_market_key" },
    @{ name = "Sales_Category_Customer_Id_to_Dim_Cust_Customer"; fromTable = "Sales_Category"; fromColumn = "Customer Id"; toTable = "Dim_Cust"; toColumn = "Customer" },
    @{ name = "Sales_Category_Terumo_Category_to_dim_terumo_category_terumo_category"; fromTable = "Sales_Category"; fromColumn = "Terumo Category"; toTable = "dim_terumo_category"; toColumn = "terumo_category" },
    @{ name = "DATA_Customer_to_Dim_Cust_Customer"; fromTable = "DATA"; fromColumn = "Customer"; toTable = "Dim_Cust"; toColumn = "Customer"; crossFilteringBehavior = "bothDirections" },
    @{ name = "DATA_Final_Material_to_Dim_Product_Material"; fromTable = "DATA"; fromColumn = "Final_Material"; toTable = "Dim_Product"; toColumn = "Material" },
    @{ name = "DATA_Date_to_Dim_Cal_Date"; fromTable = "DATA"; fromColumn = "Date"; toTable = "Dim_Cal"; toColumn = "Date" },
    @{ name = "UK_IE_Customer_to_Dim_Cust_Customer"; fromTable = "UK-IE"; fromColumn = "Customer"; toTable = "Dim_Cust"; toColumn = "Customer" },
    @{ name = "Final_Destination_Customer_to_Dim_Cust_Customer"; fromTable = "Final Destination"; fromColumn = "Customer"; toTable = "Dim_Cust"; toColumn = "Customer" },
    @{ name = "mapping_estimates_detail_terumo_category_to_dim_terumo_category_terumo_category"; fromTable = "mapping_estimates_detail"; fromColumn = "terumo_category"; toTable = "dim_terumo_category"; toColumn = "terumo_category" },
    @{ name = "mapping_estimates_detail_procedure_group_to_dim_procedure_procedure_group"; fromTable = "mapping_estimates_detail"; fromColumn = "procedure_group"; toTable = "dim_procedure"; toColumn = "procedure_group" }
)

foreach ($table in $tables) {
    $table["partitions"] = @(
        (New-Partition -TableName $table.name -Columns $table.columns -SampleRows $sampleRowsByTable[$table.name])
    )
}

$model = [ordered]@{
    compatibilityLevel = 1600
    model = [ordered]@{
        culture = "en-US"
        defaultPowerBIDataSourceVersion = "powerBI_V3"
        sourceQueryCulture = "en-US"
        annotations = @(
            @{ name = "PBI_ProTooling"; value = "[`"DevMode`"]" },
            @{ name = "DummySemanticModel"; value = "true" },
            @{ name = "TargetReport"; value = "Terumo Market Share — Where to Go / How to Win" }
        )
        tables = $tables
        relationships = $relationships
    }
}

$semanticModelRoot = Join-Path $ProjectRoot "MarketShare.SemanticModel"
$definitionRoot = Join-Path $semanticModelRoot "definition"

New-Item -ItemType Directory -Force -Path $semanticModelRoot | Out-Null
New-Item -ItemType Directory -Force -Path $definitionRoot | Out-Null

$modelJson = $model | ConvertTo-Json -Depth 100

$pbism = [ordered]@{
    '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json"
    version = "4.2"
    settings = @{}
} | ConvertTo-Json -Depth 10

$platformPath = Join-Path $semanticModelRoot ".platform"
$platformObject = $null

if (Test-Path $platformPath) {
    $platformObject = Get-Content -Raw $platformPath | ConvertFrom-Json
} else {
    $platformObject = [ordered]@{
        '$schema' = "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json"
        metadata = [ordered]@{
            type = "SemanticModel"
            displayName = "MarketShare"
            description = "Dummy semantic model used to keep the MarketShare PBIP transferable before the real model is attached."
        }
        config = [ordered]@{
            version = "2.0"
            logicalId = [guid]::NewGuid().ToString()
        }
    }
}

$platformJson = $platformObject | ConvertTo-Json -Depth 20

Set-Content -Path (Join-Path $semanticModelRoot "model.bim") -Value $modelJson -Encoding utf8
Set-Content -Path (Join-Path $semanticModelRoot "definition.bim") -Value $modelJson -Encoding utf8
Set-Content -Path (Join-Path $semanticModelRoot "definition.pbism") -Value $pbism -Encoding utf8
Set-Content -Path (Join-Path $definitionRoot "definition.pbism") -Value $pbism -Encoding utf8
Set-Content -Path $platformPath -Value $platformJson -Encoding utf8

$legacyMetadataPath = Join-Path $semanticModelRoot "item.metadata.json"
if (Test-Path $legacyMetadataPath) {
    Remove-Item -LiteralPath $legacyMetadataPath -Force
}

Write-Host "Dummy semantic model generated at $semanticModelRoot"
