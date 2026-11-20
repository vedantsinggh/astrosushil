# R8 keep rules for the Astro Sushil release build.
# Flutter's own engine/embedding rules are added automatically by the Flutter Gradle plugin.

# --- Razorpay Checkout (from Razorpay's Android integration docs) ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-keepclasseswithmembers class * {
    public void onPayment*(...);
}
# Razorpay references ProGuard annotation classes that are not on the classpath.
-dontwarn proguard.annotation.Keep
-dontwarn proguard.annotation.KeepClassMembers
# Razorpay docs also list `-optimizations !method/inlining/*`; R8 ignores -optimizations,
# so it is intentionally omitted.
