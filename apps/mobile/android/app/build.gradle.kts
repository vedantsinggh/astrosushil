import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing: credentials live in android/key.properties (gitignored, never committed).
// See apps/mobile/docs/android-release.md for how to create the upload keystore.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
} else {
    logger.warn(
        "WARNING: android/key.properties not found. Release builds will be signed with the " +
            "DEBUG key. Such builds cannot be uploaded to Google Play. " +
            "See apps/mobile/docs/android-release.md."
    )
}

android {
    namespace = "com.astrosushil.app"
    // Pinned explicitly (Flutter 3.47 defaults: compile 36 / target 36 / min 24).
    // Google Play requires targetSdk >= 35 for new apps and updates (since Aug 2025).
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.astrosushil.app"
        // 24 is required by google_sign_in_android and url_launcher_android.
        minSdk = 24
        targetSdk = 36
        // Derived from `version:` in pubspec.yaml (versionName+versionCode).
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig =
                if (hasReleaseKeystore) {
                    signingConfigs.getByName("release")
                } else {
                    // Fallback so local `flutter build --release` still works without the
                    // upload key. NOT uploadable to Play.
                    signingConfigs.getByName("debug")
                }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

flutter {
    source = "../.."
}
