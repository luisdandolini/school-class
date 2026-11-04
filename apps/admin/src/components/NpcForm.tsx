import { useState, type FormEvent } from "react";
import { LIMITS, NPC_SPRITES, type AdminNpc, type NpcInput, type NpcSprite } from "@school-class/shared";
import { errorMessage } from "../api";
import { MapPicker } from "./MapPicker";
import { Modal } from "./Modal";
import { SpriteIcon } from "./SpriteIcon";

interface NpcFormProps {
  title: string;
  mapKey: string;
  /** Todos os NPCs do mundo (para mostrar no mapa e evitar posições ocupadas). */
  npcs: AdminNpc[];
  npc?: AdminNpc;
  onClose: () => void;
  onSubmit: (data: NpcInput) => Promise<void>;
}

export function NpcForm({ title, mapKey, npcs, npc, onClose, onSubmit }: NpcFormProps) {
  const [name, setName] = useState(npc?.name ?? "");
  const [greeting, setGreeting] = useState(npc?.greeting ?? "");
  const [sprite, setSprite] = useState<NpcSprite>(npc?.sprite ?? NPC_SPRITES[0].key);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(npc ? { x: npc.x, y: npc.y } : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Dê um nome ao NPC.");
    if (!greeting.trim()) return setError("Escreva a fala de boas-vindas.");
    if (!pos) return setError("Escolha a posição do NPC clicando no mapa.");
    setBusy(true);
    try {
      await onSubmit({ name, greeting, sprite, ...pos });
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
          <button className="btn btn-primary" form="npc-form" disabled={busy}>{busy ? "Salvando..." : "Salvar NPC"}</button>
        </>
      }
    >
      <form id="npc-form" className="npc-form" onSubmit={(e) => void submit(e)}>
        <div className="form">
          <label htmlFor="npc-name">Nome</label>
          <input id="npc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.npcName} placeholder="Ex.: Professora Lua" />

          <label htmlFor="npc-greeting">Fala de boas-vindas</label>
          <textarea id="npc-greeting" rows={3} value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={LIMITS.npcGreeting} placeholder="Ex.: Olá! Sou a guardiã das frações. Vamos treinar?" />

          <span className="label">Aparência</span>
          <div className="sprite-picker" role="radiogroup" aria-label="Aparência">
            {NPC_SPRITES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={sprite === s.key}
                className={`sprite-option${sprite === s.key ? " selected" : ""}`}
                onClick={() => setSprite(s.key)}
              >
                <SpriteIcon sprite={s.key} size={48} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Posição no mapa</span>
          <MapPicker
            mapKey={mapKey}
            npcs={npcs}
            value={pos}
            onPick={(p) => {
              setPos(p);
              setError(null);
            }}
            editingNpcId={npc?.id}
            previewSprite={sprite}
          />
        </div>
        {error && <p className="form-error npc-form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
