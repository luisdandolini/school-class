import { useState, type FormEvent } from "react";
import { LIMITS, MAP_KEYS, MAPS, type MapKey, type WorldInput } from "@school-class/shared";
import { errorMessage } from "../api";
import { MapPicker } from "./MapPicker";
import { Modal } from "./Modal";

interface WorldFormProps {
  title: string;
  initial?: WorldInput;
  /** NPCs que o mundo já tem (para avisar ao trocar de mapa). */
  npcCount?: number;
  onClose: () => void;
  onSubmit: (data: WorldInput) => Promise<void>;
}

export function WorldForm({ title, initial, npcCount = 0, onClose, onSubmit }: WorldFormProps) {
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
      wide
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
        <fieldset className="map-choice">
          <legend>Cenário</legend>
          <div className="map-options">
            {MAP_KEYS.map((k) => (
              <label key={k} className={`map-option${k === mapKey ? " selected" : ""}`}>
                <input type="radio" name="w-map" value={k} checked={k === mapKey} onChange={() => setMapKey(k)} />
                <MapPicker mapKey={k} npcs={[]} compact />
                <strong>{MAPS[k].name}</strong>
                <span className="muted small">{MAPS[k].description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {initial && mapKey !== initial.mapKey && npcCount > 0 && (
          <p className="hint warn" role="status">
            {npcCount === 1
              ? "⚠️ O NPC continua na mesma posição. Depois de salvar, confira no mapa se ele não ficou em cima de um obstáculo (aparece com contorno vermelho)."
              : `⚠️ Os ${npcCount} NPCs continuam nas mesmas posições. Depois de salvar, confira no mapa se algum ficou em cima de um obstáculo (aparece com contorno vermelho).`}
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
