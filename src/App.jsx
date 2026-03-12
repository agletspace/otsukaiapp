import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { CreateList, CheckList } from "./pages/Pages";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter basename="/otsukaiapp">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateList />} />
        <Route path="/check" element={<CheckList />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <div className="home-page">
      <div className="home-content">
        <h1>🛒 お使いアプリ</h1>
        <p>どちらの画面を使いますか？</p>
        <div className="home-buttons">
          <Link to="/create" className="home-btn create-btn">
            <span>📝</span>
            <span>リスト作成</span>
            <small>iPad用</small>
          </Link>
          <Link to="/check" className="home-btn check-btn">
            <span>✅</span>
            <span>お店でチェック</span>
            <small>iPhone用</small>
          </Link>
        </div>
      </div>
    </div>
  );
}
