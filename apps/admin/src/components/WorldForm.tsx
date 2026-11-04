import { useState, type FormEvent } from "react";
import { LIMITS, MAP_KEYS, MAPS, type MapKey, type WorldInput } from "@school-class/shared";
import { errorMessage } from "../api";
import { Modal } from "./Modal";

interface WorldFormProps {
  title: string;
  initial?: WorldInput;
  onClose: () => void;
  onSubmit: (data: WorldInput) => Promise<void>;
}

export function WorldForm({ title, initial, onClose, onSubmit }: WorldFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mapKey, setMapKey] = useState<MapKey>(initial?.mapKey ?? MAP_KEYS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Dê um nome ao mundo.");
    setBusy(true);
    try {
      await onSubmit({ name, description, mapKey });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="world-form" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </>
      }
    >
      <form id="world-form" className="form" onSubmit={(e) => void submit(e)}>
        <label htmlFor="w-name">Nome</label>
        <input id="w-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.worldName} placeholder="Ex.: Matemática — 5º ano A" />
        <label htmlFor="w-desc">Descrição <span className="muted">(opcional)</span></label>
        <textarea id="w-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={LIMITS.worldDescription} placeholder="Para você se organizar: turma, tema, período..." />
        <label htmlFor="w-map">Mapa</label>
        <select id="w-map" value={mapKey} onChange={(e) => setMapKey(e.target.value as MapKey)}>
          {MAP_KEYS.map((k) => <option key={k} value={k}>{MAPS[k].name}</option>)}
        </select>
        {MAP_KEYS.length === 1 && <p className="hint">Por enquanto há um mapa. Novos mapas podem ser criados no editor Tiled.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
