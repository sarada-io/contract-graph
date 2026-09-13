#Requires -Version 7.0
param([switch]$Help)

# This is Contract Graph's menu, not a generic task runner or configuration format.
$script:RepositoryRoot = Split-Path -Parent $PSScriptRoot

function Get-MenuItems {
    $version = (Get-Content -LiteralPath (Join-Path $script:RepositoryRoot 'package.json') -Raw | ConvertFrom-Json).version
    return @(
        @{ Label = 'Build the package'; Detail = 'Compile the distributable into dist/build.'; Script = 'build' }
        @{ Label = 'Run all tests'; Detail = 'Run the repository test suite with isolated scratch files.'; Script = 'test' }
        @{ Label = "Create release archive ($version)"; Detail = "Build and create dist/tar/contract-graph-$version.tgz. Does not publish or change the version."; Script = 'pack' }
        @{ Label = 'Check the existing build'; Detail = 'Check dist/build against source without rebuilding it.'; Script = 'build:check' }
        @{ Label = 'Try editor integration'; Detail = 'Choose an editor and create its disposable repository under tmp/.'; Kind = 'editor' }
        @{ Label = 'Show CLI commands'; Detail = 'Show the existing cg command-line help.'; Kind = 'help' }
        @{ Label = 'Check development environment'; Detail = 'Show Node/npm versions and check installed dependencies.'; Kind = 'doctor' }
        @{ Label = 'Clean generated files'; Detail = 'Delete build/, dist/, tmp/, and compiled/. You will be asked before deletion.'; Kind = 'clean' }
        @{ Label = 'Exit'; Detail = 'Return to your terminal.'; Kind = 'exit' }
    )
}

function Get-NextSelection([int]$Index, [int]$Count, [string]$Key) {
    switch ($Key) {
        'UpArrow' { return ($Index + $Count - 1) % $Count }
        'DownArrow' { return ($Index + 1) % $Count }
        'Home' { return 0 }
        'End' { return $Count - 1 }
        default { return $Index }
    }
}

function Read-MenuChoice([string]$Title, [array]$Items) {
    if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected) {
        throw 'The arrow-key menu needs an interactive terminal. Run ./urun (macOS) or urun.cmd (Windows) in your terminal.'
    }
    $selected = 0
    $escape = [char]27
    $previousControlC = [Console]::TreatControlCAsInput
    try {
        [Console]::TreatControlCAsInput = $true
        # Alternate screen keeps command output and the original prompt intact.
        [Console]::Write("$escape[?1049h$escape[?25l")
        while ($true) {
            $width = [Math]::Max(20, [Console]::WindowWidth - 4)
            [Console]::Write("$escape[H$escape[2J`n  $escape[1;36m$Title$escape[0m`n`n")
            for ($i = 0; $i -lt $Items.Count; $i++) {
                $label = [string]$Items[$i].Label
                if ($label.Length -gt $width) { $label = $label.Substring(0, $width - 3) + '...' }
                if ($i -eq $selected) {
                    [Console]::Write("  $escape[7m > $label $escape[0m`n")
                } else {
                    [Console]::Write("     $label`n")
                }
            }
            [Console]::Write("`n  $($Items[$selected].Detail)`n`n  Up/Down: choose    Enter: run    Esc: back/exit`n")
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'Escape' -or ($key.Key -eq 'C' -and ($key.Modifiers -band [ConsoleModifiers]::Control))) {
                return -1
            }
            if ($key.Key -eq 'Enter') { return $selected }
            $selected = Get-NextSelection $selected $Items.Count $key.Key.ToString()
        }
    } finally {
        [Console]::Write("$escape[0m$escape[?25h$escape[?1049l")
        [Console]::TreatControlCAsInput = $previousControlC
    }
}

function Invoke-RepoCommand([string]$Command, [string[]]$Arguments) {
    # Resolve the native executable, avoiding PowerShell's npm.ps1 execution-policy shim.
    $executable = if ($Command -eq 'npm' -and $IsWindows) { 'npm.cmd' } else { $Command }
    if (-not (Get-Command $executable -CommandType Application -ErrorAction SilentlyContinue)) {
        throw "Missing $executable. Install this repository's Node.js prerequisites and run npm ci."
    }
    Write-Host "`n> $Command $($Arguments -join ' ')`n" -ForegroundColor Cyan
    Push-Location -LiteralPath $script:RepositoryRoot
    try {
        $PSNativeCommandUseErrorActionPreference = $false
        & $executable @Arguments | Out-Host
        return $LASTEXITCODE
    } finally {
        Pop-Location
    }
}

