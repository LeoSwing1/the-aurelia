"use client";
import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export function ThankYouDialog({ title, message, reference, onClose }: { title: string; message: string; reference?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="success-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="success-dialog" role="dialog" aria-modal="true" aria-labelledby="success-title">
      <button className="success-close" type="button" onClick={onClose} aria-label="Close confirmation"><X size={20}/></button>
      <span className="success-icon"><CheckCircle2 size={30}/></span>
      <p className="eyebrow">THE AURELIA · CONFIRMATION</p>
      <h2 id="success-title">{title}</h2>
      <p>{message}</p>
      {reference && <div className="success-reference"><span>YOUR REFERENCE</span><strong>{reference}</strong></div>}
      <button type="button" className="dark-cta" onClick={onClose}>CONTINUE <span>↗</span></button>
    </section>
  </div>;
}
