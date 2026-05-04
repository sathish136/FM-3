import { useState, useEffect } from 'react';
import { View, Image, Text, ActivityIndicator } from 'react-native';
import { apiGet } from '@/lib/api';

interface Props {
  size: number;
  initials: string;
  textSize?: number;
  borderColor?: string;
  borderWidth?: number;
  role?: string;
}

export function ProfileImage({ size, initials, textSize, borderColor, borderWidth, role }: Props) {
  const [base64, setBase64]     = useState<string | null>(null);
  const [ctype, setCtype]       = useState('image/jpeg');
  const [loading, setLoading]   = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (role !== 'hrms_employee') { setLoading(false); return; }
    apiGet<{ base64: string; content_type: string }>('/api/mobile/hrms/profile-image-b64')
      .then(r => { setBase64(r.base64); setCtype(r.content_type ?? 'image/jpeg'); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [role]);

  const br = size / 2;
  const ts = textSize ?? Math.round(size * 0.36);

  const avatar = (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: borderWidth ?? 2, borderColor: borderColor ?? 'rgba(255,255,255,0.35)' }}>
      {loading
        ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
        : <Text style={{ fontSize: ts, fontFamily: 'Inter_700Bold', color: '#fff' }}>{initials}</Text>
      }
    </View>
  );

  if (!base64 || imgError) return avatar;

  return (
    <Image
      source={{ uri: `data:${ctype};base64,${base64}` }}
      style={{ width: size, height: size, borderRadius: br, borderWidth: borderWidth ?? 2, borderColor: borderColor ?? 'rgba(255,255,255,0.35)' }}
      onError={() => setImgError(true)}
    />
  );
}
