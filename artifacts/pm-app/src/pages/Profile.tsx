import { Layout } from "@/components/Layout";
import { Camera, Mail, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function Profile() {
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);

  const initials = user?.full_name
    ?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "??";

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Your account information</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-5">
            {user?.photo && !imgError ? (
              <img
                src={user.photo}
                alt={user.full_name}
                onError={() => setImgError(true)}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-border shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-border">
                {initials}
              </div>
            )}
            <button className="absolute bottom-1 right-1 w-8 h-8 bg-white border border-border rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-foreground">{user?.full_name ?? "—"}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {user?.email ?? "—"}
          </p>

          <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-emerald-50 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">Active</span>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-foreground">Account Details</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Full Name</span>
              <span className="text-sm font-medium text-foreground">{user?.full_name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium text-emerald-600">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">System Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your profile is managed through the central system. Contact your administrator to update your details.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
