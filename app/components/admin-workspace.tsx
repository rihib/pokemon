"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { masterCategoryPages, type MasterCategoryPage } from "../lib/master-categories";
import type { AppState, MasterEntry } from "../lib/types";

export default function AdminWorkspace({
  page,
}: {
  page: MasterCategoryPage;
}) {
  const [entries, setEntries] = useState<MasterEntry[]>([]);
  const [editor, setEditor] = useState<MasterEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = await response.json() as AppState & { error?: string };
      if (!response.ok) throw new Error(data.error || "読み込みに失敗した");
      if (data.user.role !== "admin") {
        window.location.href = "/app";
        return;
      }
      setEntries(data.master);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "読み込みに失敗した");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/state", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as AppState & { error?: string };
        if (!response.ok) throw new Error(data.error || "読み込みに失敗した");
        return data;
      })
      .then((data) => {
        if (!active) return;
        if (data.user.role !== "admin") {
          window.location.href = "/app";
          return;
        }
        setEntries(data.master);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "読み込みに失敗した");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const mutate = async (action: "save-master" | "delete-master", payload: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "操作に失敗した");
      await refresh();
      setNotice(action === "save-master" ? "マスターデータを保存した" : "マスターデータを削除した");
      window.setTimeout(() => setNotice(""), 1800);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作に失敗した");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const filtered = entries.filter((entry) => entry.category === page.category);

  return (
    <>
      {notice && <div className="notice" role="status">{notice}</div>}
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button type="button" onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="admin-content">
        <nav className="admin-category-nav" aria-label="マスターデータ管理">
          <div>
            <small>MASTER DATA</small>
            <strong>登録情報</strong>
          </div>
          {masterCategoryPages.map((categoryPage) => (
            <Link
              key={categoryPage.category}
              href={`/admin/${categoryPage.slug}`}
              className={categoryPage.category === page.category ? "active" : ""}
              aria-current={categoryPage.category === page.category ? "page" : undefined}
            >
              <span>{categoryPage.name}</span>
              <small>{entries.filter((entry) => entry.category === categoryPage.category).length}件</small>
            </Link>
          ))}
        </nav>

        <div className="page-title">
          <div>
            <p>{page.eyebrow}</p>
            <h1>{page.name}管理</h1>
            <span>{page.description}</span>
          </div>
          <strong>{filtered.length}件</strong>
        </div>

        {loading ? (
          <div className="loading-panel"><span></span><p>マスターデータを準備している…</p></div>
        ) : (
          <div className="master-table">
            <div className="master-head">
              <span>名前</span>
              <span>{page.typeLabel}</span>
              <span>初心者向け説明</span>
              <span>操作</span>
            </div>
            {filtered.map((entry) => (
              <article key={entry.id}>
                <strong>{entry.name}</strong>
                <span>{entry.type || "未設定"}</span>
                <p>{entry.description || "説明なし"}</p>
                <div>
                  <button type="button" onClick={() => setEditor(entry)}>編集</button>
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() => void mutate("delete-master", { id: entry.id })}
                    disabled={saving}
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
            {!filtered.length && (
              <div className="master-empty">
                <span>◇</span>
                <strong>{page.name}が登録されていない</strong>
                <p>「{page.name}を追加」から最初のデータを登録できる。</p>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="floating-add"
        onClick={() => setEditor({ id: 0, category: page.category, name: "", type: "", description: "" })}
      >
        ＋ {page.name}を追加
      </button>

      {editor && (
        <MasterModal
          value={editor}
          page={page}
          saving={saving}
          onClose={() => setEditor(null)}
          onSave={async (value) => {
            const ok = await mutate("save-master", value as unknown as Record<string, unknown>);
            if (ok) setEditor(null);
          }}
        />
      )}
    </>
  );
}

function MasterModal({
  value,
  page,
  saving,
  onClose,
  onSave,
}: {
  value: MasterEntry;
  page: MasterCategoryPage;
  saving: boolean;
  onClose: () => void;
  onSave: (value: MasterEntry) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="master-modal-title">
        <header>
          <div>
            <small>EDITOR</small>
            <h2 id="master-modal-title">
              {draft.id ? `${page.name}を編集` : `${page.name}を追加`}
            </h2>
            <p>初心者にも意味が伝わる短い説明を推奨</p>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる" disabled={saving}>×</button>
        </header>
        <div className="form-grid">
          <label className="wide">
            名前 *
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="wide">
            {page.typeLabel}
            <input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} />
          </label>
          <label className="wide">
            説明
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>キャンセル</button>
          <button
            type="button"
            className="form-primary"
            disabled={saving || !draft.name.trim()}
            onClick={() => onSave(draft)}
          >
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </section>
    </div>
  );
}