function Invoke-MenuItem($Item) {
    if ($Item.Script) { return Invoke-RepoCommand 'npm' @('run', $Item.Script) }
    switch ($Item.Kind) {
        'help' { return Invoke-RepoCommand 'node' @('bin/cg.js', '--help') }
        'doctor' {
            foreach ($command in @(
                @{ Name = 'node'; Arguments = @('--version') }
                @{ Name = 'npm'; Arguments = @('--version') }
                @{ Name = 'npm'; Arguments = @('ls', '--depth=0') }
            )) {
                $status = Invoke-RepoCommand $command.Name $command.Arguments
                if ($status -ne 0) { return $status }
            }
            return 0
        }
        'editor' {
            $editors = @('codex', 'claude', 'cursor', 'copilot', 'antigravity', 'all')
            $choices = @($editors | ForEach-Object {
                @{ Label = $_; Detail = "Recreates tmp/$_ with this editor's integration. Existing contents there will be replaced." }
            }) + @(@{ Label = 'Back'; Detail = 'Return without creating a fixture.' })
            $choice = Read-MenuChoice 'Try editor integration' $choices
            if ($choice -lt 0 -or $choice -eq $editors.Count) { return $null }
            $editor = $editors[$choice]
            if (Test-Path -LiteralPath (Join-Path $script:RepositoryRoot "tmp/$editor")) {
                $confirm = Read-MenuChoice "Replace tmp/$editor?" @(
                    @{ Label = 'Keep existing files'; Detail = 'Return to the menu.' }
                    @{ Label = 'Replace this disposable fixture'; Detail = "Deletes and recreates tmp/$editor only." }
                )
                if ($confirm -ne 1) { return $null }
            }
            return Invoke-RepoCommand 'npm' @('run', 'try', '--', $editor)
        }
        'clean' {
            $choice = Read-MenuChoice 'Delete generated files?' @(
                @{ Label = 'Keep files and go back'; Detail = 'Nothing will be deleted.' }
                @{ Label = 'Delete build, dist, tmp, and compiled'; Detail = 'Includes disposable editor fixtures and local scratch files.' }
            )
            if ($choice -ne 1) { return $null }
            return Invoke-RepoCommand 'npm' @('run', 'clean')
        }
        default { throw 'Unknown menu activity.' }
    }
}

function Start-RepositoryMenu {
    $ErrorActionPreference = 'Stop'
    $items = Get-MenuItems
    if ($Help -or [Console]::IsInputRedirected -or [Console]::IsOutputRedirected) {
        Write-Host 'Contract Graph - repository menu'
        $items | ForEach-Object { Write-Host "  $($_.Label)" }
        if ($Help) { return 0 }
        [Console]::Error.WriteLine('Open an interactive terminal and run ./urun or urun.cmd to select with arrow keys. Nothing was executed.')
        return 1
    }
    $lastStatus = 0
    while ($true) {
        $choice = Read-MenuChoice 'Contract Graph' $items
        if ($choice -lt 0 -or $items[$choice].Kind -eq 'exit') { return $lastStatus }
        try {
            $result = Invoke-MenuItem $items[$choice]
            if ($null -eq $result) { continue }
            $lastStatus = [int]$result
        } catch {
            Write-Host $_.Exception.Message -ForegroundColor Red
            $lastStatus = 1
        }
        if ($lastStatus -eq 0) { Write-Host "`nDone." -ForegroundColor Green }
        else { Write-Host "`nCommand failed (exit $lastStatus)." -ForegroundColor Red }
        Write-Host 'Press Enter to return to the menu, or Esc to exit.'
        while ($true) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'Escape') { return $lastStatus }
            if ($key.Key -eq 'Enter') { break }
        }
    }
}

# Dot-sourcing exposes the small functions for tests without opening a menu.
if ($MyInvocation.InvocationName -ne '.') {
    try { exit (Start-RepositoryMenu) }
    catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
}
