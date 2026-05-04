import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useEnquiry } from '@/context/EnquiryContext';
import { LocalEnquiry } from '@/lib/storage';

const SECTORS = ['Textiles', 'Dyeing & Bleaching', 'Pharmaceutical', 'Chemical', 'Food & Beverage', 'Pulp & Paper', 'Tannery', 'Electroplating', 'Automobile', 'Power Plant', 'Refinery', 'Other'];
const SOURCES = ['Expo / Trade Show', 'Reference / Word of Mouth', 'Website Enquiry', 'Walk-in', 'Phone Call', 'Email', 'WhatsApp', 'Social Media', 'Existing Client', 'Consultant / Architect', 'Tender', 'Other'];
const TREATMENTS = ['Primary Treatment', 'Secondary (Biological)', 'Tertiary', 'Membrane (UF/RO)', 'ZLD', 'Recovery of Salt', 'Recovery of Water'];
const INLET_KEYS = [
  { k: 'ph', l: 'pH' }, { k: 'cod', l: 'COD', u: 'mg/l' }, { k: 'bod', l: 'BOD', u: 'mg/l' },
  { k: 'tds', l: 'TDS', u: 'mg/l' }, { k: 'tss', l: 'TSS', u: 'mg/l' }, { k: 'temperature', l: 'Temp', u: '°C' },
];

type Form = {
  industry_name: string; contact_person: string; designation: string;
  mobile_no: string; email: string; sector: string; source: string;
  address: string; district: string; state: string; country: string; pincode: string;
  latitude: string; longitude: string;
  has_existing_plant: 'yes' | 'no' | '';
  effluent_capacity: string; treatment_required: string[];
  inlet: Record<string, string>;
  discharge_norm: string; budget_range: string; commissioning_target: string; remarks: string;
};

const EMPTY: Form = {
  industry_name: '', contact_person: '', designation: '', mobile_no: '', email: '',
  sector: '', source: '',
  address: '', district: '', state: '', country: 'India', pincode: '', latitude: '', longitude: '',
  has_existing_plant: '',
  effluent_capacity: '20', treatment_required: [],
  inlet: {},
  discharge_norm: '', budget_range: '', commissioning_target: '', remarks: '',
};

