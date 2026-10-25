"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X } from "lucide-react";
import { onCreateWorkflow } from "@/actions/workflow";

export default function WorkflowForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await onCreateWorkflow(name, description);

      if (response.status === 200 && response.workflow) {
        setIsOpen(false);
        // Redirect directly to the visual workflow canvas
        router.push(`/dashboard/workflows/${response.workflow.id}`);
      } else {
        setError(response.error || "Failed to create workflow");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Create Workflow</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          {/* Modal Container */}
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">New Workflow</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Set a name and description to start automating.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discord Leads Automation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Description
                </label>
                <textarea
                  placeholder="What will this workflow automate?"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create & Build</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
