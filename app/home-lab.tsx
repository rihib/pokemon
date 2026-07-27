"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const party = [
  { name: "カイリュー", role: "万能", hue: "mint", mark: "竜" },
  { name: "サーフゴー", role: "攻撃", hue: "gold", mark: "金" },
  { name: "アシレーヌ", role: "受け", hue: "blue", mark: "歌" },
  { name: "ゴリランダー", role: "補助", hue: "green", mark: "森" },
  { name: "ガブリアス", role: "高速", hue: "coral", mark: "牙" },
  { name: "ポリゴン2", role: "耐久", hue: "violet", mark: "P2" },
];

const styles = [
  {
    id: "balance",
    icon: "◇",
    name: "バランス",
    copy: "攻めと守りを両立。迷ったらここから",
  },
  {
    id: "attack",
    icon: "↗",
    name: "速攻",
    copy: "素早く主導権を取り、短期決戦へ",
  },
  {
    id: "control",
    icon: "◎",
    name: "コントロール",
    copy: "交代や状態変化で相手の選択肢を狭める",
  },
];

export default function HomeLab({
  user,
  signInPath,
}: {
  user: { displayName: string; email: string } | null;
  signInPath: string;
}) {
  const [format, setFormat] = useState<"single" | "double">("single");
  const [style, setStyle] = useState("balance");
  const [reasonOpen, setReasonOpen] = useState(false);

  const score = useMemo(() => {
    if (style === "attack") return { attack: 4.7, guard: 2.8, speed: 4.8 };
    if (style === "control") return { attack: 3.2, guard: 4.1, speed: 3.6 };
    return { attack: 4.0, guard: 3.8, speed: 4.2 };
  }, [style]);

  return (
    <main className="landing-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Champions Lab ホーム">
          <span className="brand-mark">CL</span>
          <span>CHAMPIONS LAB</span>
        </Link>
        <nav className="topnav" aria-label="メインナビゲーション">
          <a className="active" href="#start">ホーム</a>
          <a href="#how">使い方</a>
          <a href="/demo">体験版</a>
          <a href="#about">このサービスについて</a>
        </nav>
        {user ? (
          <Link className="account-chip" href="/app">
            <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            {user.displayName}
          </Link>
        ) : (
          <a className="login-link" href={signInPath}>ログイン</a>
        )}
      </header>

      <section className="hero" id="start">
        <div className="hero-copy">
          <p className="eyebrow"><span>BEGINNER&apos;S BATTLE GUIDE</span> はじめての本格対戦</p>
          <h1>勝ち筋を、<br />一緒に組み立てる。</h1>
          <p className="lead">
            複雑な知識はあとからで大丈夫。手持ちを登録するだけで、
            パーティー構築から選出、最初の1体まで理由つきで提案する。
          </p>
          <div className="hero-actions">
            <a className="primary-cta" href={user ? "/app" : signInPath}>
              無料ではじめる <span>→</span>
            </a>
            <Link className="text-cta" href="/demo">登録せずに試す <span>↗</span></Link>
          </div>
          <div className="trust-row" aria-label="サービスの特徴">
            <span>✓ 初心者向け解説</span>
            <span>✓ 提案理由を表示</span>
            <span>✓ シングル・ダブル対応</span>
          </div>
        </div>

        <div className="builder-card" aria-label="パーティー構築のプレビュー">
          <div className="builder-head">
            <div>
              <span className="step-tag">STEP 01</span>
              <h2>どんなバトルをしたい？</h2>
            </div>
            <span className="completion">準備 2 / 3</span>
          </div>

          <div className="choice-row">
            <div className="choice-label">
              <span>1</span>
              <div><strong>対戦形式</strong><small>遊ぶルールを選択</small></div>
            </div>
            <div className="segmented" role="group" aria-label="対戦形式">
              <button
                className={format === "single" ? "selected" : ""}
                onClick={() => setFormat("single")}
                aria-pressed={format === "single"}
              >
                シングル<small>1体ずつ対戦</small>
              </button>
              <button
                className={format === "double" ? "selected" : ""}
                onClick={() => setFormat("double")}
                aria-pressed={format === "double"}
              >
                ダブル<small>2体ずつ対戦</small>
              </button>
            </div>
          </div>

          <div className="choice-section">
            <div className="choice-label">
              <span>2</span>
              <div><strong>好みの戦い方</strong><small>後からいつでも変更可能</small></div>
            </div>
            <div className="style-grid">
              {styles.map((item) => (
                <button
                  key={item.id}
                  className={`style-option ${style === item.id ? "selected" : ""}`}
                  onClick={() => setStyle(item.id)}
                  aria-pressed={style === item.id}
                >
                  <span className="style-icon">{item.icon}</span>
                  <span><strong>{item.name}</strong><small>{item.copy}</small></span>
                  <i>{style === item.id ? "✓" : ""}</i>
                </button>
              ))}
            </div>
          </div>

          <div className="mini-analysis">
            <div className="mini-party">
              <div className="analysis-title"><strong>サンプル構築</strong><span>6 / 6</span></div>
              <div className="party-row">
                {party.map((mon) => (
                  <div className="monster-mini" key={mon.name}>
                    <span className={`creature ${mon.hue}`}>{mon.mark}</span>
                    <small>{mon.name}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="score-box">
              <div><span>攻撃</span><b style={{ "--score": `${score.attack * 20}%` } as React.CSSProperties}></b><em>{score.attack}</em></div>
              <div><span>耐久</span><b style={{ "--score": `${score.guard * 20}%` } as React.CSSProperties}></b><em>{score.guard}</em></div>
              <div><span>素早さ</span><b style={{ "--score": `${score.speed * 20}%` } as React.CSSProperties}></b><em>{score.speed}</em></div>
            </div>
          </div>

          <button className="why-button" onClick={() => setReasonOpen((v) => !v)} aria-expanded={reasonOpen}>
            <span>?</span> なぜこの組み合わせ？
          </button>
          {reasonOpen && (
            <p className="reason-box">
              攻撃役だけに偏らず、苦手な相手を受け止める役と交代を助ける役を組み合わせたため。
              まずは扱いやすさを優先した構築である。
            </p>
          )}
        </div>
      </section>

      <section className="how-section" id="how">
        <div>
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>迷うところだけ、<br />ひとつずつ支援。</h2>
        </div>
        <article><span>01</span><strong>手持ちを登録</strong><p>ステータスが分からなくても、名前と技から始められる。</p></article>
        <article><span>02</span><strong>構築を選ぶ</strong><p>複数案を比較し、好みの戦い方に合う案を選択。</p></article>
        <article><span>03</span><strong>対戦中もナビ</strong><p>相手の6体から選出と先発を、理由つきで提案。</p></article>
      </section>

      <footer id="about">
        <Link className="brand footer-brand" href="/"><span className="brand-mark">CL</span><span>CHAMPIONS LAB</span></Link>
        <p>初心者と本格対戦の間にある、知識の段差をなくす。</p>
        <small>非公式のファンメイド支援サービス。各社の商標・著作物との関係はない。</small>
      </footer>
    </main>
  );
}