function newId() { return `pe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }

function SField({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType || 'default'}
        style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.card }}
      />
    </View>
  );
}

function Chips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const on = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => { onToggle(opt); Haptics.selectionAsync(); }}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: on ? '#fff' : colors.foreground }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: 'yes' | 'no' | ''; onChange: (v: 'yes' | 'no') => void }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['yes', 'no'] as const).map(v => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, backgroundColor: value === v ? (v === 'yes' ? colors.success : colors.destructive) : colors.card, borderColor: value === v ? (v === 'yes' ? colors.success : colors.destructive) : colors.border }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: value === v ? '#fff' : colors.foreground, textTransform: 'uppercase' }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const STEPS = ['Contact', 'Location', 'Technical', 'Submit'];

export default function NewEnquiryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addOrUpdateEnquiry, isOnline } = useEnquiry();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Form) => (v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleTreatment = (v: string) => setForm(p => ({
    ...p,
    treatment_required: p.treatment_required.includes(v)
      ? p.treatment_required.filter(x => x !== v)
      : [...p.treatment_required, v],
  }));
  const setInlet = (k: string, v: string) => setForm(p => ({ ...p, inlet: { ...p.inlet, [k]: v } }));

  const getLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setForm(p => ({ ...p, latitude: String(loc.coords.latitude.toFixed(6)), longitude: String(loc.coords.longitude.toFixed(6)) }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setLocating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const enquiry: LocalEnquiry = {
        id: newId(),
        form_data: form as unknown as Record<string, unknown>,
        sync_status: isOnline ? 'pending' : 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_name: form.industry_name,
      };
      await addOrUpdateEnquiry(enquiry);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSaving(false);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'New Plant Enquiry', headerBackTitle: 'Back' }} />
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Step indicator */}
      <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                {i > 0 && <View style={{ flex: 1, height: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />}
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= step ? colors.primary : colors.muted, borderWidth: 1.5, borderColor: i <= step ? colors.primary : colors.border }}>
                  {i < step
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: i === step ? '#fff' : colors.mutedForeground }}>{i + 1}</Text>}
                </View>
                {i < STEPS.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < step ? colors.primary : colors.border }} />}
              </View>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: i === step ? colors.primary : colors.mutedForeground, marginTop: 4 }}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 24 }} keyboardShouldPersistTaps="handled">

        {/* Step 0: Contact */}
        {step === 0 && (
          <View>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 20 }}>Contact Information</Text>
            <SField label="Company / Industry Name *" value={form.industry_name} onChange={set('industry_name')} placeholder="e.g. Sunrise Textiles Ltd" />
            <SField label="Contact Person" value={form.contact_person} onChange={set('contact_person')} placeholder="Name" />
            <SField label="Designation" value={form.designation} onChange={set('designation')} placeholder="GM, Plant Manager, etc." />
            <SField label="Mobile No" value={form.mobile_no} onChange={set('mobile_no')} placeholder="+91 98765 43210" keyboardType="phone-pad" />
            <SField label="Email" value={form.email} onChange={set('email')} placeholder="contact@example.com" keyboardType="email-address" />
            <Chips label="Industry Sector" options={SECTORS} selected={form.sector ? [form.sector] : []} onToggle={v => set('sector')(form.sector === v ? '' : v)} />
            <Chips label="Source" options={SOURCES} selected={form.source ? [form.source] : []} onToggle={v => set('source')(form.source === v ? '' : v)} />
          </View>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <View>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 20 }}>Site Location</Text>
            <SField label="Address" value={form.address} onChange={set('address')} placeholder="Plant / Factory address" />
            <SField label="District" value={form.district} onChange={set('district')} placeholder="District" />
            <SField label="State" value={form.state} onChange={set('state')} placeholder="State" />
            <SField label="Country" value={form.country} onChange={set('country')} placeholder="Country" />
            <SField label="PIN / ZIP Code" value={form.pincode} onChange={set('pincode')} placeholder="Pincode" keyboardType="numeric" />

            {/* GPS */}
            <TouchableOpacity
              onPress={getLocation}
              disabled={locating}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.primary }}
            >
              {locating
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Ionicons name="locate-outline" size={22} color={colors.primary} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>
                  {locating ? 'Getting location…' : form.latitude ? 'Location captured — tap to update' : 'Capture GPS Location'}
                </Text>
                {!!form.latitude && (
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>
                    {form.latitude}, {form.longitude}
                  </Text>
                )}
              </View>
              {!!form.latitude && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Technical */}
        {step === 2 && (
          <View>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 20 }}>Technical Details</Text>
            <YesNo label="Existing ETP / STP / ZLD Plant?" value={form.has_existing_plant} onChange={set('has_existing_plant')} />
            <SField label="Effluent Capacity (m³/day)" value={form.effluent_capacity} onChange={set('effluent_capacity')} placeholder="20" keyboardType="numeric" />
            <Chips label="Treatment Required" options={TREATMENTS} selected={form.treatment_required} onToggle={toggleTreatment} />

            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>Inlet Parameters</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {INLET_KEYS.map(({ k, l, u }) => (
                <View key={k} style={{ width: '47%' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 4 }}>{l}{u ? ` (${u})` : ''}</Text>
                  <TextInput
                    value={form.inlet[k] ?? ''}
                    onChangeText={v => setInlet(k, v)}
                    placeholder="—"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.card }}
                  />
                </View>
              ))}
            </View>

            <SField label="Discharge Norm" value={form.discharge_norm} onChange={set('discharge_norm')} placeholder="CPCB / ZLD / Reuse..." />
          </View>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <View>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 20 }}>Summary & Submit</Text>

            {/* Preview */}
            <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 12 }}>Enquiry Summary</Text>
              {[
                { l: 'Company', v: form.industry_name },
                { l: 'Contact', v: form.contact_person },
                { l: 'Mobile', v: form.mobile_no },
                { l: 'Sector', v: form.sector },
                { l: 'Location', v: [form.district, form.state, form.country].filter(Boolean).join(', ') },
                { l: 'Capacity', v: form.effluent_capacity ? `${form.effluent_capacity} m³/day` : '' },
                { l: 'Treatment', v: form.treatment_required.join(', ') },
                { l: 'GPS', v: form.latitude ? `${form.latitude}, ${form.longitude}` : '' },
              ].map(({ l, v }) => v ? (
                <View key={l} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, width: 70 }}>{l}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.foreground, flex: 1 }}>{v}</Text>
                </View>
              ) : null)}
            </View>

            <SField label="Budget Range" value={form.budget_range} onChange={set('budget_range')} placeholder="e.g. ₹50L – ₹1Cr" />
            <SField label="Commissioning Target" value={form.commissioning_target} onChange={set('commissioning_target')} placeholder="e.g. Q2 2026" />

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Remarks</Text>
              <TextInput
                value={form.remarks}
                onChangeText={set('remarks')}
                placeholder="Additional notes or requirements…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.card, minHeight: 90, textAlignVertical: 'top' }}
              />
            </View>

            {/* Offline notice */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isOnline ? colors.successLight : colors.warningLight, borderRadius: 10, padding: 12, marginBottom: 20 }}>
              <Ionicons name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'} size={18} color={isOnline ? colors.success : colors.warning} />
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: isOnline ? colors.success : colors.warning, flex: 1 }}>
                {isOnline
                  ? 'Online — this enquiry will sync to the server immediately after saving.'
                  : 'Offline — this enquiry will be saved locally and synced when you are back online.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={{ flexDirection: 'row', gap: 12, padding: 16, paddingBottom: bottomPad + 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}>
        {step > 0 && (
          <TouchableOpacity
            onPress={() => { setStep(s => s - 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
            style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Back</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            onPress={() => {
              if (step === 0 && !form.industry_name.trim()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
              setStep(s => s + 1);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            style={{ flex: 2, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ flex: 2, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Save Enquiry</Text></>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
    </>
  );
}
