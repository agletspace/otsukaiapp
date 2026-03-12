import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import "./Pages.css";

// 食品優先の変換辞書
const FOOD_DICT = {
  "さとう": "砂糖", "しお": "塩", "しょうゆ": "醤油", "みそ": "味噌",
  "こしょう": "胡椒", "さけ": "酒", "みりん": "みりん", "す": "酢",
  "こめ": "米", "こむぎこ": "小麦粉", "かたくりこ": "片栗粉",
  "ぎゅうにゅう": "牛乳", "たまご": "卵", "バター": "バター",
  "チーズ": "チーズ", "ヨーグルト": "ヨーグルト", "なっとう": "納豆",
  "とうふ": "豆腐", "あぶらあげ": "油揚げ", "こんにゃく": "こんにゃく",
  "にく": "肉", "ぶたにく": "豚肉", "とりにく": "鶏肉", "ぎゅうにく": "牛肉",
  "さかな": "魚", "まぐろ": "マグロ", "さけ": "鮭", "さんま": "さんま",
  "えび": "エビ", "いか": "イカ", "たこ": "タコ",
  "キャベツ": "キャベツ", "たまねぎ": "玉ねぎ", "にんじん": "にんじん",
  "じゃがいも": "じゃがいも", "トマト": "トマト", "きゅうり": "きゅうり",
  "ほうれんそう": "ほうれん草", "こまつな": "小松菜", "ねぎ": "ねぎ",
  "にんにく": "にんにく", "しょうが": "しょうが", "だいこん": "大根",
  "ごぼう": "ごぼう", "れんこん": "れんこん", "さつまいも": "さつまいも",
  "りんご": "りんご", "バナナ": "バナナ", "みかん": "みかん",
  "ぶどう": "ぶどう", "いちご": "いちご", "もも": "もも",
  "パン": "パン", "しょくパン": "食パン", "うどん": "うどん",
  "そば": "そば", "パスタ": "パスタ", "ラーメン": "ラーメン",
  "ごはん": "ご飯", "おにぎり": "おにぎり",
  "コーヒー": "コーヒー", "おちゃ": "お茶", "ジュース": "ジュース",
  "みず": "水", "ビール": "ビール",
  "ティッシュ": "ティッシュ", "トイレットペーパー": "トイレットペーパー",
  "シャンプー": "シャンプー", "せっけん": "石けん",
};

const convertToFood = (text) => {
  const lower = text.trim();
  // 辞書に完全一致するものがあれば変換
  if (FOOD_DICT[lower]) return FOOD_DICT[lower];
  // ひらがな読みで一致するものを探す
  for (const [key, value] of Object.entries(FOOD_DICT)) {
    if (lower === key) return value;
  }
  return text.trim();
};

// ─────────────────────────────────────────
// iPad用：リスト作成画面
// ─────────────────────────────────────────
export function CreateList() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
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

  // アイテム追加時にリストの末尾にスクロール
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [items]);

  const addItem = (name) => {
    const converted = convertToFood(name);
    if (!converted) return;
    push(ref(db, "items"), {
      name: converted,
      checked: false,
      createdAt: Date.now(),
    });
    setItemName("");
    setTranscript("");
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
        addItem(text);
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
        {/* 上部固定エリア：音声・テキスト入力 */}
        <div className="fixed-top">
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
            <p className="voice-hint">例：「たまご」「牛乳」「砂糖」</p>
          </section>

          <section className="card">
            <div className="input-row">
              <input
                type="text"
                placeholder="商品名を入力"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem(itemName)}
              />
              <button className="add-btn" onClick={() => addItem(itemName)}>追加</button>
            </div>
          </section>
        </div>

        {/* スクロール可能なリストエリア */}
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
