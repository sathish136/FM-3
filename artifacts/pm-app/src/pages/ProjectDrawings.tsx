Name}
                    >
                      {drawing.systemName || (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </div>
                    <div
                      className="text-xs text-gray-600 truncate"
                      title={drawing.department}
                    >
                      {drawing.department || "—"}
                    </div>
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        status={drawing.status}
                        label={drawing.revisionLabel}
                      />
                      <div className="flex items-center gap-1">
                        {drawing.checkedBy && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-2.5 h-2.5" /> Checked
                          </span>
                        )}
                        {drawing.approvedBy && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ThumbsUp className="w-2.5 h-2.5" /> Approved
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {drawing.history.length === 0
                        ? "—"
                        : `${drawing.history.length} rev${drawing.history.length !== 1 ? "s" : ""}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(drawing.uploadedAt)}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          const idx = filtered.findIndex(
                            (d) => d.id === drawing.id,
                          );
                          setViewerIdx(idx);
                        }}
                        title="View PDF"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {drawing.status !== "final" && (
                        <button
                          onClick={() =>
                            setModal({ type: "revision", drawing })
                          }
                          title="Upload Revision"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button
                          onClick={() => setModal({ type: "final", drawing })}
                          title="Mark as Final Copy"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setModal({ type: "delete", drawing })}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {drawing.drawingNo}
                        </p>
                        {drawing.title && (
                          <p className="text-sm text-gray-700 mt-0.5">
                            {drawing.title}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge
                            status={drawing.status}
                            label={drawing.revisionLabel}
                          />
                          {drawing.department && (
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {drawing.department}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(drawing.uploadedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          const idx = filtered.findIndex(
                            (d) => d.id === drawing.id,
                          );
                          setViewerIdx(idx);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {drawing.status !== "final" && (
                        <button
                          onClick={() =>
                            setModal({ type: "revision", drawing })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Revise
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button
                          onClick={() => setModal({ type: "final", drawing })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Final
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      {viewerIdx !== null && filtered[viewerIdx] && (
        <PdfViewer
          drawing={filtered[viewerIdx]}
          onClose={() => setViewerIdx(null)}
          onPrev={() => setViewerIdx((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() =>
            setViewerIdx((i) => Math.min(filtered.length - 1, (i ?? 0) + 1))
          }
          hasPrev={viewerIdx > 0}
          hasNext={viewerIdx < filtered.length - 1}
          total={filtered.length}
          currentIdx={viewerIdx}
          onCheck={() => handleCheck(filtered[viewerIdx])}
          onApprove={() => handleApprove(filtered[viewerIdx])}
          currentUserName={user?.full_name || ""}
        />
      )}

      {/* Modals */}
      {modal.type === "upload" && (
        <UploadModal
          userDept={userProfile.department || "Mechanical"}
          userName={user?.full_name || ""}
          onClose={() => setModal({ type: "none" })}
          onSubmit={handleUpload}
        />
      )}
      {modal.type === "revision" && (
        <RevisionModal
          drawing={modal.drawing}
          onClose={() => setModal({ type: "none" })}
          onSubmit={(data) => handleRevision(modal.drawing, data)}
        />
      )}
      {modal.type === "final" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Mark as Final Copy?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-1">
              <strong>{modal.drawing.drawingNo}</strong>
              {modal.drawing.title ? ` — ${modal.drawing.title}` : ""}
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              This will apply a <strong>FINAL COPY</strong> watermark when the
              PDF is viewed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: "none" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFinal(modal.drawing)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Final
              </button>
            </div>
          </div>
        </div>
      )}
      {modal.type === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Drawing?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{modal.drawing.drawingNo}</strong> and all its revision
              history will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: "none" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteFileData(modal.drawing.id);
                  persist(drawings.filter((d) => d.id !== modal.drawing.id));
                  setModal({ type: "none" });
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
