import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

type Step = "email" | "otp";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const passwordRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);

  async function sendOtp() {
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!password.trim()) { setError("Please enter your password"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch<{ maskedEmail?: string; masked_email?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMaskedEmail(res.maskedEmail || res.masked_email || email);
      setStep("otp");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) { setError("Please enter the OTP"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch<{ email: string; full_name: string; photo?: string | null }>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      await login({ email: res.email, full_name: res.full_name, photo: res.photo ?? null });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const s = styles(colors, insets);

  return (
    <LinearGradient
      colors={[colors.primary + "22", colors.background, colors.background]}
      style={s.gradient}
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.container}>
          <View style={s.logoBox}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={s.logo}
              contentFit="contain"
            />
            <Text style={s.appName}>FlowMatriX</Text>
            <Text style={s.tagline}>WTT International India</Text>
          </View>

          <View style={s.card}>
            <Text style={s.title}>
              {step === "email" ? "Sign In" : "Verify OTP"}
            </Text>
            <Text style={s.subtitle}>
              {step === "email"
                ? "Enter your work email to continue"
                : `Code sent to ${maskedEmail}`}
            </Text>

            {step === "email" ? (
              <View style={s.inputGroup}>
                <View style={s.inputWrapper}>
                  <Feather name="mail" size={18} color={colors.mutedForeground} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
                <View style={s.inputWrapper}>
                  <Feather name="lock" size={18} color={colors.mutedForeground} style={s.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={s.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(""); }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={sendOtp}
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={s.inputGroup}>
                <View style={s.inputWrapper}>
                  <Feather name="shield" size={18} color={colors.mutedForeground} style={s.inputIcon} />
                  <TextInput
                    ref={otpRef}
                    style={s.input}
                    placeholder="6-digit code"
                    placeholderTextColor={colors.mutedForeground}
                    value={otp}
                    onChangeText={(t) => { setOtp(t); setError(""); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={verifyOtp}
                  />
                </View>
              </View>
            )}

            {!!error && (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }, loading && { opacity: 0.7 }]}
              onPress={step === "email" ? sendOtp : verifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>
                  {step === "email" ? "Send Code" : "Verify & Sign In"}
                </Text>
              )}
            </Pressable>

            {step === "otp" && (
              <Pressable style={s.backBtn} onPress={() => { setStep("email"); setOtp(""); setPassword(""); setError(""); }}>
                <Text style={s.backText}>Back to email</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    gradient: { flex: 1 },
    flex: { flex: 1 },
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20,
    },
    logoBox: { alignItems: "center", marginBottom: 36 },
    logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 12 },
    appName: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: c.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.mutedForeground,
      marginTop: 4,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: c.radius + 6,
      padding: 24,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground, marginBottom: 6 },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginBottom: 24 },
    inputGroup: { gap: 12, marginBottom: 16 },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.muted,
      borderRadius: c.radius,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      height: 50,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: c.foreground,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    errorText: { fontSize: 13, color: c.destructive, fontFamily: "Inter_400Regular" },
    btn: {
      backgroundColor: c.primary,
      height: 50,
      borderRadius: c.radius,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    backBtn: { alignItems: "center", marginTop: 16 },
    backText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
