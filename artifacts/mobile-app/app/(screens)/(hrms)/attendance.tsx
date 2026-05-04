import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, Platform, RefreshControl, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost } from '@/lib/api';

interface Checkin { name: string; log_type: 'IN' | 'OUT'; time: string; }

const BLUE  = '#1a3fbd';
const RED   = '#ef4444';
const GREEN = '#16a34a';

function fmt(iso: string, mode: 'time' | 'date' | 'short') {
  try {
    const d = new Date(iso.replace(' ', 'T'));
    if (mode === 'time')  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (mode === 'short') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return iso; }
}

function formatDuration(startIso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(startIso.replace(' ', 'T')).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  } catch { return '—'; }
}

type Step = 'idle' | 'camera' | 'confirm' | 'submitting';

export default function AttendanceScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();
  const camRef  = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [checkins,   setCheckins]   = useState<Checkin[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now,        setNow]        = useState(new Date());
  const [elapsed,    setElapsed]    = useState('');
  const [step,       setStep]       = useState<Step>('idle');
  const [photo,      setPhoto]      = useState<string | null>(null);
  const [location,   setLocation]   = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitErr,  setSubmitErr]  = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadCheckins = useCallback(async () => {
    try {
      const r = await apiGet<{ data: Checkin[] }>('/api/mobile/hrms/checkins');
      setCheckins(r.data ?? []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadCheckins(); }, []);

  const lastLog  = checkins[checkins.length - 1];
  const isIn     = lastLog?.log_type === 'IN';
  const lastIn   = [...checkins].reverse().find(c => c.log_type === 'IN');
  const nextAction: 'IN' | 'OUT' = isIn ? 'OUT' : 'IN';
  const btnColor = nextAction === 'IN' ? BLUE : RED;

  // Live elapsed timer when checked in
  useEffect(() => {
    if (!isIn || !lastIn) { setElapsed(''); return; }
    const tick = () => setElapsed(formatDuration(lastIn.time));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isIn, lastIn]);

  const openCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) { Alert.alert('Camera required', 'Please allow camera access.'); return; }
    }
    setPhoto(null); setLocation(null); setSubmitErr(''); setStep('camera');
  };

  const takePicture = async () => {
    try {
      const pic = await camRef.current?.takePictureAsync({ base64: true, quality: 0.5 });
      setPhoto(pic?.uri ?? null);
      setStep('confirm');
      fetchLocation();
    } catch { Alert.alert('Error', 'Could not capture photo.'); }
  };

  const fetchLocation = async (mandatory = false) => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocLoading(false);
        if (mandatory) Alert.alert('GPS Required', 'Location access is required for check-out. Please enable it in Settings.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      let name = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) { const g = geo[0]; name = [g.street, g.district, g.city, g.region].filter(Boolean).join(', '); }
      } catch {}
      setLocation({ lat: latitude, lng: longitude, name });
    } catch {
      if (mandatory) Alert.alert('GPS Error', 'Could not get your location. Please retry.');
    }
    setLocLoading(false);
  };

  const submitCheckin = async () => {
    // GPS is MANDATORY for checkout
    if (nextAction === 'OUT' && !location && !locLoading) {
      setSubmitErr('GPS location is required for check-out. Please wait for location or tap Retry GPS.');
      return;
    }
    if (nextAction === 'OUT' && locLoading) {
      setSubmitErr('Waiting for GPS location…');
      return;
    }
    setStep('submitting'); setSubmitErr('');
    try {
      let photoB64: string | undefined;
      if (photo) {
        try {
          const res = await fetch(photo);
          const blob = await res.blob();
          photoB64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {}
      }
      await apiPost('/api/mobile/hrms/checkin', {
        log_type: nextAction, photo_base64: photoB64,
        latitude: location?.lat, longitude: location?.lng, location_name: location?.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('idle'); await loadCheckins();
    } catch (e: any) {
      setSubmitErr(e?.message || 'Submission failed.'); setStep('confirm');
    }
  };

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Header */}
      <View style={{ backgroundColor: BLUE, paddingTop: topPad + 12, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, left: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' }}>Attendance</Text>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
          {user?.employee_name || user?.display_name}{user?.department ? ` · ${user.department}` : ''}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCheckins(); }} tintColor={BLUE} />}
      >
        {/* Clock Card */}
        <View style={{ backgroundColor: colors.card, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 4 }}>
          <Text style={{ fontSize: 44, fontFamily: 'Inter_700Bold', color: colors.foreground, letterSpacing: -1 }}>{timeStr}</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 4 }}>{dateStr}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
            backgroundColor: isIn ? '#e8effd' : '#fee2e2', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isIn ? BLUE : RED }} />
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: isIn ? BLUE : RED }}>
              {loading ? 'Loading…' : isIn ? 'Checked In' : 'Not Checked In'}
            </Text>
          </View>

          {/* Elapsed time when checked in */}
          {isIn && !!elapsed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#e8effd', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 }}>
              <Ionicons name="timer-outline" size={14} color={BLUE} />
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: BLUE }}>Working: {elapsed}</Text>
            </View>
          )}
        </View>

        {/* Check In / Out Button */}
        <View style={{ position: 'relative', marginBottom: 24 }}>
          {/* Pulsing ring for checkout */}
          {isIn && (
            <View style={{ position: 'absolute', inset: -4, borderRadius: 22, borderWidth: 2, borderColor: RED + '40' }} />
          )}
          <TouchableOpacity onPress={openCamera} disabled={loading} activeOpacity={0.85}
            style={{ height: 68, borderRadius: 18, backgroundColor: btnColor, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 12, shadowColor: btnColor, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 },
              shadowRadius: 16, elevation: 6, opacity: loading ? 0.6 : 1 }}>
            <Ionicons name={nextAction === 'IN' ? 'camera-outline' : 'camera-reverse-outline'} size={26} color="#fff" />
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>
              {nextAction === 'IN' ? 'Check In' : 'Check Out'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* GPS lock notice for check-out */}
        {isIn && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff7ed', borderRadius: 14, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#fed7aa' }}>
            <Ionicons name="location" size={16} color="#ea580c" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#9a3412' }}>
              GPS location is required for check-out. Keep location services enabled.
            </Text>
          </View>
        )}

        {/* Today's Log */}
        <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Today's Log</Text>
        {loading ? <ActivityIndicator color={BLUE} /> : checkins.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ionicons name="time-outline" size={28} color="#94a3b8" />
            </View>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>No check-ins yet</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 4 }}>Tap Check In to start your day</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            {checkins.map((c, i) => (
              <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: i < checkins.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.log_type === 'IN' ? '#e8effd' : '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={c.log_type === 'IN' ? 'log-in-outline' : 'log-out-outline'} size={20} color={c.log_type === 'IN' ? BLUE : RED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: c.log_type === 'IN' ? BLUE : RED }}>
                    {c.log_type === 'IN' ? 'Check In' : 'Check Out'}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 1 }}>{fmt(c.time, 'date')}</Text>
                </View>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{fmt(c.time, 'time')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Camera Modal */}
      <Modal visible={step === 'camera'} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView ref={camRef} style={{ flex: 1 }} facing="front">
            <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setStep('idle')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff', flex: 1, textAlign: 'center' }}>
                {nextAction === 'IN' ? 'Check In' : 'Check Out'} — Selfie
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* GPS badge */}
            {nextAction === 'OUT' && (
              <View style={{ alignSelf: 'center', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(234,88,12,0.85)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 }}>
                <Ionicons name="location" size={12} color="#fff" />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>GPS will be captured automatically</Text>
              </View>
            )}

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 200, height: 260, borderRadius: 100, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.7)', borderStyle: 'dashed' }} />
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 20 }}>Position your face in the oval</Text>
            </View>
            <View style={{ paddingBottom: insets.bottom + 40, alignItems: 'center' }}>
              <TouchableOpacity onPress={takePicture}
                style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={36} color={BLUE} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={step === 'confirm' || step === 'submitting'} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ backgroundColor: btnColor, paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setStep('camera')} disabled={step === 'submitting'}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', flex: 1 }}>
              Confirm {nextAction === 'IN' ? 'Check In' : 'Check Out'}
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 24 }}>
            {photo && (
              <View style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: 0.75, backgroundColor: '#000' }}>
                <Image source={{ uri: photo }} style={{ flex: 1 }} resizeMode="cover" />
                <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="camera" size={12} color="#fff" />
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Selfie Captured</Text>
                </View>
              </View>
            )}

            {/* Location Card */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1,
              borderColor: nextAction === 'OUT' && !locLoading && !location ? '#fecaca' : colors.border,
              flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: location ? '#dbeafe' : '#fee2e2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ionicons name="location-outline" size={20} color={location ? '#2563eb' : RED} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>GPS Location</Text>
                  {nextAction === 'OUT' && (
                    <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: RED }}>REQUIRED</Text>
                    </View>
                  )}
                </View>
                {locLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Getting GPS location…</Text>
                  </View>
                ) : location ? (
                  <>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground }}>{location.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</Text>
                  </>
                ) : (
                  <View>
                    <Text style={{ fontSize: 13, color: RED, fontFamily: 'Inter_500Medium' }}>Location unavailable</Text>
                    <TouchableOpacity onPress={() => fetchLocation(nextAction === 'OUT')} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e8effd', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' }}>
                      <Ionicons name="refresh" size={13} color={BLUE} />
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: BLUE }}>Retry GPS</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Time Card */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: '#e8effd', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="time-outline" size={20} color={BLUE} />
              </View>
              <View>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Time</Text>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{timeStr}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{dateStr}</Text>
              </View>
            </View>

            {/* Working Duration (for checkout) */}
            {nextAction === 'OUT' && !!elapsed && (
              <View style={{ backgroundColor: '#e8effd', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: BLUE + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="timer-outline" size={20} color={BLUE} />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Working Duration</Text>
                  <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: BLUE }}>{elapsed}</Text>
                </View>
              </View>
            )}

            {!!submitErr && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', gap: 10 }}>
                <Ionicons name="alert-circle-outline" size={18} color={RED} />
                <Text style={{ fontSize: 13, color: RED, flex: 1 }}>{submitErr}</Text>
              </View>
            )}

            {/* Submit — blocked for OUT if no GPS */}
            {nextAction === 'OUT' && !location && !locLoading ? (
              <View>
                <View style={{ height: 60, borderRadius: 16, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
                  <Ionicons name="location-outline" size={22} color="#94a3b8" />
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#94a3b8' }}>Waiting for GPS…</Text>
                </View>
                <TouchableOpacity onPress={() => fetchLocation(true)} style={{ marginTop: 10, height: 48, borderRadius: 14, backgroundColor: BLUE + '18', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="refresh" size={18} color={BLUE} />
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: BLUE }}>Retry GPS Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={submitCheckin} disabled={step === 'submitting'} activeOpacity={0.85}
                style={{ height: 60, borderRadius: 16, backgroundColor: btnColor, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, opacity: step === 'submitting' ? 0.7 : 1, shadowColor: btnColor, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 5 }}>
                {step === 'submitting' ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name={nextAction === 'IN' ? 'log-in-outline' : 'log-out-outline'} size={22} color="#fff" />
                    <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff' }}>
                      Confirm {nextAction === 'IN' ? 'Check In' : 'Check Out'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
