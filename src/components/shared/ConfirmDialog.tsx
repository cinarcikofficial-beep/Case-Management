"use client";

import { X, Trash2, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass rounded-2xl p-6 max-w-md w-full mx-4 border border-[#233554]/80 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#162238]/80 text-zinc-500 hover:text-white transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${danger ? "bg-red-500/15" : "bg-amber-500/15"}`}>
            {danger ? (
              <Trash2 className="h-5 w-5 text-red-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
        </div>

        <p className="text-sm text-zinc-400 mb-6 whitespace-pre-wrap">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white text-sm font-medium transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              danger
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
