import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import "./Pages.css";

// Gemini APIで音声テキストをスーパーの商品名に変換する
const convertWithGemini = async (text) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;

  const prompt = `あなたはスーパーマーケットの買い物リストアシスタントです。
以下の音声認識テキストをスーパーで購入できる正確な商品名に変換してください。

ルール：
- 商品名のみを1行で返してください（説明・補足は一切不要）
- 音声認識の誤変換を修正してください（例：「佐藤」→「砂糖」）
- 食材・調味料・日用品など、スーパーで売っている商品名に忠実に変換してください
- 省略や意訳はせず、発言内容に最も近い商品名にしてください
- 数量が含まれる場合はそのまま残してください
- 例：「こむぎこ」→「小麦粉」、「かたくりこ」→「片栗粉」、「むぎちゃ」→「麦茶」

音声認識テキスト：「${text}」

商品名：`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
    }),
  });

  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return result || text;
};

// ─────────────────────────────────────────
// iPad用：リスト作成画面
// ─────────────────────────────────────────
export function CreateList() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [listening, setListening] = useState(false);
  const [recognizing, setRecognizing] = useState(false); // 認識中状態
  const [converting, setConverting] = useState(false); // ローディング状態
  const listRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const itemsRef = ref(db, "items");
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => a.createdAt - b.createdAt);
        setItems(list);
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [items]);

  // テキスト入力からの追加（デバッグ用：Gemini変換あり）
  const addItemDirect = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setConverting(true);
    try {
      const converted = await convertWithGemini(trimmed);
      push(ref(db, "items"), {
        name: converted.trim(),
        checked: false,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error("Geminiエラー:", e);
      push(ref(db, "items"), {
        name: trimmed,
        checked: false,
        createdAt: Date.now(),
      });
    } finally {
      setConverting(false);
      setItemName("");
    }
  };

  // 音声入力からの追加（Gemini変換あり）
  const addItemWithGemini = async (text) => {
    setConverting(true);
    try {
      const converted = await convertWithGemini(text);
      const trimmed = converted.trim();
      if (trimmed) {
        push(ref(db, "items"), {
          name: trimmed,
          checked: false,
          createdAt: Date.now(),
        });
      }
    } catch (e) {
      // Gemini失敗時はそのまま追加
      push(ref(db, "items"), {
        name: text.trim(),
        checked: false,
        createdAt: Date.now(),
      });
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = (id) => remove(ref(db, `items/${id}`));

  const handleClearAll = () => {
    items.forEach((item) => remove(ref(db, `items/${item.id}`)));
  };

  const handleResetChecks = () => {
    items.forEach((item) =>
      update(ref(db, `items/${item.id}`), { checked: false })
    );
  };

  const toggleListening = () => {
    if (converting || recognizing) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("このブラウザは音声認識に対応していません。Safariをお使いください。");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setListening(false);
      setRecognizing(true);
      addItemWithGemini(text);
    };
    recognition.onend = () => {
      // 何もしない
    };
    recognition.onerror = () => {
      setListening(false);
      setRecognizing(false);
    };
    recognition.start();
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="create-page">
      <header className="create-header">
        <div className="header-title">
          <span className="header-icon">🛒</span>
          <h1>お使いリスト</h1>
        </div>
        <div className="header-stats">{checkedCount}/{items.length} 完了</div>
      </header>

      <main className="create-main">
        <div className="fixed-top">
          <section className="card voice-section">
            {/* ローディング中はスピナーを表示 */}
            {converting ? (
              <div className="converting-indicator">
                <span className="spinner">⏳</span>
                <span>追加中...</span>
              </div>
            ) : recognizing ? (
              <div className="converting-indicator recognizing">
                <span className="spinner">🎙</span>
                <span>認識中...</span>
              </div>
            ) : (
              <button
                className={`voice-btn ${listening ? "listening" : ""}`}
                onClick={toggleListening}
                disabled={converting || recognizing}
              >
                <span className="voice-icon">{listening ? "🔴" : "🎤"}</span>
                <span>{listening ? "話しかけてください…" : "タップして話す"}</span>
              </button>
            )}
            <p className="voice-hint">例：「たまご」「牛乳」「砂糖」</p>
          </section>

          <section className="card">
            <div className="input-row">
              <input
                type="text"
                placeholder="商品名を入力"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItemDirect(itemName)}
              />
              <button className="add-btn" onClick={() => addItemDirect(itemName)}>追加</button>
            </div>
          </section>
        </div>

        <section className="card list-card">
          {items.length === 0 ? (
            <div className="empty-state">
              <p>リストは空です</p>
              <p>音声または手入力で追加しましょう</p>
            </div>
          ) : (
            <ul className="item-list" ref={listRef}>
              {items.map((item) => (
                <li key={item.id} className={`item ${item.checked ? "checked" : ""}`}>
                  <span className="item-status">{item.checked ? "✅" : "⬜️"}</span>
                  <span className="item-name">{item.name}</span>
                  <button className="delete-btn" onClick={() => handleDelete(item.id)}>🗑 削除</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {items.length > 0 && (
          <div className="action-buttons">
            <button className="reset-btn" onClick={handleResetChecks}>チェックをリセット</button>
            <button className="clear-btn" onClick={handleClearAll}>リストを全削除</button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────
// iPhone用：店頭チェック画面
// ─────────────────────────────────────────
export function CheckList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const itemsRef = ref(db, "items");
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => a.createdAt - b.createdAt);
        setItems(list);
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = (id, current) => {
    update(ref(db, `items/${id}`), { checked: !current });
  };

  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const progress = total > 0 ? (checked / total) * 100 : 0;
  const allDone = total > 0 && checked === total;

  return (
    <div className="check-page">
      <header className="check-header">
        <h1>🛍 お使い中</h1>
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{checked}/{total}</span>
        </div>
      </header>

      <main className="check-main">
        {allDone && <div className="all-done-banner">🎉 全部買えました！</div>}

        {items.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: "3rem" }}>📋</p>
            <p>リストがまだありません</p>
            <p>iPadで追加してください</p>
          </div>
        ) : (
          <ul className="check-list">
            {items.map((item) => (
              <li
                key={item.id}
                className={`check-item ${item.checked ? "checked" : ""}`}
                onClick={() => handleToggle(item.id, item.checked)}
              >
                <div className="check-circle">
                  {item.checked && <span className="check-mark">✓</span>}
                </div>
                <div className="check-info">
                  <span className="check-name">{item.name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
