import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/news/Home.jsx";
import Reader from "./components/news/Reader.jsx";
import Passive from "./components/news/Passive.jsx";
import Columns from "./components/columns/Columns.jsx";
import WritingReader from "./components/columns/WritingReader.jsx";
import Tutorials from "./components/tutorials/Tutorials.jsx";
import TutorialReader from "./components/tutorials/TutorialReader.jsx";
import Arduino from "./components/arduino/Arduino.jsx";
import ArduinoDetail from "./components/arduino/ArduinoDetail.jsx";
import Plans from "./components/plans/Plans.jsx";
import KursKitaplari from "./components/kurs/KursKitaplari.jsx";
import KursKitapDetail from "./components/kurs/KursKitapDetail.jsx";
import Admin from "./components/admin/Admin.jsx";
import TopNav from "./components/common/TopNav.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/haber/:id" element={<Reader />} />
        <Route path="/pasif" element={<Passive />} />
        <Route path="/kose-yazilari" element={<Columns />} />
        <Route
          path="/kose-yazilari/:id"
          element={
            <WritingReader
              resource="kose_yazilari"
              backTo="/kose-yazilari"
              backLabel="← Köşe Yazıları"
              brand={<>Köşe<span className="accent amber"> Yazıları</span></>}
              renderMeta={(p) => <span className="cat amber-cat">{p.author}</span>}
            />
          }
        />
        <Route path="/egitici-yazilar" element={<Tutorials />} />
        <Route path="/egitici-yazilar/:id" element={<TutorialReader />} />
        <Route path="/arduino-projeleri" element={<Arduino />} />
        <Route path="/arduino-projeleri/:id" element={<ArduinoDetail />} />
        <Route path="/planlar" element={<Plans />} />
        <Route path="/kurs-kitaplari" element={<KursKitaplari />} />
        <Route path="/kurs-kitaplari/:id" element={<KursKitapDetail />} />
        <Route path="/panel" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
