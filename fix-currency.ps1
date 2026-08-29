Get-ChildItem -Path "D:\Perfume Note\Perfume Note\src" -Recurse -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $newContent = $content -replace [regex]::Escape("ر.س"), "ج.م" -replace "SAR", "ج.م"
    if ($content -ne $newContent) {
        Set-Content $_.FullName $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($_.FullName)"
    }
}
Write-Host "Done!"
