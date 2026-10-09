"use client";

import { useState } from "react";

import { updateNickname, updatePassword } from "@/lib/actions/account";
import { cn } from "@/lib/utils";

type Res = { ok: boolean; error?: string };

export function SettingsForms({ nickname }: { nickname: string }) {
  const [nick, setNick] = useState(nickname);
  const [nickMsg, setNickMsg] = useState<Res | null>(null);
  const [nickBusy, setNickBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<Res | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function onSubmitNick(e: React.FormEvent) {
    e.preventDefault();
    setNickBusy(true);
    const res = await updateNickname(nick);
    setNickBusy(false);
    setNickMsg(res.ok ? { ok: true } : { ok: false, error: res.error });
  }

  async function onSubmitPw(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    const res = await updatePassword(current, next);
    setPwBusy(false);
    setPwMsg(res.ok ? { ok: true } : { ok: false, error: res.error });
    if (res.ok) {
      setCurrent("");
      setNext("");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Nickname */}
      <form onSubmit={onSubmitNick} className="panel flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">Nome de usuário</h2>
          <p className="text-sm text-muted">Como você aparece no ranking.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Nickname</span>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={24}
            required
            className="input"
          />
        </label>
        <button type="submit" disabled={nickBusy} className="btn-primary disabled:opacity-50">
          {nickBusy ? "Salvando…" : "Salvar nome"}
        </button>
        {nickMsg && (
          <p className={cn("text-sm", nickMsg.ok ? "text-gold" : "text-red-400")}>
            {nickMsg.ok ? "Nome atualizado!" : nickMsg.error}
          </p>
        )}
      </form>

      {/* Senha */}
      <form onSubmit={onSubmitPw} className="panel flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">Senha</h2>
          <p className="text-sm text-muted">Use pelo menos 6 caracteres.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Senha atual</span>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Nova senha</span>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
            className="input"
          />
        </label>
        <button type="submit" disabled={pwBusy} className="btn-primary disabled:opacity-50">
          {pwBusy ? "Alterando…" : "Alterar senha"}
        </button>
        {pwMsg && (
          <p className={cn("text-sm", pwMsg.ok ? "text-gold" : "text-red-400")}>
            {pwMsg.ok ? "Senha alterada!" : pwMsg.error}
          </p>
        )}
      </form>
    </div>
  );
}
