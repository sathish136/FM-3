export function ReminderCard() {
  const event = {
    title: "Q2 Strategy Review",
    type: "Meeting",
    typeColor: "#3b82f6",
    date: "Tuesday, 1 April 2026",
    time: "10:00 AM",
    countdown: "15 min",
    location: "Conference Room B",
    description: "Quarterly review of marketing targets and pipeline projections with the leadership team.",
    attendees: ["Rahul M.", "Priya S.", "Ahmed K.", "Lisa T."],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Email card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

          {/* Header banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
              🔔
            </div>
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase tracking-widest">Calendar Alert</p>
              <h1 className="text-white text-lg font-bold leading-tight mt-0.5">Upcoming Event Reminder</h1>
            </div>
          </div>

          {/* Countdown pill */}
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center gap-2">
            <span className="text-amber-500 text-base">⏳</span>
            <span className="text-amber-800 text-sm font-semibold">Starts in <span className="text-amber-600">{event.countdown}</span></span>
            <div className="ml-auto h-2 w-28 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full w-1/5 bg-amber-400 rounded-full" />
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">

            {/* Event title + type */}
            <div>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2"
                style={{ backgroundColor: event.typeColor + "18", color: event.typeColor }}
              >
                📋 {event.type}
              </span>
              <h2 className="text-slate-900 text-xl font-bold leading-snug">{event.title}</h2>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Details grid */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm shrink-0">📅</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Date</p>
                  <p className="text-slate-800 text-sm font-semibold">{event.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm shrink-0">🕐</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Time</p>
                  <p className="text-slate-800 text-sm font-semibold">{event.time}</p>
                </div>
              </div>
              {event.location && (
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm shrink-0">📍</span>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Location</p>
                    <p className="text-slate-800 text-sm font-semibold">{event.location}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">Details</p>
                <p className="text-slate-700 text-sm leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Attendees */}
            {event.attendees.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-2">👥 Attendees</p>
                <div className="flex flex-wrap gap-1.5">
                  {event.attendees.map((a) => (
                    <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">FM</span>
              </div>
              <span className="text-slate-500 text-xs font-medium">FlowMatriX Calendar</span>
            </div>
            <span className="text-slate-400 text-[10px]">Automated reminder</span>
          </div>
        </div>

        {/* Shadow label */}
        <p className="text-center text-slate-400 text-xs mt-4">HTML Reminder Preview · FlowMatriX</p>
      </div>
    </div>
  );
}
