@echo off
REM ============================================================
REM  Lead Management Dashboard — Formatting Script
REM  Run this AFTER binding live data to visuals
REM  Works on any laptop with pbir-cli installed
REM ============================================================

SET PBIR=pbir
SET BASE=LeadManagement.Report

REM -- Auto-detect pbir if not on PATH --
IF NOT EXIST "%PBIR%" (
    SET PBIR=C:\Users\%USERNAME%\AppData\Roaming\Python\Python312\Scripts\pbir.exe
)

echo.
echo ================================================
echo  Lead Management Dashboard - Applying Formatting
echo ================================================
echo.

REM ── STEP 1: THEME COLORS ─────────────────────────────────────
echo [1/7] Applying brand theme colors...
"%PBIR%" theme set-colors "%BASE%" ^
  --data-colors "[\"#0078D4\",\"#107C10\",\"#FFB900\",\"#D13438\",\"#605E5C\",\"#00B4D8\",\"#5A189A\",\"#2D6A4F\"]" ^
  --good "#107C10" ^
  --bad  "#D13438" ^
  --neutral "#605E5C" ^
  --accent "#0078D4"

REM ── STEP 2: SHOW BORDERS ON ALL VISUALS ──────────────────────
echo [2/7] Adding borders to all visuals...
"%PBIR%" set "%BASE%/**/*.Visual.border.show" --value true -f

REM ── STEP 3: TITLE FORMATTING (ALL VISUALS) ───────────────────
echo [3/7] Formatting visual titles...
"%PBIR%" set "%BASE%/**/*.Visual.title.fontSize"   --value 12 -f
"%PBIR%" set "%BASE%/**/*.Visual.title.fontBold"   --value true -f
"%PBIR%" set "%BASE%/**/*.Visual.title.show"       --value true -f

REM ── STEP 4: DATA LABELS ON CHARTS ────────────────────────────
echo [4/7] Enabling data labels on bar and column charts...
"%PBIR%" set "%BASE%/**/clusteredBarChart*.Visual.labels.show"    --value true -f
"%PBIR%" set "%BASE%/**/barChart*.Visual.labels.show"             --value true -f
"%PBIR%" set "%BASE%/**/columnChart*.Visual.labels.show"          --value true -f
"%PBIR%" set "%BASE%/**/stackedBarChart*.Visual.labels.show"      --value true -f
"%PBIR%" set "%BASE%/**/stackedColumnChart*.Visual.labels.show"   --value true -f
"%PBIR%" set "%BASE%/**/clusteredColumnChart*.Visual.labels.show" --value true -f

REM ── STEP 5: FUNNEL DATA LABELS ───────────────────────────────
echo [5/7] Enabling funnel labels...
"%PBIR%" set "%BASE%/**/funnel*.Visual.labels.show"    --value true -f
"%PBIR%" set "%BASE%/**/funnel*.Visual.percentLabels.show" --value true -f

REM ── STEP 6: LINE CHART MARKERS ───────────────────────────────
echo [6/7] Enabling line chart markers...
"%PBIR%" set "%BASE%/**/lineChart*.Visual.markers.show" --value true -f

REM ── STEP 7: VALIDATE ─────────────────────────────────────────
echo [7/7] Validating report...
"%PBIR%" validate "%BASE%"

echo.
echo ================================================
echo  Done! Open in Power BI Desktop to review.
echo  pbir open "%BASE%"
echo ================================================
echo.
echo NOTE: The following require LIVE DATA to configure:
echo   - Conditional formatting (green/amber/red thresholds)
echo   - Sort order on charts
echo   - KPI sparklines and trend arrows
echo   - Drill-through cross-filtering
echo.
pause
