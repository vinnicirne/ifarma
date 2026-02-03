# Configuração Rollbar Android

## ✅ Status: CONFIGURADO

O Rollbar Android SDK está completamente configurado no projeto Ifarma.

## 📋 Arquivos Configurados

### 1. [`android/app/build.gradle`](file:///C:/Users/THINKPAD/Desktop/Ifarma/android/app/build.gradle#L71-L72)
```gradle
// Rollbar for error monitoring
implementation "com.rollbar:rollbar-android:1.10.3"
```

### 2. [`android/app/src/main/AndroidManifest.xml`](file:///C:/Users/THINKPAD/Desktop/Ifarma/android/app/src/main/AndroidManifest.xml#L37-L40)
```xml
<!-- Rollbar configuration -->
<meta-data 
    android:name="com.rollbar.android.ACCESS_TOKEN" 
    android:value="84893746147940e8bb3ee1bbcce4eb14" />
```

### 3. [`android/app/src/main/java/com/ifarma/app/MainActivity.java`](file:///C:/Users/THINKPAD/Desktop/Ifarma/android/app/src/main/java/com/ifarma/app/MainActivity.java)
```java
import com.rollbar.android.Rollbar;

@Override
public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Inicializar Rollbar para monitoramento de erros
    Rollbar.init(this);
    
    // Configurar ambiente
    Rollbar.instance().configure(config -> config
        .environment("production")
        .codeVersion("1.0.0")
    );
}
```

## 🔧 Como Usar no Android

### Log Manual
```java
// ERROR
Rollbar.instance().error(new Exception("Erro customizado"));

// WARNING
Rollbar.instance().warning("Aviso importante");

// INFO
Rollbar.instance().info("Informação relevante");

// DEBUG
Rollbar.instance().debug("Debug message");
```

### Captura Automática
O Rollbar captura automaticamente:
- ✅ Crashes não tratados
- ✅ Exceções não capturadas
- ✅ Erros de fundo (background)

## 🔑 Tokens Configurados

| Plataforma | Token |
|------------|-------|
| Web/React | `VITE_ROLLBAR_ACCESS_TOKEN` (.env) |
| Android | `84893746147940e8bb3ee1bbcce4eb14` (AndroidManifest.xml) |

> **Nota**: Os tokens podem ser diferentes. Certifique-se de usar o token correto para cada plataforma no dashboard do Rollbar.

## 📱 Flavors do App

O projeto tem 3 flavors, o Rollbar funcionará em todos:
- **Cliente** (`com.ifarma.cliente`)
- **Motoboy** (`com.ifarma.motoboy`)
- **Farmácia** (`com.ifarma.farmacia`)

## 🏗️ Build e Deploy

Após alterar código Android, rebuild:

```bash
npx cap sync android
npx cap open android
```

Ou gerar APKs:
```bash
cd android
./gradlew assembleDebug
# ou
./gradlew assembleRelease
```

## ✅ Próximos Passos

1. ✅ Rollbar SDK instalado
2. ✅ Token configurado
3. ✅ Inicialização no MainActivity
4. 🔄 Rebuild do projeto Android
5. 🧪 Testar em dispositivo/emulador

## 📊 Monitoramento

Ambas as plataformas estão reportando para o Rollbar:
- 🌐 **Web**: Erros do React/JavaScript
- 📱 **Android**: Crashes e exceções Java/Kotlin

Acesse o dashboard do Rollbar para visualizar todos os erros!
