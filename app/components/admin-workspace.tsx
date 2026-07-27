"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { masterCategoryPages, type MasterCategoryPage } from "../lib/master-categories";
import type {
  AppState,
  MasterEntry,
  MasterRelation,
  MasterRelationKind,
  Stats,
} from "../lib/types";

type RelationInput = Pick<MasterRelation, "kind" | "targetId"> & {
  data?: Record<string, unknown>;
};

const statLabels: Record<keyof Stats, string> = {
  hp: "HP",
  attack: "攻撃",
  defense: "防御",
  spAttack: "特攻",
  spDefense: "特防",
  speed: "素早さ",
};

const emptyStats: Stats = {
  hp: 80,
  attack: 80,
  defense: 80,
  spAttack: 80,
  spDefense: 80,
  speed: 80,
};

export default function AdminWorkspace({ page }: { page: MasterCategoryPage }) {
  const [entries, setEntries] = useState<MasterEntry[]>([]);
  const [relations, setRelations] = useState<MasterRelation[]>([]);
  const [editor, setEditor] = useState<MasterEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyState = useCallback((data: AppState) => {
    if (data.user.role !== "admin") {
      window.location.href = "/app";
      return;
    }
    setEntries(data.master);
    setRelations(data.masterRelations);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = await response.json() as AppState & { error?: string };
      if (!response.ok) throw new Error(data.error || "読み込みに失敗した");
      applyState(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "読み込みに失敗した");
    } finally {
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    let active = true;
    fetch("/api/state", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as AppState & { error?: string };
        if (!response.ok) throw new Error(data.error || "読み込みに失敗した");
        return data;
      })
      .then((data) => {
        if (active) applyState(data);
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
  }, [applyState]);

  const mutate = async (
    action: "save-master" | "delete-master",
    payload: Record<string, unknown>,
  ) => {
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
              <span>設定内容</span>
              <span>操作</span>
            </div>
            {filtered.map((entry) => (
              <article key={entry.id}>
                <strong>{entry.name}</strong>
                <span>{entrySummary(entry)}</span>
                <p>
                  {entry.description || "説明なし"}
                  {relationSummary(entry, relations)}
                </p>
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
        onClick={() => setEditor({
          id: 0,
          category: page.category,
          name: "",
          type: "",
          description: "",
          data: defaultDataFor(page.category),
        })}
      >
        ＋ {page.name}を追加
      </button>

      {editor && (
        <MasterModal
          value={editor}
          page={page}
          entries={entries}
          relations={relations.filter((relation) => relation.sourceId === editor.id)}
          saving={saving}
          onClose={() => setEditor(null)}
          onSave={async (value, nextRelations) => {
            const ok = await mutate("save-master", {
              ...value,
              relations: nextRelations,
            } as unknown as Record<string, unknown>);
            if (ok) setEditor(null);
          }}
        />
      )}
    </>
  );
}

function entrySummary(entry: MasterEntry) {
  const data = entry.data ?? {};
  if (entry.category === "move") {
    return [entry.type, String(data.damageClass ?? "")].filter(Boolean).join("・") || "未設定";
  }
  if (entry.category === "nature") {
    return `↑${String(data.increasedStat ?? "なし")} / ↓${String(data.decreasedStat ?? "なし")}`;
  }
  if (entry.category === "regulation") {
    return `${String(data.startsAt ?? "開始未設定")}〜${String(data.endsAt ?? "終了未設定")}`;
  }
  if (entry.category === "form") {
    return `${entry.type || "タイプ未設定"}${data.mega ? "・Mega" : ""}`;
  }
  return entry.type || "未設定";
}

function relationSummary(entry: MasterEntry, relations: MasterRelation[]) {
  const sourceRelations = relations.filter((relation) => relation.sourceId === entry.id);
  if (entry.category === "pokemon") {
    const abilities = sourceRelations.filter((relation) => relation.kind === "has_ability").length;
    const moves = sourceRelations.filter((relation) => relation.kind === "learns_move").length;
    return <small className="master-relation-summary">特性 {abilities}件・技 {moves}件を関連付け</small>;
  }
  if (entry.category === "regulation") {
    return <small className="master-relation-summary">使用可能データ {sourceRelations.length}件</small>;
  }
  if (entry.category === "type") {
    return <small className="master-relation-summary">標準以外の相性 {sourceRelations.length}件</small>;
  }
  return null;
}

function defaultDataFor(category: MasterEntry["category"]): Record<string, unknown> {
  if (category === "pokemon" || category === "form") return { stats: emptyStats, mega: false };
  if (category === "move") return { damageClass: "物理", power: 0, accuracy: 100, priority: 0, target: "相手1体" };
  if (category === "nature") return { increasedStat: "", decreasedStat: "" };
  if (category === "regulation") return { startsAt: "", endsAt: "", singlePickCount: 3, doublePickCount: 4, active: false };
  return {};
}

function MasterModal({
  value,
  page,
  entries,
  relations,
  saving,
  onClose,
  onSave,
}: {
  value: MasterEntry;
  page: MasterCategoryPage;
  entries: MasterEntry[];
  relations: MasterRelation[];
  saving: boolean;
  onClose: () => void;
  onSave: (value: MasterEntry, relations: RelationInput[]) => void;
}) {
  const [draft, setDraft] = useState<MasterEntry>({
    ...value,
    data: { ...defaultDataFor(value.category), ...(value.data ?? {}) },
  });
  const [draftRelations, setDraftRelations] = useState<RelationInput[]>(
    relations.map(({ kind, targetId, data }) => ({ kind, targetId, data })),
  );

  const updateData = (key: string, nextValue: unknown) => {
    setDraft((current) => ({
      ...current,
      data: { ...(current.data ?? {}), [key]: nextValue },
    }));
  };
  const toggleRelation = (kind: MasterRelationKind, targetId: number) => {
    setDraftRelations((current) => current.some((relation) => relation.kind === kind && relation.targetId === targetId)
      ? current.filter((relation) => !(relation.kind === kind && relation.targetId === targetId))
      : [...current, { kind, targetId }]);
  };
  const setSingleRelation = (kind: MasterRelationKind, targetId: number) => {
    setDraftRelations((current) => [
      ...current.filter((relation) => relation.kind !== kind),
      ...(targetId ? [{ kind, targetId }] : []),
    ]);
  };
  const setEffectiveness = (targetId: number, multiplier: number) => {
    setDraftRelations((current) => [
      ...current.filter((relation) => !(relation.kind === "type_effectiveness" && relation.targetId === targetId)),
      ...(multiplier === 1 ? [] : [{ kind: "type_effectiveness" as const, targetId, data: { multiplier } }]),
    ]);
  };

  const options = (category: MasterEntry["category"]) =>
    entries.filter((entry) => entry.category === category && entry.id !== draft.id);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="modal master-modal" role="dialog" aria-modal="true" aria-labelledby="master-modal-title">
        <header>
          <div>
            <small>EDITOR</small>
            <h2 id="master-modal-title">{draft.id ? `${page.name}を編集` : `${page.name}を追加`}</h2>
            <p>提案ロジックが利用できる構造化データとして保存する。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる" disabled={saving}>×</button>
        </header>

        <div className="form-grid">
          <label className="wide">
            名前 *
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>

          {(draft.category === "pokemon" || draft.category === "form") && (
            <TypePairFields entry={draft} types={options("type")} onChange={setDraft} />
          )}

          {draft.category === "move" && (
            <>
              <label>
                タイプ
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                  <option value="">選択する</option>
                  {options("type").map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
                </select>
              </label>
              <label>
                分類
                <select value={String(draft.data?.damageClass ?? "")} onChange={(event) => updateData("damageClass", event.target.value)}>
                  <option value="物理">物理</option>
                  <option value="特殊">特殊</option>
                  <option value="変化">変化</option>
                </select>
              </label>
              <NumberField label="威力" value={Number(draft.data?.power ?? 0)} min={0} max={300} onChange={(value) => updateData("power", value)} />
              <NumberField label="命中率" value={Number(draft.data?.accuracy ?? 100)} min={0} max={100} onChange={(value) => updateData("accuracy", value)} />
              <NumberField label="優先度" value={Number(draft.data?.priority ?? 0)} min={-7} max={5} onChange={(value) => updateData("priority", value)} />
              <label>
                対象
                <select value={String(draft.data?.target ?? "相手1体")} onChange={(event) => updateData("target", event.target.value)}>
                  <option>相手1体</option>
                  <option>相手全体</option>
                  <option>自分</option>
                  <option>味方1体</option>
                  <option>味方全体</option>
                  <option>全体</option>
                </select>
              </label>
            </>
          )}

          {draft.category === "nature" && (
            <>
              <StatSelect label="上昇する能力" value={String(draft.data?.increasedStat ?? "")} onChange={(value) => updateData("increasedStat", value)} />
              <StatSelect label="下降する能力" value={String(draft.data?.decreasedStat ?? "")} onChange={(value) => updateData("decreasedStat", value)} />
            </>
          )}

          {(draft.category === "pokemon" || draft.category === "form") && (
            <StatsFields
              value={(draft.data?.stats as Stats | undefined) ?? emptyStats}
              onChange={(stats) => updateData("stats", stats)}
            />
          )}

          {draft.category === "form" && (
            <>
              <label>
                元のポケモン *
                <select
                  value={draftRelations.find((relation) => relation.kind === "form_of")?.targetId ?? 0}
                  onChange={(event) => setSingleRelation("form_of", Number(event.target.value))}
                >
                  <option value={0}>選択する</option>
                  {options("pokemon").map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={Boolean(draft.data?.mega)}
                  onChange={(event) => updateData("mega", event.target.checked)}
                />
                <span><strong>Mega Evolution</strong><small>Mega進化後のフォルムとして扱う</small></span>
              </label>
            </>
          )}

          {draft.category === "regulation" && (
            <>
              <label>開始日<input type="date" value={String(draft.data?.startsAt ?? "")} onChange={(event) => updateData("startsAt", event.target.value)} /></label>
              <label>終了日<input type="date" value={String(draft.data?.endsAt ?? "")} onChange={(event) => updateData("endsAt", event.target.value)} /></label>
              <NumberField label="シングル選出数" value={Number(draft.data?.singlePickCount ?? 3)} min={1} max={6} onChange={(value) => updateData("singlePickCount", value)} />
              <NumberField label="ダブル選出数" value={Number(draft.data?.doublePickCount ?? 4)} min={1} max={6} onChange={(value) => updateData("doublePickCount", value)} />
              <label className="toggle-field wide">
                <input type="checkbox" checked={Boolean(draft.data?.active)} onChange={(event) => updateData("active", event.target.checked)} />
                <span><strong>現在のRegulation</strong><small>パーティー構築と選出提案に適用する</small></span>
              </label>
            </>
          )}

          {(draft.category === "item" || draft.category === "ability") && (
            <label className="wide">
              分類
              <input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} />
            </label>
          )}

          <label className="wide">
            初心者向け説明
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>

          {draft.category === "pokemon" && (
            <>
              <RelationChecklist
                title="使用できる特性"
                options={options("ability")}
                selected={draftRelations.filter((relation) => relation.kind === "has_ability").map((relation) => relation.targetId)}
                onToggle={(id) => toggleRelation("has_ability", id)}
              />
              <RelationChecklist
                title="使用できる技"
                options={options("move")}
                selected={draftRelations.filter((relation) => relation.kind === "learns_move").map((relation) => relation.targetId)}
                onToggle={(id) => toggleRelation("learns_move", id)}
                searchable
              />
            </>
          )}

          {draft.category === "type" && (
            <fieldset className="wide relation-fieldset">
              <legend>防御側タイプへの倍率</legend>
              <div className="effectiveness-grid">
                {entries.filter((entry) => entry.category === "type").map((entry) => {
                  const relation = draftRelations.find((candidate) =>
                    candidate.kind === "type_effectiveness" && candidate.targetId === entry.id
                  );
                  return (
                    <label key={entry.id}>
                      {entry.name}
                      <select
                        value={Number(relation?.data?.multiplier ?? 1)}
                        onChange={(event) => setEffectiveness(entry.id, Number(event.target.value))}
                      >
                        <option value={0}>×0</option>
                        <option value={0.5}>×0.5</option>
                        <option value={1}>×1</option>
                        <option value={2}>×2</option>
                      </select>
                    </label>
                  );
                })}
              </div>
              {!draft.id && <small>自身への倍率は、最初に保存した後で設定できる。</small>}
            </fieldset>
          )}

          {draft.category === "regulation" && (
            <>
              <RelationChecklist title="使用可能なポケモン" options={options("pokemon")} selected={draftRelations.filter((relation) => relation.kind === "allows_pokemon").map((relation) => relation.targetId)} onToggle={(id) => toggleRelation("allows_pokemon", id)} searchable />
              <RelationChecklist title="使用可能な持ち物" options={options("item")} selected={draftRelations.filter((relation) => relation.kind === "allows_item").map((relation) => relation.targetId)} onToggle={(id) => toggleRelation("allows_item", id)} searchable />
              <RelationChecklist title="使用可能なフォルム・Mega" options={options("form")} selected={draftRelations.filter((relation) => relation.kind === "allows_form").map((relation) => relation.targetId)} onToggle={(id) => toggleRelation("allows_form", id)} />
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>キャンセル</button>
          <button
            type="button"
            className="form-primary"
            disabled={saving || !draft.name.trim() || (draft.category === "form" && !draftRelations.some((relation) => relation.kind === "form_of"))}
            onClick={() => onSave(draft, draftRelations)}
          >
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TypePairFields({
  entry,
  types,
  onChange,
}: {
  entry: MasterEntry;
  types: MasterEntry[];
  onChange: (entry: MasterEntry) => void;
}) {
  const [primary = "", secondary = ""] = entry.type.split(/[・/]/);
  const update = (first: string, second: string) => {
    onChange({ ...entry, type: [first, second].filter(Boolean).join("・") });
  };
  return (
    <>
      <label>
        タイプ1
        <select value={primary} onChange={(event) => update(event.target.value, secondary)}>
          <option value="">選択する</option>
          {types.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
        </select>
      </label>
      <label>
        タイプ2
        <select value={secondary} onChange={(event) => update(primary, event.target.value)}>
          <option value="">なし</option>
          {types.filter((type) => type.name !== primary).map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
        </select>
      </label>
    </>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return <label>{label}<input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function StatSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">なし</option>
        {(Object.keys(statLabels) as (keyof Stats)[]).filter((key) => key !== "hp").map((key) => (
          <option key={key} value={key}>{statLabels[key]}</option>
        ))}
      </select>
    </label>
  );
}

function StatsFields({ value, onChange }: { value: Stats; onChange: (stats: Stats) => void }) {
  return (
    <fieldset className="wide">
      <legend>基礎ステータス</legend>
      <div className="stat-input-grid">
        {(Object.keys(statLabels) as (keyof Stats)[]).map((key) => (
          <label key={key}>
            {statLabels[key]}
            <input type="number" min={1} max={255} value={value[key]} onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RelationChecklist({
  title,
  options,
  selected,
  onToggle,
  searchable = false,
}: {
  title: string;
  options: MasterEntry[];
  selected: number[];
  onToggle: (id: number) => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) => option.name.includes(query));
  return (
    <fieldset className="wide relation-fieldset">
      <legend>{title}（{selected.length}件）</legend>
      {searchable && <input className="relation-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前で絞り込む" />}
      <div className="relation-checklist">
        {filtered.map((option) => (
          <label key={option.id}>
            <input type="checkbox" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
            <span>{option.name}</span>
          </label>
        ))}
        {!filtered.length && <small>選択できるデータがない。</small>}
      </div>
    </fieldset>
  );
}
