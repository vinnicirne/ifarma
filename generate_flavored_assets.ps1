$flavors = @("cliente", "motoboy", "farmacia")
$resPath = "resources"
$androidSrcPath = "android/app/src"

# Backup original default assets if needed (optional)
# Using 'icon.png' and 'splash.png' as transient filenames for generation

foreach ($flavor in $flavors) {
    Write-Host "Processando Flavor: $flavor"

    # 1. Prepare resources
    Copy-Item "$resPath/$flavor-icon.png" "$resPath/icon.png" -Force
    Copy-Item "$resPath/$flavor-splash.png" "$resPath/splash.png" -Force

    # 2. Generate Assets (This puts them in android/app/src/main/res)
    Write-Host "Gerando assets..."
    cmd /c "npx @capacitor/assets generate --android"

    # 3. Create destination directory
    $destPath = "$androidSrcPath/$flavor/res"
    if (!(Test-Path $destPath)) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    }

    # 4. Move generated resources to flavor directory
    # We need to move mipmap-* and drawable-* and values/ic_launcher.xml?
    # Capacitor assets generated:
    # - mipmap-anydpi-v26/ic_launcher.xml
    # - mipmap-anydpi-v26/ic_launcher_round.xml
    # - mipmap-hdpi/ic_launcher.png ...
    # - drawable/splash.png ...
    # - values/styles.xml (splash theme)
    
    # Simple strategy: Move everything from main/res that looks like an asset
    # But be careful not to move non-asset files if Capacitor touched them.
    # Actually, copying everything from main/res to flavor/res is safer for isolation
    # IF we clean main/res afterwards or if we accept duplication.
    # Better: Move specific folders.

    $assetFolders = @(
        "mipmap-hdpi", "mipmap-mdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi", 
        "mipmap-anydpi-v26",
        "drawable", "drawable-land-mdpi", "drawable-land-xhdpi", "drawable-land-xxhdpi", "drawable-land-xxxhdpi",
        "drawable-port-mdpi", "drawable-port-xhdpi", "drawable-port-xxhdpi", "drawable-port-xxxhdpi"
    )

    foreach ($folder in $assetFolders) {
        $source = "$androidSrcPath/main/res/$folder"
        $dest = "$destPath/$folder"
        
        if (Test-Path $source) {
            Write-Host "Movendo $folder para $flavor..."
            if (!(Test-Path $dest)) {
                New-Item -ItemType Directory -Path $dest -Force | Out-Null
            }
            Copy-Item "$source/*" "$dest" -Recurse -Force
        }
    }
    
    # Move splash logic (styles.xml usually modified by capacitor-assets? No, it creates ic_launcher_background.xml in values sometimes)
    # Check for values/ic_launcher_background.xml
    if (Test-Path "$androidSrcPath/main/res/values/ic_launcher_background.xml") {
        Copy-Item "$androidSrcPath/main/res/values/ic_launcher_background.xml" "$destPath/values/" -Force
    }

    Write-Host "Concluido para $flavor"
}

Write-Host "Geracao de Multi-Flavor Assets Finalizada!"
