import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import "./Pages.css";

// ─────────────────────────────────────────
// iPad用：リスト作成画面
// ─────────────────────────────────────────
export function CreateList() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const itemsRef = ref(db, "items");
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setItems(list);
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const addItem = (name, qty) => {
    const trimmedName = name.trim();
    const trimmedQty = qty.trim() || "1つ";
    if (!trimmedName) return;
    push(ref(db, "items"), {
      name: trimmedName,
      qty: trimmedQty,
      checked: false,
      createdAt: Date.now(),
    });
    setItemName("");
    setItemQty("");
    setTranscript("");
  };

  const handleDelete = (id) => remove(ref(db, `items/${id}`));

  const handleClearAll = () => {
    if (window.confirm("リストをすべて削除しますか？")) {
      items.forEach((item) => remove(ref(db, `items/${item.id}`)));
    }
  };

  const handleResetChecks = () => {
    items.forEach((item) =>
      update(ref(db, `items/${item.id}`), { checked: false })
    );
  };

  const parseVoiceInput = (text) => {
    const parts = text.trim().split(/[\s　]+/);
    if (parts.length >= 2) {
      return { name: parts.slice(0, -1).join(""), qty: parts[parts.length - 1] };
    }
    return { name: text.trim(), qty: "1つ" };
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("このブラウザは音声認識に対応していません。Safariをお使いください。");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        const { name, qty } = parseVoiceInput(text);
        addItem(name, qty);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
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
        <section className="card voice-section">
          <button
            className={`voice-btn ${listening ? "listening" : ""}`}
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
          >
            <span className="voice-icon">{listening ? "🔴" : "🎤"}</span>
            <span>{listening ? "話しかけてください…" : "押して話す"}</span>
          </button>
          {transcript && <div className="transcript">「{transcript}」</div>}
          <p className="voice-hint">例：「たまご　1パック」「牛乳　2本」</p>
        </section>

        <section className="card">
          <div className="input-row">
            <input
              type="text"
              placeholder="商品名"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem(itemName, itemQty)}
            />
            <input
              type="text"
              placeholder="個数（例：2本）"
              value={itemQty}
              onChange={(e) => setItemQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem(itemName, itemQty)}
              className="qty-input"
            />
            <button className="add-btn" onClick={() => addItem(itemName, itemQty)}>追加</button>
          </div>
        </section>

        <section className="card">
          {items.length === 0 ? (
            <div className="empty-state">
              <p>リストは空です</p>
              <p>音声または手入力で追加しましょう</p>
            </div>
          ) : (
            <ul className="item-list">
              {items.map((item) => (
                <li key={item.id} className={`item ${item.checked ? "checked" : ""}`}>
                  <span className="item-status">{item.checked ? "✅" : "⬜️"}</span>
                  <span className="item-name">{item.name}</span>
                  <span className="item-qty">{item.qty}</span>
                  <button className="delete-btn" onClick={() => handleDelete(item.id)}>✕</button>
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
                  <span className="check-qty">{item.qty}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
